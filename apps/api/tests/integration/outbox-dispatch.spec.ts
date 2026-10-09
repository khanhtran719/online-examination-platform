import { randomUUID, createHash } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { PostgresSubmissionDispatch } from "../../src/modules/assessment/infrastructure/persistence/postgres-submission-dispatch";
import { SubmissionPublisher } from "../../src/modules/assessment/application/services/submission-publisher";
import { submissionEvent } from "../../src/modules/assessment/domain/assessment-policy";
import { startSubmissionPublisher } from "../../src/workers/outbox/submission.main";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port === "55432")
  throw new Error("Disposable test administrator required");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const name = `dispatch_${suffix}`;
const owner = `dispatch_ddl_${suffix}`;
const worker = `dispatch_worker_${suffix}`;
const operator = `dispatch_operator_${suffix}`;
const runtime = `dispatch_api_${suffix}`;
const password = randomUUID();
const base = new URL(adminUrl);
base.pathname = `/${name}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
let fixture: Pool;
let db: PostgresDatabase;
let second: PostgresDatabase;
let opDb: PostgresDatabase;
let apiDb: PostgresDatabase;
let repo: PostgresSubmissionDispatch;
let other: PostgresSubmissionDispatch;
const examId = randomUUID(),
  versionId = randomUUID(),
  userId = randomUUID();
const fixtureErrors: string[] = [];
const observations: DatabaseObservation[] = [];

function config(login: string) {
  const url = new URL(base);
  url.username = login;
  url.password = password;
  return databaseConfig({ NODE_ENV: "test", DATABASE_URL: url.toString(), DB_POOL_MAX: "2" });
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const login of [owner, worker, operator, runtime]) {
    await admin.query(
      `CREATE ROLE ${login} LOGIN ${login === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
  }
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_dispatch_worker TO ${worker}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await admin.query(`GRANT examination_runtime TO ${runtime}`);
  const migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(config(owner), migrations);
  fixture = new Pool({ connectionString: base.toString(), max: 3 });
  fixture.on("error", (error: Error & { code?: string }) => {
    fixtureErrors.push(error.code ?? "unknown");
  });
  db = new PostgresDatabase(config(worker), (value) => {
    observations.push(value);
  });
  second = new PostgresDatabase(config(worker));
  opDb = new PostgresDatabase(config(operator));
  apiDb = new PostgresDatabase(config(runtime));
  repo = new PostgresSubmissionDispatch(db);
  other = new PostgresSubmissionDispatch(second);
  await fixture.query(
    `
    INSERT INTO identity.users (id, email, password_hash, display_name)
    VALUES
      ($1, 'dispatch@example.test', 'fixture-only', 'Dispatch')
  `,
    [userId],
  );
  // Reuse the immutable publication contract through real published rows.
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `
      INSERT INTO catalog.exams (
        id, title, category, duration_seconds, attempt_limit, opens_at, closes_at
      )
      VALUES
        ($1, 'Dispatch', 'IT_CERTIFICATION', 90, 10,
        clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day')
    `,
      [examId],
    );
    await c.query(
      `
      INSERT INTO catalog.published_versions (
        id, exam_id, version, title, description, duration_seconds, attempt_limit,
        opens_at, closes_at, display_timezone, explanation_policy, category, published_by
      )
      VALUES
        ($1, $2, 1, 'Dispatch', '', 90, 10,
        clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day',
        'Asia/Ho_Chi_Minh', 'NEVER', 'IT_CERTIFICATION', $3)
    `,
      [versionId, examId, userId],
    );
    const section = randomUUID(),
      question = randomUUID(),
      option = randomUUID();
    await c.query(
      `
      INSERT INTO catalog.published_sections (version_id, id, title, position)
      VALUES
        ($1, $2, 'One', 1)
    `,
      [versionId, section],
    );
    await c.query(
      `
      INSERT INTO catalog.published_questions (
        version_id, id, section_id, source_question_id, source_revision, type,
        prompt, explanation, points, position
      )
      VALUES
        ($1, $2, $3, $4, 1, 'SINGLE_CHOICE', 'Q', 'Hidden', 5, 1)
    `,
      [versionId, question, section, randomUUID()],
    );
    await c.query(
      `
      INSERT INTO catalog.published_options (version_id, question_id, id, position, text)
      VALUES
        ($1, $2, $3, 1, 'A'), ($1, $2, $4, 2, 'B')
    `,
      [versionId, question, option, randomUUID()],
    );
    await c.query(
      `
      INSERT INTO catalog.published_answer_keys (version_id, question_id, option_id)
      VALUES
        ($1, $2, $3)
    `,
      [versionId, question, option],
    );
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}, 60000);

beforeEach(async () => {
  await fixture.query("TRUNCATE assessment.attempts, platform.outbox CASCADE");
});
afterAll(async () => {
  await Promise.all([db?.close(), second?.close(), opDb?.close(), apiDb?.close()]);
  await fixture?.end();
  try {
    let count = 1;
    for (let n = 0; n < 100 && count; n += 1) {
      count = Number(
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
            [name],
          )
        ).rows[0].n,
      );
      if (count) await new Promise((done) => setTimeout(done, 10));
    }
    expect(count).toBe(0);
    expect(fixtureErrors).toEqual([]);
    await admin.query(`DROP DATABASE ${name}`);
    await admin.query(`DROP ROLE ${owner}, ${worker}, ${operator}, ${runtime}`);
  } finally {
    await admin.end();
  }
});

async function seed(count = 1) {
  const ids: string[] = [];
  for (let n = 0; n < count; n += 1) {
    const attempt = randomUUID(),
      eventId = randomUUID(),
      submissionId = randomUUID();
    const event = submissionEvent({
      eventId,
      attemptId: attempt,
      examId,
      publishedVersionId: versionId,
      submissionId,
      occurredAt: "2026-10-08T00:00:00.000Z",
      deadline: "2026-10-08T01:00:00.000Z",
      expired: false,
      submissionKind: "MANUAL",
      correlationId: randomUUID(),
      causationId: randomUUID(),
    });
    await fixture.query(
      `
      INSERT INTO assessment.attempts (
        id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
        submission_id, submission_event_id, submission_kind, revision
      )
      VALUES
        ($1, $2, $3, $4, 'SUBMITTED', '2026-10-07T23:00:00Z', '2026-10-08T01:00:00Z',
        '2026-10-08T00:00:00Z', $5, $6, 'MANUAL', 2)
    `,
      [attempt, userId, examId, versionId, submissionId, eventId],
    );
    await fixture.query(
      `
      INSERT INTO platform.outbox (event_id, aggregate_id, type, payload, correlation_id, causation_id)
      VALUES
        ($1, $2, 'attempt.submitted.v1', $3::jsonb, $4, $5)
    `,
      [eventId, attempt, JSON.stringify(event), event.correlationId, event.causationId],
    );
    ids.push(eventId);
  }
  return ids;
}

async function state(id: string) {
  return (
    await fixture.query(
      `
    SELECT
      payload,
      attempts,
      available_at,
      lease_token,
      lease_until,
      delivered_at,
      parked_at,
      failure_code,
      created_at
    FROM
      platform.outbox
    WHERE
      event_id = $1
  `,
      [id],
    )
  ).rows[0];
}
async function expire(id: string) {
  await fixture.query(
    `
    UPDATE platform.outbox
    SET
      lease_until = clock_timestamp() - interval '1 second'
    WHERE
      event_id = $1
  `,
    [id],
  );
}

describe("Assessment durable dispatch", () => {
  it("atomically partitions a bounded batch between two workers and skips row locks", async () => {
    await seed(5);
    const c = await fixture.connect();
    await c.query("BEGIN");
    const held = (
      await c.query(`
      SELECT
        event_id
      FROM
        platform.outbox
      ORDER BY
        available_at, created_at, event_id
      LIMIT
        1
      FOR UPDATE
    `)
    ).rows[0].event_id;
    try {
      const [left, right] = await Promise.all([repo.claim(2, 15000), other.claim(2, 15000)]);
      expect(left).toHaveLength(2);
      expect(right).toHaveLength(2);
      const unique = new Set([...left, ...right].map((row) => row.eventId));
      expect(unique.size).toBe(4);
      expect(unique.has(held)).toBe(false);
      expect((await repo.claim(2, 15000)).length).toBe(0);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect((await repo.claim(2, 15000)).length).toBe(1);
  });
  it("recovers after crash with a new token and fences every stale mutation", async () => {
    const [id] = await seed();
    const [old] = await repo.claim(1, 15000);
    await expire(id!);
    const [fresh] = await other.claim(1, 15000);
    expect(fresh!.token).not.toBe(old!.token);
    expect(fresh!.attempts).toBe(2);
    expect(await repo.delivered(old!)).toBe(false);
    expect(await repo.failed(old!, "QUEUE_UNAVAILABLE", 1000, false)).toBe(false);
    expect(await other.delivered(fresh!)).toBe(true);
    expect(await other.delivered(fresh!)).toBe(false);
    expect((await state(id!)).delivered_at).toBeInstanceOf(Date);
  });
  it("rejects an ACK after lease expiry even before another worker claims", async () => {
    const [id] = await seed();
    const [row] = await repo.claim(1, 15000);
    await expire(id!);
    expect(await repo.delivered(row!)).toBe(false);
    expect(await repo.failed(row!, "QUEUE_UNAVAILABLE", 10, false)).toBe(false);
    expect((await state(id!)).delivered_at).toBeNull();
  });
  it("rejects a claim inside an ambient UoW before any broker send can occur", async () => {
    const [id] = await seed();
    await expect(db.transaction(() => repo.claim(1, 15000))).rejects.toMatchObject({
      code: "DB_TRANSACTION_FORBIDDEN",
    });
    expect(await state(id!)).toMatchObject({ attempts: 0, lease_token: null });
  });
  it.each(["delivered", "failed"] as const)(
    "rechecks lease after a %s row-lock wait",
    async (operation) => {
      const [id] = await seed();
      const [row] = await repo.claim(1, 15000);
      await fixture.query(
        `
      UPDATE platform.outbox
      SET
        lease_until = clock_timestamp() + interval '150 milliseconds'
      WHERE
        event_id = $1
    `,
        [id],
      );
      const c = await fixture.connect();
      await c.query("BEGIN");
      await c.query(
        `
      SELECT
        event_id
      FROM
        platform.outbox
      WHERE
        event_id = $1
      FOR UPDATE
    `,
        [id],
      );
      const result =
        operation === "delivered"
          ? repo.delivered(row!)
          : repo.failed(row!, "QUEUE_UNAVAILABLE", 1000, false);
      await new Promise((done) => setTimeout(done, 200));
      await c.query("COMMIT");
      c.release();
      expect(await result).toBe(false);
      expect(await state(id!)).toMatchObject({ delivered_at: null, failure_code: null });
    },
  );
  it("publishes with no open DB transaction and recovers duplicate publication after ACK crash", async () => {
    const [id] = await seed();
    const [old] = await repo.claim(1, 15000);
    const bodies = [JSON.stringify(old!.payload)]; // transport ACK, then process crash before mark
    await expire(id!);
    const publisher = new SubmissionPublisher(
      other,
      {
        publish: async (body) => {
          const transactions = (
            await admin.query(
              `
        SELECT
          count(*)::integer AS n
        FROM
          pg_stat_activity
        WHERE
          datname = $1
        AND usename = $2
        AND xact_start IS NOT NULL
      `,
              [name, worker],
            )
          ).rows[0].n;
          expect(transactions).toBe(0);
          bodies.push(body);
        },
      },
      {
        concurrency: 1,
        leaseMs: 15000,
        maxAttempts: 3,
        maxAgeMs: 86400000,
        backoffInitialMs: 1000,
        backoffMaxMs: 30000,
      },
    );
    expect((await publisher.runOnce()).delivered).toBe(1);
    expect(JSON.parse(bodies[0]!)).toEqual(JSON.parse(bodies[1]!));
    expect((await publisher.runOnce()).claimed).toBe(0);
    expect((await state(id!)).payload).toEqual(old!.payload);
  });
  it("persists retry eligibility in DB across recomposition and parks the final crashed attempt", async () => {
    const [id] = await seed();
    const [row] = await repo.claim(1, 15000);
    expect(await repo.failed(row!, "QUEUE_UNAVAILABLE", 60000, false)).toBe(true);
    expect(await new PostgresSubmissionDispatch(second).claim(1, 15000)).toEqual([]);
    await fixture.query(
      `
      UPDATE platform.outbox
      SET
        available_at = clock_timestamp() - interval '1 second', attempts = 3
      WHERE
        event_id = $1
    `,
      [id],
    );
    const publisher = new SubmissionPublisher(
      other,
      {
        publish: async () => {
          throw new Error("Must not send");
        },
      },
      {
        concurrency: 1,
        leaseMs: 15000,
        maxAttempts: 3,
        maxAgeMs: 86400000,
        backoffInitialMs: 1000,
        backoffMaxMs: 30000,
      },
    );
    expect((await publisher.runOnce()).parked).toBe(1);
    expect(await state(id!)).toMatchObject({
      failure_code: "RETRY_EXHAUSTED",
      lease_token: null,
      parked_at: expect.any(Date),
    });
  });
  it("replays only parked records atomically with audit and unchanged event/body/time", async () => {
    const [id] = await seed();
    const [row] = await repo.claim(1, 15000);
    await repo.failed(row!, "EVENT_TOO_OLD", 0, true);
    // Old original time must remain for true oldest-age metrics after replay.
    await fixture.query(
      `
      UPDATE platform.outbox
      SET
        created_at = clock_timestamp() - interval '2 days'
      WHERE
        event_id = $1
    `,
      [id],
    );
    const before = await state(id!);
    const correlation = randomUUID();
    await new PostgresSubmissionDispatch(opDb).replay(
      id!,
      "fixture operator",
      "Dependency repaired",
      correlation,
    );
    const after = await state(id!);
    expect(after).toMatchObject({
      payload: before.payload,
      created_at: before.created_at,
      attempts: 0,
      parked_at: null,
      lease_token: null,
      delivered_at: null,
    });
    const audit = (
      await fixture.query(
        `
      SELECT
        operator_identity,
        resource_id,
        reason
      FROM
        platform.audit_logs
      WHERE
        correlation_id = $1 AND action = 'assessment.outbox.replay'
    `,
        [correlation],
      )
    ).rows;
    expect(audit).toEqual([
      {
        operator_identity: `${operator}:fixture operator`,
        resource_id: id,
        reason: "Dependency repaired",
      },
    ]);
    const [replayed] = await repo.claim(1, 15000);
    expect(replayed!.ageMs).toBeLessThan(10000);
    expect((await repo.backlog()).oldestPendingAgeMs).toBeGreaterThan(86400000);
    await expect(
      new PostgresSubmissionDispatch(opDb).replay(id!, "operator", "Repeat", randomUUID()),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("rolls replay state back if audit persistence fails", async () => {
    const [id] = await seed();
    const [row] = await repo.claim(1, 15000);
    await repo.failed(row!, "QUEUE_REJECTED", 0, true);
    const before = await state(id!);
    await fixture.query(`
      CREATE FUNCTION public.dispatch_audit_poison() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'assessment.outbox.replay' THEN
          RAISE EXCEPTION 'fixture only' USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
      END
      $$
    `);
    await fixture.query(`
      CREATE TRIGGER dispatch_audit_poison BEFORE INSERT ON platform.audit_logs
      FOR EACH ROW EXECUTE FUNCTION public.dispatch_audit_poison()
    `);
    try {
      await expect(
        new PostgresSubmissionDispatch(opDb).replay(id!, "operator", "Reason", randomUUID()),
      ).rejects.toMatchObject({ code: "P0001" });
      expect(await state(id!)).toEqual(before);
    } finally {
      await fixture.query("DROP TRIGGER dispatch_audit_poison ON platform.audit_logs");
      await fixture.query("DROP FUNCTION public.dispatch_audit_poison()");
    }
  });
  it.each([
    "identity.sessions",
    "identity.users",
    "catalog.published_answer_keys",
    "assessment.answers",
  ])("denies worker access to %s", async (table) => {
    await expect(db.query("diagnostic", `SELECT * FROM ${table} LIMIT 1`)).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("denies runtime dispatch/replay, worker identity mutation and direct operator update", async () => {
    const [id] = await seed();
    for (const target of [db, apiDb]) {
      await expect(
        new PostgresSubmissionDispatch(target).replay(id!, "operator", "Reason", randomUUID()),
      ).rejects.toMatchObject({ code: "42501" });
    }
    await expect(
      apiDb.query(
        "diagnostic",
        `
      UPDATE platform.outbox
      SET
        delivered_at = clock_timestamp()
      WHERE
        event_id = $1
    `,
        [id],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    for (const target of [db, opDb]) {
      await expect(
        target.query(
          "diagnostic",
          `
        UPDATE platform.outbox
        SET
          payload = '{}'::jsonb
        WHERE
          event_id = $1
      `,
          [id],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    }
  });
  it("measures pending/parked independently from ready eligibility", async () => {
    const [a, b] = await seed(2);
    const rows = await repo.claim(2, 15000);
    await repo.failed(
      rows.find((r) => r.eventId === a)!,
      "INVALID_EVENT",
      0,
      true,
    );
    await repo.failed(
      rows.find((r) => r.eventId === b)!,
      "QUEUE_UNAVAILABLE",
      60000,
      false,
    );
    expect(await repo.backlog()).toMatchObject({ pending: 1, parked: 1 });
    expect(await repo.claim(2, 15000)).toEqual([]);
  });
  it("records a bounded local publication diagnostic, without an AWS capacity/cost claim", async () => {
    const size = 32;
    await seed(size);
    observations.length = 0;
    const durations: number[] = [];
    let published = 0;
    const start = performance.now();
    const publisher = new SubmissionPublisher(
      repo,
      {
        publish: async () => {
          published += 1;
        },
      },
      {
        concurrency: 4,
        leaseMs: 15000,
        maxAttempts: 3,
        maxAgeMs: 86400000,
        backoffInitialMs: 1000,
        backoffMaxMs: 30000,
      },
    );
    for (let cycle = 0; cycle < size / 4; cycle += 1) {
      const t = performance.now();
      const result = await publisher.runOnce();
      expect(result.delivered).toBe(4);
      durations.push(performance.now() - t);
    }
    expect(published).toBe(size);
    expect((await repo.backlog()).pending).toBe(0);
    if (process.env.DISPATCH_EVIDENCE_FILE)
      await writeFile(
        process.env.DISPATCH_EVIDENCE_FILE,
        JSON.stringify(
          {
            kind: "local-postgres-no-network-queue-diagnostic",
            jobs: size,
            concurrency: 4,
            pool: 2,
            elapsedMs: performance.now() - start,
            cycleDurationMs: durations,
            queryCount: observations.filter((value) => value.kind === "query").length,
            queriesByOperation: Object.fromEntries(
              [...new Set(observations.map((value) => value.operation))]
                .filter((value) => value !== undefined)
                .map((operation) => [
                  operation,
                  observations.filter(
                    (value) => value.kind === "query" && value.operation === operation,
                  ).length,
                ]),
            ),
            transactionDurationMs: observations
              .filter((value) => value.kind === "transaction")
              .map((value) => value.durationMs),
            poolWaitMs: observations
              .filter((value) => value.kind === "acquire")
              .map((value) => value.durationMs),
            awsMeasured: false,
            sustainableCapacity: null,
            cost: null,
          },
          null,
          2,
        ) + "\n",
      );
  });
  it("serves health and drains an admitted SDK send before closing DB on repeated stop", async () => {
    const [id] = await seed();
    const previous = {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
    };
    process.env.AWS_ACCESS_KEY_ID = "LOCAL_FIXTURE_ONLY";
    process.env.AWS_SECRET_ACCESS_KEY = "local-fixture-not-a-secret";
    let release!: () => void;
    let seen!: () => void;
    const received = new Promise<void>((done) => {
      seen = done;
    });
    const broker = createServer(async (request, response) => {
      let raw = "";
      for await (const chunk of request) raw += chunk.toString();
      const body = JSON.parse(raw).MessageBody;
      release = () => {
        if (response.writableEnded) return;
        response.writeHead(200, { "content-type": "application/x-amz-json-1.0" });
        response.end(
          JSON.stringify({
            MessageId: "local",
            MD5OfMessageBody: createHash("md5").update(body).digest("hex"),
          }),
        );
      };
      seen();
    });
    await new Promise<void>((done) => broker.listen(0, "127.0.0.1", done));
    const address = broker.address();
    if (!address || typeof address === "string") throw new Error("Broker fixture missing");
    const endpoint = `http://127.0.0.1:${address.port}`;
    let handle: Awaited<ReturnType<typeof startSubmissionPublisher>> | undefined;
    const logs: Record<string, unknown>[] = [];
    try {
      handle = await startSubmissionPublisher(
        {
          NODE_ENV: "test",
          DATABASE_URL: config(worker).url,
          DB_POOL_MAX: "2",
          DB_SSL: "false",
          AWS_REGION: "us-east-1",
          SQS_ENDPOINT: endpoint,
          SUBMISSION_QUEUE_URL: `${endpoint}/123456789012/submissions`,
          DISPATCH_HEALTH_PORT: "0",
          DISPATCH_TIMEOUT_MS: "1000",
        },
        (event) => {
          logs.push(event);
        },
      );
      await received;
      const stopping = handle.stop();
      const again = handle.stop();
      expect((await fetch(`http://127.0.0.1:${handle.port}/ready`)).status).toBe(503);
      expect((await fetch(`http://127.0.0.1:${handle.port}/live`)).status).toBe(200);
      expect((await state(id!)).delivered_at).toBeNull();
      release();
      await Promise.all([stopping, again]);
      expect((await state(id!)).delivered_at).toBeInstanceOf(Date);
      expect(JSON.stringify(logs)).not.toContain("MessageBody");
      expect(JSON.stringify(logs)).not.toContain("LOCAL_FIXTURE_ONLY");
    } finally {
      release?.();
      await handle?.stop();
      await new Promise<void>((done) => broker.close(() => done()));
      if (previous.key === undefined) delete process.env.AWS_ACCESS_KEY_ID;
      else process.env.AWS_ACCESS_KEY_ID = previous.key;
      if (previous.secret === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;
      else process.env.AWS_SECRET_ACCESS_KEY = previous.secret;
    }
  });
  it("boots the compiled publisher and exits cleanly on SIGTERM", async () => {
    const child = spawn(process.execPath, ["dist/workers/outbox/submission.main.js"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: config(worker).url,
        DB_POOL_MAX: "2",
        DB_SSL: "false",
        AWS_REGION: "us-east-1",
        SQS_ENDPOINT: "",
        SUBMISSION_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/123456789012/submissions",
        DISPATCH_HEALTH_PORT: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let errors = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      errors += chunk.toString();
    });
    const exited = new Promise<{ code: number | null; signal: string | null }>((done) =>
      child.once("exit", (code, signal) => done({ code, signal })),
    );
    try {
      for (let n = 0; n < 100 && !output.includes('"submission.publisher.signals"'); n += 1) {
        await new Promise((done) => setTimeout(done, 20));
      }
      expect(output).toContain('"submission.publisher.signals"');
      const started = output
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .find((event) => event.event === "submission.publisher.started");
      expect(started.port).toBeGreaterThan(0);
      for (let n = 0; n < 50; n += 1) {
        if ((await fetch(`http://127.0.0.1:${started.port}/ready`)).status === 200) break;
        await new Promise((done) => setTimeout(done, 20));
      }
      expect((await fetch(`http://127.0.0.1:${started.port}/ready`)).status).toBe(200);
      child.kill("SIGTERM");
      expect(await exited).toEqual({ code: 0, signal: null });
      expect(errors).toBe("");
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await exited;
    }
  });
});
