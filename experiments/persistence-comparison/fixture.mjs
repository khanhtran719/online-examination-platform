import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { databaseConfig, loadMigrations, migrate } from "./runtime.mjs";

export async function disposableFixture() {
  const base = new URL(
    process.env.PERSISTENCE_ADMIN_URL ??
      "postgres://examination:local-evaluation-only@127.0.0.1:55434/examination",
  );
  if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost"].includes(base.hostname))
    throw new Error("Disposable loopback experiment only");
  const name = `orm_eval_${randomUUID().replaceAll("-", "")}`,
    suffix = name.slice(-12);
  const owner = `orm_ddl_${suffix}`,
    runtime = `orm_app_${suffix}`,
    password = randomUUID();
  const admin = new pg.Pool({ connectionString: base.toString(), max: 1 });
  const fixtureUrl = new URL(base);
  fixtureUrl.pathname = `/${name}`;
  const runtimeUrl = new URL(fixtureUrl);
  runtimeUrl.username = runtime;
  runtimeUrl.password = password;
  const ddlUrl = new URL(fixtureUrl);
  ddlUrl.username = owner;
  ddlUrl.password = password;
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(
    await readFile(new URL("../../infra/database/roles.sql", import.meta.url), "utf8"),
  );
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(
    `CREATE ROLE ${runtime} LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password}'`,
  );
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtime}`);
  const migrations = await loadMigrations(
    new URL("../../dist/infrastructure/database/migrations", import.meta.url).pathname,
  );
  await migrate(databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }), migrations);
  const fixture = new pg.Pool({ connectionString: fixtureUrl.toString(), max: 2 });
  fixture.on("error", () => undefined);
  await fixture.query("CREATE EXTENSION IF NOT EXISTS pg_stat_statements");
  await fixture.query(
    "CREATE TABLE platform.orm_probe(id text PRIMARY KEY,value integer NOT NULL)",
  );
  await fixture.query("GRANT SELECT,INSERT,UPDATE ON platform.orm_probe TO examination_runtime");
  return {
    fixture,
    migrations,
    config: databaseConfig({
      NODE_ENV: "test",
      DATABASE_URL: runtimeUrl.toString(),
      DB_POOL_MAX: "4",
      DB_MAX_WAITING: "32",
      DB_ACQUIRE_TIMEOUT_MS: "1000",
      DB_STATEMENT_TIMEOUT_MS: "2000",
      DB_LOCK_TIMEOUT_MS: "500",
    }),
    async close() {
      await fixture.end();
      for (let i = 0; i < 100; i++) {
        const count = (
          await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=$1", [name])
        ).rows[0].n;
        if (!count) break;
        await new Promise((done) => setTimeout(done, 10));
      }
      await admin.query(`DROP DATABASE ${name}`);
      await admin.query(`DROP ROLE ${owner},${runtime}`);
      await admin.end();
    },
  };
}

export async function activatedSession(db, crypto) {
  const id = crypto.codec.id(),
    familyId = crypto.codec.id(),
    now = Date.now();
  await db.query(
    "identity.write",
    "INSERT INTO identity.users(id,email,password_hash,display_name) VALUES($1,$2,$3,'Fixture')",
    [id, `${id}@example.test`, crypto.dummy],
  );
  await db.query("identity.write", "SELECT identity.assign_candidate($1)", [id]);
  await db.query(
    "identity.write",
    "UPDATE identity.users SET email_verified_at=clock_timestamp() WHERE id=$1",
    [id],
  );
  const pair = await crypto.tokens.issue({
    userId: id,
    familyId,
    sessionId: crypto.codec.id(),
    now,
    absoluteExpiresAt: now + 86400000,
  });
  const { PostgresIdentityRepository } = await import("./runtime.mjs");
  const repo = new PostgresIdentityRepository(db);
  await db.transaction(async () => {
    await repo.createFamily(familyId, id, pair.absoluteExpiresAt);
    await repo.saveSession(pair);
  });
  return pair;
}
