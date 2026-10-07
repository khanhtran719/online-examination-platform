import { readFile } from "node:fs/promises";
import pg from "pg";

// Local bootstrap only; production roles/logins/secrets are provisioned separately.
const url = new URL(
  process.env.DATABASE_LOCAL_ADMIN_URL ??
    "postgres://examination:local-only-password@127.0.0.1:55432/examination",
);
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("Local database bootstrap requires localhost and non-production environment");
const pool = new pg.Pool({
  connectionString: url.toString(),
  max: 1,
  connectionTimeoutMillis: 2000,
});
try {
  await pool.query(await readFile("infra/database/roles.sql", "utf8"));
  const databaseName = decodeURIComponent(url.pathname.slice(1)).replaceAll('"', '""');
  await pool.query(`GRANT CREATE ON DATABASE "${databaseName}" TO examination_owner`);
  await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT FROM pg_roles
      WHERE rolname = 'examination_migrator_local'
    ) THEN
      CREATE ROLE examination_migrator_local
        LOGIN NOINHERIT
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
        PASSWORD 'local-migration-only-password';
    END IF;
    IF NOT EXISTS (
      SELECT FROM pg_roles
      WHERE rolname = 'examination_app_local'
    ) THEN
      CREATE ROLE examination_app_local
        LOGIN INHERIT
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
        PASSWORD 'local-runtime-only-password';
    END IF;
    IF NOT EXISTS (
      SELECT FROM pg_roles
      WHERE rolname = 'examination_operator_local'
    ) THEN
      CREATE ROLE examination_operator_local
        LOGIN INHERIT
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
        PASSWORD 'local-operator-only-password';
    END IF;
    IF NOT EXISTS (
      SELECT FROM pg_roles
      WHERE rolname = 'examination_mail_local'
    ) THEN
      CREATE ROLE examination_mail_local
        LOGIN INHERIT
        NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
        PASSWORD 'local-mail-only-password';
    END IF;
  END
  $$
  `);
  await pool.query("GRANT examination_owner TO examination_migrator_local");
  await pool.query("GRANT examination_runtime TO examination_app_local");
  await pool.query("GRANT examination_operator TO examination_operator_local");
  await pool.query("GRANT examination_mail_worker TO examination_mail_local");
  await pool.query(await readFile("infra/database/observability.sql", "utf8"));
  process.stdout.write(
    "Local database roles and diagnostics provisioned; run migrations with the migration login.\n",
  );
} catch {
  process.stderr.write(
    "Local database bootstrap failed; inspect restricted administrator diagnostics.\n",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
