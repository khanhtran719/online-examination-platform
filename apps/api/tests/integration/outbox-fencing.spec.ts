import { randomUUID } from "node:crypto";
import { Pool, PoolClient } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { PostgresDatabase } from "../../src/infrastructure/database/transaction/postgres-database";
import { SubmissionClaim } from "../../src/modules/assessment/application/ports/submission-dispatch.port";
import { PostgresSubmissionDispatch } from "../../src/modules/assessment/infrastructure/persistence/postgres-submission-dispatch";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port === "55432")
  throw new Error("Disposable test administrator required");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const databaseName = `outbox_fence_${suffix}`;
const workerRole = `outbox_fence_worker_${suffix}`;
const password = randomUUID();
const fixtureUrl = new URL(adminUrl);
fixtureUrl.pathname = `/${databaseName}`;
const workerUrl = new URL(fixtureUrl);
workerUrl.username = workerRole;
workerUrl.password = password;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const poolErrors: string[] = [];
let fixture: Pool;
let db: PostgresDatabase;
let dispatch: PostgresSubmissionDispatch;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${databaseName}`);
  await admin.query(`CREATE ROLE ${workerRole} LOGIN PASSWORD '${password}'`);
  fixture = new Pool({ connectionString: fixtureUrl.toString(), max: 2 });
  fixture.on("error", (error: Error & { code?: string }) => {
    poolErrors.push(error.code ?? "unknown");
  });
  // Deliberately minimal lock-semantics fixture. Production FK/trigger/migration
  // acceptance is covered by outbox-dispatch.spec.ts, not by this reproduction.
  await fixture.query(`
    CREATE SCHEMA platform;
    CREATE TABLE platform.outbox (
      event_id uuid PRIMARY KEY,
      aggregate_id uuid NOT NULL,
      correlation_id uuid NOT NULL,
      causation_id uuid,
      payload jsonb NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      replay_at timestamptz,
      lease_token uuid,
      lease_until timestamptz,
      delivered_at timestamptz,
      parked_at timestamptz,
      failure_code text
    );
    GRANT USAGE ON SCHEMA platform TO ${workerRole};
    GRANT SELECT ON platform.outbox TO ${workerRole};
    GRANT UPDATE (
      attempts,
      lease_token,
      lease_until,
      available_at,
      delivered_at,
      parked_at,
      failure_code
    ) ON platform.outbox TO ${workerRole}
  `);
  db = new PostgresDatabase(
    databaseConfig({
      NODE_ENV: "test",
      DATABASE_URL: workerUrl.toString(),
      DB_POOL_MAX: "1",
      DB_LOCK_TIMEOUT_MS: "5000",
      DB_STATEMENT_TIMEOUT_MS: "7000",
      DB_IDLE_TRANSACTION_TIMEOUT_MS: "8000",
    }),
  );
  dispatch = new PostgresSubmissionDispatch(db);
});

beforeEach(async () => {
  await fixture.query("TRUNCATE platform.outbox");
});

afterAll(async () => {
  await db?.close();
  await fixture?.end();
  try {
    let connections = 1;
    for (let n = 0; n < 100 && connections; n += 1) {
      connections = Number(
        (
          await admin.query(
            `
            SELECT
              count(*)::integer AS n
            FROM
              pg_stat_activity
            WHERE
              datname = $1
          `,
            [databaseName],
          )
        ).rows[0].n,
      );
      if (connections) await pause(10);
    }
    expect(connections).toBe(0);
    expect(poolErrors).toEqual([]);
    await admin.query(`DROP DATABASE ${databaseName}`);
    await admin.query(`DROP ROLE ${workerRole}`);
  } finally {
    await admin.end();
  }
});

async function seedClaim(): Promise<SubmissionClaim> {
  const eventId = randomUUID();
  await fixture.query(
    `
    INSERT INTO platform.outbox (
      event_id,
      aggregate_id,
      correlation_id,
      payload
    )
    VALUES ($1, $2, $3, '{}'::jsonb)
  `,
    [eventId, randomUUID(), randomUUID()],
  );
  const [claim] = await dispatch.claim(1, 10000);
  expect(claim?.eventId).toBe(eventId);
  return claim!;
}

async function state(eventId: string) {
  return (
    await fixture.query(
      `
      SELECT
        lease_token,
        lease_until,
        available_at,
        delivered_at,
        parked_at,
        failure_code
      FROM
      platform.outbox
      WHERE
      event_id = $1
    `,
      [eventId],
    )
  ).rows[0];
}

async function lock(eventId: string): Promise<PoolClient> {
  const client = await fixture.connect();
  await client.query("BEGIN");
  await client.query(
    `
    SELECT
      event_id
    FROM
      platform.outbox
    WHERE
      event_id = $1
    FOR UPDATE
  `,
    [eventId],
  );
  return client;
}

async function observedLockWait(): Promise<void> {
  for (let n = 0; n < 100; n += 1) {
    const waiting = (
      await admin.query(
        `
        SELECT
              count(*)::integer AS n
        FROM
              pg_stat_activity
        WHERE
          datname = $1
          AND usename = $2
          AND state = 'active'
          AND wait_event_type = 'Lock'
      `,
        [databaseName, workerRole],
      )
    ).rows[0].n;
    if (Number(waiting) === 1) return;
    await pause(10);
  }
  throw new Error("Mutation did not enter an observed PostgreSQL row-lock wait");
}

async function waitForDatabaseExpiry(eventId: string): Promise<void> {
  for (let n = 0; n < 250; n += 1) {
    const expired = (
      await fixture.query(
        `
        SELECT
          lease_until <= clock_timestamp() AS expired
        FROM
      platform.outbox
        WHERE
      event_id = $1
      `,
        [eventId],
      )
    ).rows[0].expired;
    if (expired === true) return;
    await pause(10);
  }
  throw new Error("Lease did not expire within the bounded database-time wait");
}

function mutate(operation: "delivered" | "failed", claim: SubmissionClaim) {
  return operation === "delivered"
    ? dispatch.delivered(claim)
    : dispatch.failed(claim, "QUEUE_UNAVAILABLE", 1000, false);
}

describe("Outbox lease fencing after PostgreSQL row-lock waits", () => {
  it.each(["delivered", "failed"] as const)(
    "rejects %s when an unchanged tuple lock is released after natural lease expiry",
    async (operation) => {
      const claim = await seedClaim();
      await fixture.query(
        `
        UPDATE platform.outbox
        SET
          lease_until = clock_timestamp() + interval '1500 milliseconds'
        WHERE
      event_id = $1
      `,
        [claim.eventId],
      );
      const before = await state(claim.eventId);
      const blocker = await lock(claim.eventId);
      const result = mutate(operation, claim).then(
        (value) => ({ value }),
        () => ({ error: true }),
      );
      try {
        await observedLockWait();
        const remaining = (
          await fixture.query(
            `
            SELECT
              lease_until > clock_timestamp() AS valid
            FROM
      platform.outbox
            WHERE
      event_id = $1
          `,
            [claim.eventId],
          )
        ).rows[0].valid;
        expect(remaining).toBe(true);
        await waitForDatabaseExpiry(claim.eventId);
      } finally {
        // No UPDATE here: the reproduction relies on no new tuple version.
        await blocker.query("COMMIT");
        blocker.release();
      }
      expect(await result).toEqual({ value: false });
      expect(await state(claim.eventId)).toEqual(before);
    },
  );

  it.each(["delivered", "failed"] as const)(
    "rejects stale %s when the competing transaction rotates the token",
    async (operation) => {
      const claim = await seedClaim();
      const blocker = await lock(claim.eventId);
      await blocker.query(
        `
        UPDATE platform.outbox
        SET
          lease_token = $2
        WHERE
      event_id = $1
      `,
        [claim.eventId, randomUUID()],
      );
      const result = mutate(operation, claim).then(
        (value) => ({ value }),
        () => ({ error: true }),
      );
      try {
        await observedLockWait();
      } finally {
        await blocker.query("COMMIT");
        blocker.release();
      }
      expect(await result).toEqual({ value: false });
      expect(await state(claim.eventId)).toMatchObject({
        delivered_at: null,
        parked_at: null,
        failure_code: null,
      });
    },
  );
});
