import { databaseConfig, connectionBudget } from "../database-config";

const local = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://local:fake@localhost/db",
};

describe("database configuration", () => {
  it("bounds local pool and queue with positive finite timeouts", () => {
    expect(databaseConfig(local)).toMatchObject({
      max: 10,
      maxWaiting: 20,
      acquireMs: 1000,
      statementMs: 2000,
      lockMs: 500,
      idleTransactionMs: 5000,
    });
  });
  it.each(["0", "-1", "NaN", "1.2", "100000"])(
    "rejects unsafe pool sizes %s",
    (value) => {
      expect(() => databaseConfig({ ...local, DB_POOL_MAX: value })).toThrow();
    },
  );
  it("requires explicit verified TLS in production", () => {
    expect(() =>
      databaseConfig({ ...local, NODE_ENV: "production" }),
    ).toThrow();
    expect(() =>
      databaseConfig({ ...local, NODE_ENV: "production", DB_SSL: "false" }),
    ).toThrow();
    expect(
      databaseConfig({ ...local, NODE_ENV: "production", DB_SSL: "true" }).ssl,
    ).toEqual({ rejectUnauthorized: true });
  });
  it.each([
    "sslmode=no-verify",
    "sslmode=disable",
    "options=-c%20statement_timeout=0",
  ])("rejects URL override %s", (option) => {
    expect(() =>
      databaseConfig({
        ...local,
        DATABASE_URL: `${local.DATABASE_URL}?${option}`,
      }),
    ).toThrow();
  });
  it("rejects lock timeout longer than statement timeout", () => {
    expect(() =>
      databaseConfig({ ...local, DB_LOCK_TIMEOUT_MS: "3000" }),
    ).toThrow();
  });
});

describe("connection budget", () => {
  it("counts peak task pools, rolling surge, migration and reserved connections", () => {
    expect(
      connectionBudget({
        maxConnections: 200,
        apiTasks: 4,
        apiPool: 10,
        workerTasks: 4,
        workerPool: 5,
        surgeTasks: 4,
        surgePool: 10,
        migration: 1,
        reserved: 30,
      }),
    ).toEqual({ required: 131, headroom: 69 });
  });
  it("rejects a budget that could exhaust the database", () => {
    expect(() =>
      connectionBudget({
        maxConnections: 100,
        apiTasks: 4,
        apiPool: 10,
        workerTasks: 4,
        workerPool: 5,
        surgeTasks: 4,
        surgePool: 10,
        migration: 1,
        reserved: 30,
      }),
    ).toThrow();
  });
});
