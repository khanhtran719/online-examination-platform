import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  DatabaseError,
  PostgresDatabase,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { createGradingConsumer } from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";
import { processGradingDelivery } from "../../src/workers/sqs/grading-delivery";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port === "55432")
  throw new Error("Disposable administrator required");

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const name = `grading_boundary_${suffix}`;
const owner = `grading_boundary_ddl_${suffix}`;
const worker = `grading_boundary_worker_${suffix}`;
const password = randomUUID();
const base = new URL(adminUrl);
base.pathname = `/${name}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
let fixture: Pool;
let db: PostgresDatabase;
let inbound: ReturnType<typeof createGradingConsumer>;

function config(login: string) {
  const url = new URL(base);
  url.username = login;
  url.password = password;
  return databaseConfig({ NODE_ENV: "test", DATABASE_URL: url.toString(), DB_POOL_MAX: "2" });
}

async function durableQuarantines(raw: string): Promise<number> {
  const digest = createHash("sha256").update(raw).digest("hex");
  const result = await fixture.query<{ count: number }>(
    `
    SELECT
      count(*)::int AS count
    FROM
      platform.invalid_submission_messages
    WHERE
      body_digest = $1
    `,
    [digest],
  );
  return result.rows[0]!.count;
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${worker} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_grading_worker TO ${worker}`);
  await migrate(
    config(owner),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: base.toString(), max: 1 });
  db = new PostgresDatabase(config(worker));
  inbound = createGradingConsumer(db, createScoringCatalog(db));
});

afterAll(async () => {
  await db?.close();
  await fixture?.end();
  try {
    let remaining = 1;
    for (let i = 0; i < 100 && remaining; i++) {
      const result = await admin.query<{ count: number }>(
        `
        SELECT
          count(*)::int AS count
        FROM
          pg_stat_activity
        WHERE
          datname = $1
        `,
        [name],
      );
      remaining = result.rows[0]!.count;
      if (remaining) await new Promise((done) => setTimeout(done, 10));
    }
    expect(remaining).toBe(0);
    await admin.query(`DROP DATABASE ${name}`);
    await admin.query(`DROP ROLE ${owner}, ${worker}`);
  } finally {
    await admin.end();
  }
});

describe("public grading consumer transaction boundary", () => {
  it("rejects ambient transactions without committing malformed-message quarantine", async () => {
    const raw = `{broken-consumer-${suffix}`;
    const settlement = await db
      .transaction(() => inbound.consume(raw))
      .then(
        (result) => ({ outcome: result.outcome, errorCode: null }),
        (error: unknown) => ({
          outcome: null,
          errorCode: error instanceof DatabaseError ? error.code : "UNEXPECTED_ERROR",
        }),
      );

    expect({ ...settlement, durableQuarantines: await durableQuarantines(raw) }).toEqual({
      outcome: null,
      errorCode: "DB_TRANSACTION_FORBIDDEN",
      durableQuarantines: 0,
    });
  });

  it("durably quarantines malformed JSON when invoked outside a transaction", async () => {
    const raw = `{broken-control-${suffix}`;
    const result = await inbound.consume(raw);

    expect({ outcome: result.outcome, durableQuarantines: await durableQuarantines(raw) }).toEqual({
      outcome: "quarantined",
      durableQuarantines: 1,
    });
  });

  it("keeps a delivery unacknowledged when its caller later rolls back", async () => {
    const raw = `{broken-delivery-${suffix}`;
    const rollback = new Error("Caller rolls back after delivery processing");
    let acknowledgements = 0;
    const outcome = await db
      .transaction(async () => {
        await processGradingDelivery({
          delivery: { body: raw, receipt: "boundary-receipt" },
          consume: (body) => inbound.consume(body),
          heartbeatMs: 60000,
          queue: {
            receive: async () => [],
            extend: async () => undefined,
            acknowledge: async () => {
              acknowledgements += 1;
              expect(await durableQuarantines(raw)).toBe(0);
            },
          },
        });
        throw rollback;
      })
      .catch((error: unknown) =>
        error instanceof DatabaseError ? error.code : error === rollback ? "CALLER_ROLLBACK" : null,
      );

    expect({
      outcome,
      acknowledgements,
      durableQuarantines: await durableQuarantines(raw),
    }).toEqual({
      outcome: "DB_TRANSACTION_FORBIDDEN",
      acknowledgements: 0,
      durableQuarantines: 0,
    });
  });
});
