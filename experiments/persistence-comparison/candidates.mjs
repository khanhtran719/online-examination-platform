import "reflect-metadata";
import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import { fields, toAccount } from "./modules/identity/account-model.mjs";
import { PostgresDatabase, DatabaseError, TransactionRollbackOnlyError } from "./runtime.mjs";

function safeCode(error) {
  const code = error?.code ?? error?.driverError?.code ?? error?.original?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "DB_UNAVAILABLE";
}

// PoC only: shared harness controls are not a new production persistence abstraction.
class CandidateDatabase {
  context = new AsyncLocalStorage();
  operation = new AsyncLocalStorage();
  admitted = 0;
  closing = false;
  constructor(config, observe) {
    this.config = config;
    this.observe = observe;
  }
  stats() {
    return this.transport?.stats() ?? { total: 0, idle: 0, waiting: 0 };
  }
  emit(kind, durationMs, operation, code) {
    try {
      this.observe({ kind, durationMs, operation, code, ...this.stats() });
    } catch {
      /* telemetry cannot affect commit */
    }
  }
  instrument(connection) {
    if (connection.ormInstrumented) return;
    connection.ormInstrumented = true;
    const original = connection.query.bind(connection);
    connection.query = (...args) => {
      const at = performance.now(),
        operation = this.operation.getStore() ?? "diagnostic";
      const done = (error) => {
        this.emit("query", performance.now() - at, operation, error ? safeCode(error) : undefined);
        if (operation === "lock.acquire") this.emit("lock", performance.now() - at, operation);
      };
      const callback = args.at(-1);
      if (typeof callback === "function") {
        args[args.length - 1] = (error, result) => {
          done(error);
          callback(error, result);
        };
        return original(...args);
      }
      return original(...args).then(
        (result) => {
          done();
          return result;
        },
        (error) => {
          done(error);
          throw error;
        },
      );
    };
  }
  async acquire() {
    if (this.closing || this.admitted >= this.config.max + this.config.maxWaiting)
      throw new DatabaseError("DB_BUSY");
    this.admitted++;
    try {
      return await this.transport.acquire();
    } catch {
      this.admitted--;
      throw new DatabaseError("DB_ACQUIRE_TIMEOUT");
    }
  }
  async release(lease) {
    try {
      await lease.release();
    } finally {
      this.admitted--;
    }
  }
  async perform(operation, work, requireTransaction = false) {
    const scope = this.context.getStore();
    if (requireTransaction && !scope) throw new DatabaseError("DB_TRANSACTION_REQUIRED");
    if (scope && (!scope.active || !scope.accepting)) throw new DatabaseError("DB_CONTEXT_ENDED");
    const invoke = async (lease) => {
      try {
        return await this.operation.run(operation, () => work(lease));
      } catch (error) {
        if (scope) scope.rollbackOnly = true;
        throw error instanceof DatabaseError ? error : new DatabaseError(safeCode(error));
      }
    };
    if (scope) {
      const pending = invoke(scope.lease);
      scope.pending.add(pending);
      try {
        return await pending;
      } finally {
        scope.pending.delete(pending);
      }
    }
    const lease = await this.acquire();
    try {
      return await invoke(lease);
    } finally {
      await this.release(lease);
    }
  }
  query(operation, sql, parameters = []) {
    return this.perform(
      operation,
      (lease) => lease.query(sql, parameters),
      operation === "lock.acquire",
    );
  }
  accountByEmail(email) {
    return this.perform("identity.read", async (lease) =>
      toAccount(await lease.account({ email }, false)),
    );
  }
  lockAccount(id) {
    return this.perform(
      "lock.acquire",
      async (lease) => toAccount(await lease.account({ id }, true)),
      true,
    );
  }
  updateProfile(id, displayName, optIn) {
    return this.perform(
      "identity.write",
      (lease) => lease.updateProfile(id, displayName, optIn),
      true,
    );
  }
  async transaction(work) {
    const existing = this.context.getStore();
    if (existing) {
      if (!existing.active || !existing.accepting) throw new DatabaseError("DB_CONTEXT_ENDED");
      const pending = Promise.resolve().then(work);
      existing.pending.add(pending);
      try {
        return await pending;
      } catch (error) {
        existing.rollbackOnly = true;
        throw error;
      } finally {
        existing.pending.delete(pending);
      }
    }
    const at = performance.now(),
      lease = await this.acquire();
    const scope = { lease, active: true, accepting: true, rollbackOnly: false, pending: new Set() };
    let committed = false,
      begun = false;
    try {
      await this.operation.run("transaction.begin", () => lease.begin());
      begun = true;
      return await this.context.run(scope, async () => {
        const result = await work();
        scope.accepting = false;
        if (scope.pending.size) {
          scope.rollbackOnly = true;
          await Promise.allSettled([...scope.pending]);
        }
        if (scope.rollbackOnly) throw new TransactionRollbackOnlyError();
        await this.operation.run("transaction.commit", () => lease.commit());
        committed = true;
        return result;
      });
    } catch (error) {
      scope.accepting = false;
      await Promise.allSettled([...scope.pending]);
      if (begun) {
        try {
          await this.operation.run("transaction.rollback", () => lease.rollback());
        } catch {
          /* broken connection is discarded by transport */
        }
      }
      if (error?.driverError || error?.original) throw new DatabaseError(safeCode(error));
      throw error;
    } finally {
      scope.active = false;
      scope.accepting = false;
      await this.release(lease);
      this.emit(
        "transaction",
        performance.now() - at,
        undefined,
        committed ? undefined : "TX_ROLLBACK",
      );
    }
  }
  async close() {
    this.closing = true;
    // Already-admitted non-transactional queries also have to finish before pool shutdown.
    while (this.admitted) await new Promise((done) => setTimeout(done, 5));
    await this.transport.close();
  }
}

function pgOptions(config) {
  return {
    ssl: config.ssl,
    max: config.max,
    connectionTimeoutMillis: config.acquireMs,
    idleTimeoutMillis: 30000,
    maxLifetimeSeconds: 900,
    statement_timeout: config.statementMs,
    lock_timeout: config.lockMs,
    idle_in_transaction_session_timeout: config.idleTransactionMs,
    application_name: "examination",
    options: "-c search_path=pg_catalog -c timezone=UTC -c synchronous_commit=on",
  };
}

export async function createCandidate(name, config, observe = () => undefined) {
  if (name === "pg") return new PostgresDatabase(config, observe);
  const db = new CandidateDatabase(config, observe);
  if (name === "typeorm") {
    const { DataSource, EntitySchema } = await import("typeorm");
    const entity = new EntitySchema({
      name: "IdentityAccount",
      tableName: "users",
      schema: "identity",
      columns: Object.fromEntries(
        Object.entries(fields).map(([key, [field, type]]) => [
          key,
          { name: field, type, primary: key === "id", nullable: key === "emailVerifiedAt" },
        ]),
      ),
    });
    const source = new DataSource({
      type: "postgres",
      url: config.url,
      entities: [entity],
      synchronize: false,
      migrationsRun: false,
      logging: false,
      extra: pgOptions(config),
    });
    await source.initialize();
    db.transport = {
      // Pinned private pool counters: diagnostic only, not a production API contract.
      stats: () => ({
        total: source.driver.master.totalCount,
        idle: source.driver.master.idleCount,
        waiting: source.driver.master.waitingCount,
      }),
      async acquire() {
        const runner = source.createQueryRunner(),
          at = performance.now();
        const connection = await runner.connect();
        db.instrument(connection);
        db.emit("acquire", performance.now() - at);
        return {
          async query(sql, parameters) {
            const result = await runner.query(sql, parameters, true);
            return { rows: result.records, rowCount: result.affected };
          },
          begin: () => runner.startTransaction(),
          commit: () => runner.commitTransaction(),
          rollback: () => (runner.isReleased ? undefined : runner.rollbackTransaction()),
          release: () => runner.release(),
          account: (where, lock) =>
            runner.manager
              .getRepository(entity)
              .findOne({ where, ...(lock ? { lock: { mode: "pessimistic_write" } } : {}) }),
          async updateProfile(id, displayName, optIn) {
            const result = await runner.manager
              .getRepository(entity)
              .createQueryBuilder()
              .update()
              .set({ displayName, leaderboardOptIn: optIn, revision: () => '"revision" + 1' })
              .where('"id" = :id', { id })
              .returning(["revision"])
              .execute();
            return result.raw[0].revision;
          },
        };
      },
      close: () => source.destroy(),
    };
    return db;
  }
  if (name === "sequelize") {
    const { Sequelize, DataTypes } = await import("sequelize");
    const types = {
      uuid: DataTypes.UUID,
      text: DataTypes.TEXT,
      boolean: DataTypes.BOOLEAN,
      integer: DataTypes.INTEGER,
      timestamptz: DataTypes.DATE,
    };
    const source = new Sequelize(config.url, {
      dialect: "postgres",
      logging: false,
      retry: { max: 0 },
      pool: { max: config.max, min: 0, acquire: config.acquireMs, idle: 30000 },
      dialectOptions: pgOptions(config),
      hooks: {
        afterConnect: (connection) => db.instrument(connection),
        beforePoolAcquire: (options) => {
          options.ormAcquireStart = performance.now();
        },
        afterPoolAcquire: (_connection, options) =>
          db.emit("acquire", performance.now() - options.ormAcquireStart),
      },
    });
    const account = source.define(
      "IdentityAccount",
      Object.fromEntries(
        Object.entries(fields).map(([key, [field, type]]) => [
          key,
          {
            field,
            type: types[type],
            primaryKey: key === "id",
            allowNull: key === "emailVerifiedAt",
          },
        ]),
      ),
      { tableName: "users", schema: "identity", timestamps: false },
    );
    await source.authenticate();
    db.transport = {
      stats: () => ({
        total: source.connectionManager.pool.size,
        idle: source.connectionManager.pool.available,
        waiting: source.connectionManager.pool.waiting,
      }),
      async acquire() {
        let transaction;
        const options = () => ({ transaction });
        return {
          async query(sql, bind) {
            const [rows, meta] = await source.query(sql, { bind, ...options() });
            return {
              rows: rows ?? [],
              rowCount: typeof meta === "number" ? meta : meta.rowCount,
              command: meta?.command,
            };
          },
          begin: async () => {
            transaction = await source.transaction();
          },
          commit: () => transaction.commit(),
          rollback: () => transaction.rollback(),
          release: async () => undefined,
          account: (where, lock) =>
            account.findOne({
              where,
              ...options(),
              ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
            }),
          async updateProfile(id, displayName, optIn) {
            const [, rows] = await account.update(
              {
                displayName,
                leaderboardOptIn: optIn,
                revision: Sequelize.literal('"revision" + 1'),
              },
              { where: { id }, returning: ["revision"], validate: false, ...options() },
            );
            return rows[0].revision;
          },
        };
      },
      close: () => source.close(),
    };
    return db;
  }
  throw new Error("Unknown candidate");
}
