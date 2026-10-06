import { readFileSync } from "node:fs";
import { databaseConfig, DatabaseConfig } from "../../config/database.config";
export function loadDatabaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  return databaseConfig(
    env,
    env.DB_SSL === "true" && env.DB_CA_FILE ? readFileSync(env.DB_CA_FILE, "utf8") : undefined,
  );
}
