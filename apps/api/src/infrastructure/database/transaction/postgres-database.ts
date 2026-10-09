import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { UnitOfWork } from "../../../shared/application/unit-of-work/unit-of-work.port";
import { DatabaseConfig } from "../../../config/database.config";

// Bounded labels only. Add a reviewed label when a business adapter is implemented.
export type DatabaseOperation =
  | "diagnostic"
  | "identity.read"
  | "identity.write"
  | "catalog.read"
  | "catalog.write"
  | "assessment.read"
  | "assessment.write"
  | "security.rate"
  | "audit.write"
  | "idempotency.read"
  | "idempotency.write"
  | "email.claim"
  | "outbox.claim"
  | "outbox.ack"
  | "outbox.read"
  | "lock.acquire"
  | "transaction.begin"
  | "transaction.commit"
  | "transaction.rollback";
export interface DatabaseObservation {
  kind: "query" | "lock" | "acquire" | "transaction" | "pool.error";
  operation?: DatabaseOperation;
  durationMs: number;
  code?: string;
  total: number;
  idle: number;
  waiting: number;
}
export class DatabaseError extends Error {
  constructor(readonly code: string) {
    super("Database operation failed");
    this.name = "DatabaseError";
  }
}
export class TransactionRollbackOnlyError extends Error {
  constructor() {
    super("Transaction marked rollback-only");
  }
}

interface TransactionScope {
  client: PoolClient;
  active: boolean;
  accepting: boolean;
  rollbackOnly: boolean;
  pending: Set<Promise<unknown>>;
}
function safeCode(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : "DB_UNAVAILABLE";
}

/** Infrastructure executor only: never inject into application/domain code. */
export class PostgresDatabase implements UnitOfWork {
  private readonly pool: Pool;
  private readonly context = new AsyncLocalStorage<TransactionScope>();
  private admitted = 0;
  private closing = false;
  private readonly drainWaiters = new Set<() => void>();
  private closePromise?: Promise<void>;

  constructor(
    private readonly config: DatabaseConfig,
    private readonly observe: (value: DatabaseObservation) => void = () => undefined,
  ) {
    this.pool = new Pool({
      connectionString: config.url,
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
    });
    this.pool.on("error", (error) => this.emit("pool.error", 0, undefined, safeCode(error)));
  }

  stats(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /** A committed relay claim cannot join a caller's still-open write transaction. */
  assertOutsideTransaction(): void {
    if (this.context.getStore()) throw new DatabaseError("DB_TRANSACTION_FORBIDDEN");
  }

  private emit(
    kind: DatabaseObservation["kind"],
    durationMs: number,
    operation?: DatabaseOperation,
    code?: string,
  ): void {
    // Telemetry failures cannot change database commit semantics.
    try {
      this.observe({ kind, durationMs, operation, code, ...this.stats() });
    } catch {
      /* collector failure */
    }
  }

  private async acquire(): Promise<PoolClient> {
    if (this.closing || this.admitted >= this.config.max + this.config.maxWaiting)
      throw new DatabaseError("DB_BUSY");
    this.admitted += 1;
    const started = performance.now();
    try {
      const client = await this.pool.connect();
      this.emit("acquire", performance.now() - started);
      return client;
    } catch {
      this.admitted -= 1;
      this.notifyDrained();
      this.emit("acquire", performance.now() - started, undefined, "DB_ACQUIRE_TIMEOUT");
      throw new DatabaseError("DB_ACQUIRE_TIMEOUT");
    }
  }

  private release(client: PoolClient, destroy = false): void {
    this.admitted -= 1;
    client.release(destroy);
    this.notifyDrained();
  }

  private notifyDrained(): void {
    if (this.admitted === 0) {
      for (const resolve of this.drainWaiters) resolve();
      this.drainWaiters.clear();
    }
  }

  private async execute<T extends QueryResultRow>(
    client: PoolClient,
    operation: DatabaseOperation,
    sql: string,
    parameters: unknown[],
  ): Promise<QueryResult<T>> {
    const started = performance.now();
    try {
      const result = await client.query<T>(sql, parameters);
      this.emit("query", performance.now() - started, operation);
      if (operation === "lock.acquire") this.emit("lock", performance.now() - started, operation);
      return result;
    } catch (error) {
      const code = safeCode(error);
      this.emit("query", performance.now() - started, operation, code);
      if (operation === "lock.acquire")
        this.emit("lock", performance.now() - started, operation, code);
      throw new DatabaseError(code);
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    operation: DatabaseOperation,
    sql: string,
    parameters: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const scope = this.context.getStore();
    if (operation === "lock.acquire" && !scope) throw new DatabaseError("DB_TRANSACTION_REQUIRED");
    if (scope) {
      if (!scope.active || !scope.accepting) throw new DatabaseError("DB_CONTEXT_ENDED");
      const work = this.execute<T>(scope.client, operation, sql, parameters);
      scope.pending.add(work);
      try {
        return await work;
      } catch (error) {
        scope.rollbackOnly = true;
        throw error;
      } finally {
        scope.pending.delete(work);
      }
    }
    const client = await this.acquire();
    try {
      return await this.execute<T>(client, operation, sql, parameters);
    } finally {
      this.release(client);
    }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const existing = this.context.getStore();
    if (existing) {
      if (!existing.active || !existing.accepting) throw new DatabaseError("DB_CONTEXT_ENDED");
      const joined = Promise.resolve().then(work);
      existing.pending.add(joined);
      try {
        return await joined;
      } catch (error) {
        existing.rollbackOnly = true;
        throw error;
      } finally {
        existing.pending.delete(joined);
      }
    }
    const started = performance.now();
    const client = await this.acquire();
    // A checked-out client needs an error listener too (idle-in-transaction termination).
    const scope: TransactionScope = {
      client,
      active: true,
      accepting: true,
      rollbackOnly: false,
      pending: new Set(),
    };
    let broken = false;
    const onError = () => {
      broken = true;
      scope.rollbackOnly = true;
    };
    client.on("error", onError);
    let begun = false;
    let committed = false;
    try {
      await this.execute(client, "transaction.begin", "BEGIN", []);
      begun = true;
      return await this.context.run(scope, async () => {
        const result = await work();
        scope.accepting = false;
        if (scope.pending.size) {
          scope.rollbackOnly = true;
          await Promise.allSettled([...scope.pending]);
        }
        if (scope.rollbackOnly) throw new TransactionRollbackOnlyError();
        const commitResult = await this.execute(client, "transaction.commit", "COMMIT", []);
        // PostgreSQL may answer ROLLBACK to COMMIT after an aborted transaction.
        if (commitResult.command !== "COMMIT") throw new TransactionRollbackOnlyError();
        committed = true;
        return result;
      });
    } catch (error) {
      scope.accepting = false;
      await Promise.allSettled([...scope.pending]);
      if (begun) {
        try {
          await this.execute(client, "transaction.rollback", "ROLLBACK", []);
        } catch {
          broken = true;
        }
      }
      throw error;
    } finally {
      scope.active = false;
      scope.accepting = false;
      client.removeListener("error", onError);
      this.release(client, broken);
      this.emit(
        "transaction",
        performance.now() - started,
        undefined,
        committed ? undefined : "TX_ROLLBACK",
      );
    }
  }

  close(): Promise<void> {
    this.closing = true;
    this.closePromise ??= (async () => {
      if (this.admitted > 0) await new Promise<void>((resolve) => this.drainWaiters.add(resolve));
      await this.pool.end();
    })();
    return this.closePromise;
  }
}
