import { readFileSync } from "node:fs";

export interface DatabaseConfig {
  url: string;
  ssl: false | { rejectUnauthorized: true; ca?: string };
  max: number;
  maxWaiting: number;
  acquireMs: number;
  statementMs: number;
  lockMs: number;
  idleTransactionMs: number;
}

function integer(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  max: number,
): number {
  const value = env[key] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
    throw new Error(`Invalid ${key}`);
  return Number(value);
}

export function databaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("Invalid DATABASE_URL");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.search ||
    url.hash
  )
    throw new Error("Database URL must not override connection configuration");
  if (env.DB_SSL && !["true", "false"].includes(env.DB_SSL))
    throw new Error("Invalid DB_SSL");
  if (env.NODE_ENV === "production" && env.DB_SSL !== "true")
    throw new Error("Production database requires verified TLS");
  const config: DatabaseConfig = {
    url: env.DATABASE_URL,
    ssl:
      env.DB_SSL === "true"
        ? {
            rejectUnauthorized: true,
            ...(env.DB_CA_FILE
              ? { ca: readFileSync(env.DB_CA_FILE, "utf8") }
              : {}),
          }
        : false,
    max: integer(env, "DB_POOL_MAX", 10, 100),
    maxWaiting: integer(env, "DB_MAX_WAITING", 20, 1000),
    acquireMs: integer(env, "DB_ACQUIRE_TIMEOUT_MS", 1000, 30000),
    statementMs: integer(env, "DB_STATEMENT_TIMEOUT_MS", 2000, 60000),
    lockMs: integer(env, "DB_LOCK_TIMEOUT_MS", 500, 60000),
    idleTransactionMs: integer(
      env,
      "DB_IDLE_TRANSACTION_TIMEOUT_MS",
      5000,
      60000,
    ),
  };
  if (config.lockMs >= config.statementMs)
    throw new Error("Lock timeout must be less than statement timeout");
  return config;
}

export interface ConnectionBudget {
  maxConnections: number;
  apiTasks: number;
  apiPool: number;
  workerTasks: number;
  workerPool: number;
  surgeTasks: number;
  surgePool: number;
  migration: number;
  reserved: number;
}

export function connectionBudget(budget: ConnectionBudget): {
  required: number;
  headroom: number;
} {
  if (
    Object.values(budget).some(
      (value) => !Number.isSafeInteger(value) || value < 0,
    ) ||
    budget.maxConnections < 1 ||
    budget.reserved < 1
  )
    throw new Error("Invalid connection budget");
  const required =
    budget.apiTasks * budget.apiPool +
    budget.workerTasks * budget.workerPool +
    budget.surgeTasks * budget.surgePool +
    budget.migration +
    budget.reserved;
  if (!Number.isSafeInteger(required) || required > budget.maxConnections)
    throw new Error("Connection budget exceeds database capacity");
  return { required, headroom: budget.maxConnections - required };
}
