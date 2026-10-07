import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";
import { DatabaseConfig } from "../../config/database.config";

export interface SqlMigration {
  name: string;
  sql: string;
  checksum: string;
}

export function validateMigrationSql(sql: string): void {
  // Ignore comments/literals/function bodies; BEGIN inside PL/pgSQL is not a transaction command.
  // This is a guard for trusted reviewed files, not a SQL security parser.
  const statements = sql.replace(
    /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|\$(\w*)\$[\s\S]*?\$\1\$/g,
    " ",
  );
  if (
    /(?:^|;)\s*(?:BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION|SET|RESET|DISCARD)\b/i.test(statements)
  )
    throw new Error("Migration cannot manage its transaction/session");
}

export async function loadMigrations(directory: string): Promise<SqlMigration[]> {
  const files = (await readdir(directory)).sort();
  if (!files.length || files.some((name) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(name)))
    throw new Error("Invalid migration filenames");
  const versions = files.map((name) => Number(name.slice(0, 4)));
  if (versions.some((version, index) => version !== index + 1))
    throw new Error("Migrations must be a contiguous sequence starting at 0001");
  return Promise.all(
    files.map(async (name) => {
      const sql = await readFile(join(directory, name), "utf8");
      // Trusted reviewed SQL only. Files must not manage transactions or session settings.
      validateMigrationSql(sql);
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

export async function migrate(
  config: DatabaseConfig,
  migrations: SqlMigration[],
): Promise<string[]> {
  for (const migration of migrations) {
    validateMigrationSql(migration.sql);
    if (createHash("sha256").update(migration.sql).digest("hex") !== migration.checksum)
      throw new Error("Migration content/checksum mismatch");
  }
  const pool = new Pool({
    connectionString: config.url,
    ssl: config.ssl,
    max: 1,
    connectionTimeoutMillis: config.acquireMs,
    statement_timeout: 60000,
    lock_timeout: 5000,
    idle_in_transaction_session_timeout: 60000,
    options: "-c search_path=pg_catalog -c timezone=UTC -c synchronous_commit=on",
    application_name: "examination-migration",
  });
  pool.on("error", () => undefined);
  const applied: string[] = [];
  let client;
  let locked = false;
  let broken = false;
  try {
    client = await pool.connect();
    client.on("error", () => {
      broken = true;
    });
    await client.query("SET ROLE examination_owner");
    // Session lock survives individual migration commits; bounded server statement timeout.
    await client.query("SELECT pg_advisory_lock(734219, 1)");
    locked = true;
    await client.query("CREATE SCHEMA IF NOT EXISTS platform");
    await client.query(`
    CREATE TABLE IF NOT EXISTS platform.schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
      applied_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
    )
    `);
    const existing = await client.query<{ name: string; checksum: string }>(
      `
      SELECT
        name,
        checksum
      FROM
        platform.schema_migrations
      ORDER BY
        name
      `,
    );
    const names = migrations.map((m) => m.name);
    if (
      names.some(
        (name, i) => !/^\d{4}_[a-z0-9_]+\.sql$/.test(name) || Number(name.slice(0, 4)) !== i + 1,
      ) ||
      new Set(names).size !== names.length
    )
      throw new Error("Invalid migration order");
    for (let i = 0; i < existing.rows.length; i += 1) {
      const row = existing.rows[i];
      const expected = migrations[i];
      if (!expected || row?.name !== expected.name || row.checksum !== expected.checksum)
        throw new Error("Applied migration prefix/checksum mismatch");
    }
    for (const migration of migrations.slice(existing.rows.length)) {
      if (createHash("sha256").update(migration.sql).digest("hex") !== migration.checksum)
        throw new Error("Migration content/checksum mismatch");
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `
          INSERT INTO
            platform.schema_migrations (name, checksum)
          VALUES
            ($1, $2)
          `,
          [migration.name, migration.checksum],
        );
        await client.query("COMMIT");
        applied.push(migration.name);
      } catch {
        await client.query("ROLLBACK");
        throw new Error(`Migration failed: ${migration.name}`);
      }
    }
    return applied;
  } finally {
    if (client) {
      if (locked) {
        try {
          await client.query("SELECT pg_advisory_unlock(734219, 1)");
        } catch {
          broken = true;
        }
      }
      client.release(broken);
    }
    await pool.end();
  }
}
