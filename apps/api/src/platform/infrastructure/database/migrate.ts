import { resolve } from "node:path";
import { databaseConfig } from "./database-config";
import { loadMigrations, migrate } from "./migration-runner";

async function main(): Promise<void> {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL required");
  const config = databaseConfig({ ...process.env, DATABASE_URL: url });
  const applied = await migrate(
    config,
    await loadMigrations(resolve("apps/api/migrations")),
  );
  process.stdout.write(
    JSON.stringify({ event: "migrations.complete", applied }) + "\n",
  );
}
void main().catch(() => {
  process.stderr.write(
    "Migration failed; inspect restricted database diagnostics.\n",
  );
  process.exitCode = 1;
});
