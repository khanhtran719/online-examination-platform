import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { startGradingWorker } from "../../src/workers/sqs/grading.main";
import {
  createGradingRecovery,
  createGradingReplay,
  createGradingConsumer,
  createSubmissionPublisher,
} from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { PostgresGradingRepository } from "../../src/modules/assessment/infrastructure/persistence/postgres-grading.repository";
import { PostgresCatalogQuery } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { GradingRecovery } from "../../src/modules/assessment/application/services/grading-recovery";
import { PostgresGradingFailureRepository } from "../../src/modules/assessment/infrastructure/persistence/postgres-grading-failure.repository";
import { GradingConsumer } from "../../src/modules/assessment/application/services/grading-consumer";
import {
  submissionEvent,
  SubmittedEvent,
} from "../../src/modules/assessment/domain/assessment-policy";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port === "55432")
  throw new Error("Disposable administrator required");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const name = `grading_${suffix}`,
  owner = `grading_ddl_${suffix}`,
  worker = `grading_worker_${suffix}`,
  recoveryLogin = `grading_recovery_${suffix}`,
  operatorLogin = `grading_operator_${suffix}`,
  dispatchLogin = `grading_dispatch_${suffix}`;
const password = randomUUID(),
  base = new URL(adminUrl);
base.pathname = `/${name}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
let fixture: Pool, db: PostgresDatabase, second: PostgresDatabase;
let consumer: GradingConsumer, other: GradingConsumer;
let recoveryDb: PostgresDatabase, operatorDb: PostgresDatabase, dispatchDb: PostgresDatabase;
const observations: DatabaseObservation[] = [];
const examId = randomUUID(),
  versionId = randomUUID(),
  userId = randomUUID();
const sections = [randomUUID(), randomUUID()];
const questions = [randomUUID(), randomUUID(), randomUUID()];
const options = questions.map(() => [randomUUID(), randomUUID(), randomUUID()]);
function config(login: string) {
  const url = new URL(base);
  url.username = login;
  url.password = password;
  return databaseConfig({ NODE_ENV: "test", DATABASE_URL: url.toString(), DB_POOL_MAX: "2" });
}
function compose(database: PostgresDatabase) {
  const catalog = new PostgresCatalogQuery(database);
  return new GradingConsumer(
    new PostgresGradingRepository(database),
    {
      getScoringSnapshot: async (id) => {
        const items = await catalog.scoring(id);
        if (!items) throw new Error("Snapshot missing");
        return items;
      },
    },
    database,
    new GradingRecovery(new PostgresGradingFailureRepository(database), database),
  );
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${worker} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${recoveryLogin} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${operatorLogin} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${dispatchLogin} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_grading_recovery TO ${recoveryLogin}`);
  await admin.query(`GRANT examination_operator TO ${operatorLogin}`);
  await admin.query(`GRANT examination_dispatch_worker TO ${dispatchLogin}`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_grading_worker TO ${worker}`);
  await migrate(
    config(owner),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: base.toString(), max: 3 });
  db = new PostgresDatabase(config(worker), (v) => observations.push(v));
  second = new PostgresDatabase(config(worker));
  recoveryDb = new PostgresDatabase(config(recoveryLogin));
  operatorDb = new PostgresDatabase(config(operatorLogin));
  dispatchDb = new PostgresDatabase(config(dispatchLogin));
  consumer = compose(db);
  other = compose(second);
  await fixture.query(
    `
    INSERT INTO
      identity.users (
        id,
        email,
        password_hash
      )
    VALUES
      (
        $1,
        'grade@example.test',
        'fixture-only'
      )
    `,
    [userId],
  );
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `
      INSERT INTO
        catalog.exams (
          id,
          title,
          category,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at
        )
      VALUES
        (
          $1,
          'Grading',
          'IT_CERTIFICATION',
          3600,
          10,
          '2026-10-08T00:00:00Z',
          '2026-10-10T00:00:00Z'
        )
      `,
      [examId],
    );
    await c.query(
      `
      INSERT INTO
        catalog.published_versions (
          id,
          exam_id,
          version,
          title,
          description,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at,
          display_timezone,
          explanation_policy,
          category,
          published_by
        )
      VALUES
        (
          $1,
          $2,
          1,
          'Grading',
          '',
          3600,
          10,
          '2026-10-08T00:00:00Z',
          '2026-10-10T00:00:00Z',
          'Asia/Ho_Chi_Minh',
          'NEVER',
          'IT_CERTIFICATION',
          $3
        )
      `,
      [versionId, examId, userId],
    );
    for (let i = 0; i < sections.length; i++)
      await c.query(
        `
        INSERT INTO
          catalog.published_sections (
            version_id,
            id,
            title,
            position
          )
        VALUES
          (
            $1,
            $2,
            'Section',
            $3
          )
        `,
        [versionId, sections[i], i + 1],
      );
    for (let i = 0; i < questions.length; i++) {
      await c.query(
        `
        INSERT INTO
          catalog.published_questions (
            version_id,
            id,
            section_id,
            source_question_id,
            source_revision,
            type,
            prompt,
            explanation,
            points,
            position
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            1,
            $5,
            'Q',
            'Hidden',
            $6,
            $7
          )
        `,
        [
          versionId,
          questions[i],
          sections[i === 2 ? 1 : 0],
          randomUUID(),
          ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"][i],
          [5, 7, 3][i],
          i + 1,
        ],
      );
      for (let o = 0; o < (i === 1 ? 3 : 2); o++)
        await c.query(
          `
          INSERT INTO
            catalog.published_options (
              version_id,
              question_id,
              id,
              position,
              text
            )
          VALUES
            (
              $1,
              $2,
              $3,
              $4,
              'Option'
            )
          `,
          [versionId, questions[i], options[i]![o], o + 1],
        );
      for (const o of i === 1 ? [0, 2] : [0])
        await c.query(
          `
          INSERT INTO
            catalog.published_answer_keys (
              version_id,
              question_id,
              option_id
            )
          VALUES
            (
              $1,
              $2,
              $3
            )
          `,
          [versionId, questions[i], options[i]![o]],
        );
    }
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}, 60000);
beforeEach(async () => {
  await fixture.query(
    "TRUNCATE assessment.attempts, assessment.question_statistics, assessment.option_statistics, platform.invalid_submission_messages CASCADE",
  );
  observations.length = 0;
});
afterAll(async () => {
  await Promise.all([
    db?.close(),
    second?.close(),
    recoveryDb?.close(),
    operatorDb?.close(),
    dispatchDb?.close(),
  ]);
  await fixture?.end();
  try {
    let remaining = 1;
    for (let i = 0; i < 100 && remaining; i++) {
      remaining = Number(
        (
          await admin.query(
            `
            SELECT
              count (*)::int AS n
            FROM
              pg_stat_activity
            WHERE
              datname = $1
            `,
            [name],
          )
        ).rows[0].n,
      );
      if (remaining) await new Promise((done) => setTimeout(done, 10));
    }
    expect(remaining).toBe(0);
    await admin.query(`DROP DATABASE ${name}`);
    await admin.query(
      `DROP ROLE ${owner}, ${worker}, ${recoveryLogin}, ${operatorLogin}, ${dispatchLogin}`,
    );
  } finally {
    await admin.end();
  }
});
async function seed(
  input: { time?: string; expired?: boolean; id?: string; selections?: number[][] } = {},
): Promise<SubmittedEvent> {
  const event = submissionEvent({
    eventId: randomUUID(),
    attemptId: input.id ?? randomUUID(),
    examId,
    publishedVersionId: versionId,
    submissionId: randomUUID(),
    occurredAt: input.time ?? "2026-10-09T00:01:00.000Z",
    deadline: "2026-10-09T01:00:00.000Z",
    expired: input.expired ?? false,
    submissionKind: input.expired ? "DEADLINE" : "MANUAL",
    correlationId: randomUUID(),
    causationId: randomUUID(),
  });
  await fixture.query(
    `
    INSERT INTO
      assessment.attempts (
        id,
        user_id,
        exam_id,
        version_id,
        status,
        started_at,
        deadline,
        submitted_at,
        submission_id,
        submission_event_id,
        submission_kind,
        expired,
        revision
      )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        '2026-10-09T00:00:00Z',
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        2
      )
    `,
    [
      event.aggregateId,
      userId,
      examId,
      versionId,
      input.expired ? "EXPIRED" : "SUBMITTED",
      event.payload.deadline,
      event.occurredAt,
      event.payload.submissionId,
      event.eventId,
      event.payload.submissionKind,
      event.payload.expired,
    ],
  );
  for (let i = 0; i < (input.selections ?? [[0], [0, 2]]).length; i++) {
    await fixture.query(
      `
      INSERT INTO
        assessment.answers (
          attempt_id,
          version_id,
          question_id,
          version,
          marked
        )
      VALUES
        (
          $1,
          $2,
          $3,
          1,
          true
        )
      `,
      [event.aggregateId, versionId, questions[i]],
    );
    for (const o of (input.selections ?? [[0], [0, 2]])[i]!)
      await fixture.query(
        `
        INSERT INTO
          assessment.answer_selections (
            attempt_id,
            version_id,
            question_id,
            option_id
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4
          )
        `,
        [event.aggregateId, versionId, questions[i], options[i]![o]],
      );
  }
  return event;
}
async function counts() {
  return (
    await fixture.query(`
                        SELECT
                          (
                            SELECT
                              count (*)::int
                            FROM
                              assessment.results
                          ) AS results,
                          (
                            SELECT
                              count (*)::int
                            FROM
                              platform.inbox
                          ) AS inbox,
                          (
                            SELECT
                              coalesce (
                                sum (completed_count),
                                0
                              )::int
                            FROM
                              assessment.question_statistics
                          ) AS contributions,
                          (
                            SELECT
                              count (*)::int
                            FROM
                              assessment.result_sections
                          ) AS sections,
                          (
                            SELECT
                              count (*)::int
                            FROM
                              assessment.result_questions
                          ) AS questions
                        `)
  ).rows[0];
}
describe("restricted PostgreSQL grading transaction", () => {
  it("public inbound rejects invalid JSON and oversized messages with digest-only quarantine", async () => {
    const inbound = createGradingConsumer(db, createScoringCatalog(db));
    for (const body of ["{broken", "x".repeat(16385)])
      expect((await inbound.consume(body)).outcome).toBe("quarantined");
    expect(
      (
        await fixture.query(`
                            SELECT
                              count (*)::int AS n
                            FROM
                              platform.invalid_submission_messages
                            `)
      ).rows[0].n,
    ).toBe(2);
  });
  it("worker SDK loses Delete ACK after commit, redelivers and drains without duplicate effects", async () => {
    const e = await seed();
    const raw = JSON.stringify(e);
    const previous = {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      session: process.env.AWS_SESSION_TOKEN,
    };
    process.env.AWS_ACCESS_KEY_ID = "local-fixture";
    process.env.AWS_SECRET_ACCESS_KEY = "local-not-a-secret";
    delete process.env.AWS_SESSION_TOKEN;
    let receives = 0,
      deletes = 0,
      ackAfterCommit = true;
    const logs: Record<string, unknown>[] = [];
    const broker = createServer(async (req, res) => {
      let body = "";
      for await (const part of req) body += part;
      const target = String(req.headers["x-amz-target"]),
        input = JSON.parse(body);
      res.setHeader("content-type", "application/x-amz-json-1.0");
      if (target.endsWith("GetQueueAttributes"))
        res.end(
          JSON.stringify({
            Attributes: {
              QueueArn: "arn:aws:sqs:us-east-1:123456789012:grading",
              SqsManagedSseEnabled: "true",
              RedrivePolicy: JSON.stringify({
                deadLetterTargetArn: "arn:aws:sqs:us-east-1:123456789012:grading-dlq",
                maxReceiveCount: 5,
              }),
            },
          }),
        );
      else if (target.endsWith("ReceiveMessage")) {
        receives++;
        res.end(
          JSON.stringify({
            Messages:
              receives <= 2
                ? [
                    {
                      Body: raw,
                      ReceiptHandle: `handle-${receives}`,
                      MessageId: "broker-id",
                      MD5OfBody: createHash("md5").update(raw).digest("hex"),
                    },
                  ]
                : [],
          }),
        );
      } else if (target.endsWith("DeleteMessage")) {
        deletes++;
        ackAfterCommit &&= (await counts()).results === 1 && (await counts()).inbox === 1;
        expect(input.ReceiptHandle).toBe(`handle-${deletes}`);
        if (deletes === 1) {
          res.statusCode = 403;
          res.end(JSON.stringify({ __type: "AccessDenied", message: "simulated lost ACK" }));
        } else res.end("{}");
      } else res.end("{}");
    });
    await new Promise<void>((done) => broker.listen(0, "127.0.0.1", done));
    const address = broker.address();
    if (!address || typeof address === "string") throw new Error("Missing broker");
    const endpoint = `http://127.0.0.1:${address.port}`;
    let handle: Awaited<ReturnType<typeof startGradingWorker>> | undefined;
    try {
      const workerEnv = {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: config(worker).url,
        DB_POOL_MAX: "2",
        AWS_REGION: "us-east-1",
        SQS_ENDPOINT: endpoint,
        SUBMISSION_QUEUE_URL: `${endpoint}/123456789012/grading`,
        GRADING_DLQ_ARN: "arn:aws:sqs:us-east-1:123456789012:grading-dlq",
        GRADING_HEALTH_PORT: "0",
        GRADING_WAIT_SECONDS: "0",
        GRADING_TIMEOUT_MS: "2000",
      };
      handle = await startGradingWorker(workerEnv, (value) => logs.push(value));
      for (let i = 0; i < 100 && deletes < 2; i++)
        await new Promise((done) => setTimeout(done, 20));
      expect(deletes).toBe(2);
      expect(ackAfterCommit).toBe(true);
      expect((await fetch(`http://127.0.0.1:${handle.port}/live`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${handle.port}/other`)).status).toBe(404);
      await Promise.all([handle.stop(), handle.stop()]);
      handle = undefined;
      expect(await counts()).toEqual({
        results: 1,
        inbox: 1,
        contributions: 3,
        sections: 2,
        questions: 3,
      });
      expect(JSON.stringify(logs)).not.toContain("handle-");
      expect(JSON.stringify(logs)).not.toContain("submissionId");
      const child = spawn(process.execPath, ["dist/workers/sqs/grading.main.js"], {
        env: workerEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (part) => {
        output += part;
      });
      child.stderr.on("data", (part) => {
        output += part;
      });
      const exit = new Promise<number | null>((resolve) => child.once("exit", resolve));
      try {
        for (let i = 0; i < 100 && !output.includes("grading.worker.signals"); i++)
          await new Promise((done) => setTimeout(done, 20));
        expect(output).toContain("grading.worker.signals");
        child.kill("SIGTERM");
        expect(await exit).toBe(0);
        expect(output).toContain("grading.metrics");
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGTERM");
          await exit;
        }
      }
    } finally {
      await handle?.stop();
      await new Promise<void>((done) => broker.close(() => done()));
      for (const [key, value] of Object.entries({
        AWS_ACCESS_KEY_ID: previous.key,
        AWS_SECRET_ACCESS_KEY: previous.secret,
        AWS_SESSION_TOKEN: previous.session,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  it("persists result, breakdown, statistics and inbox before COMPLETED becomes durable", async () => {
    const event = await seed();
    expect(await consumer.consume(event, digest(event))).toBe("completed");
    expect(await counts()).toEqual({
      results: 1,
      inbox: 1,
      contributions: 3,
      sections: 2,
      questions: 3,
    });
    const result = (
      await fixture.query(`
                          SELECT
                            earned_points,
                            possible_points,
                            percentage_basis_points,
                            correct_count,
                            question_count
                          FROM
                            assessment.results
                          `)
    ).rows[0];
    expect(result).toEqual({
      earned_points: 12,
      possible_points: 15,
      percentage_basis_points: 8000,
      correct_count: 2,
      question_count: 3,
    });
    expect(
      (
        await fixture.query(`
                            SELECT
                              status,
                              replay_pending,
                              revision
                            FROM
                              assessment.attempts
                            `)
      ).rows[0],
    ).toEqual({ status: "COMPLETED", replay_pending: false, revision: 3 });
    expect(
      (
        await fixture.query(`
                            SELECT
                              sum (selected_count)::int AS n
                            FROM
                              assessment.option_statistics
                            `)
      ).rows[0].n,
    ).toBe(3);
    expect(observations.filter((v) => v.kind === "query")).toHaveLength(15);
  });
  it("serializes two consumers and duplicate/alternate-ID deliveries without repeated projections", async () => {
    const event = await seed();
    expect(
      (
        await Promise.all([
          consumer.consume(event, digest(event)),
          other.consume(event, digest(event)),
        ])
      ).sort(),
    ).toEqual(["completed", "duplicate"]);
    const alternate = { ...event, eventId: randomUUID() };
    expect(await other.consume(alternate, digest(alternate))).toBe("duplicate");
    expect(await counts()).toEqual({
      results: 1,
      inbox: 2,
      contributions: 3,
      sections: 2,
      questions: 3,
    });
  });
  it("rolls all effects back when statistics persistence fails, then redelivery succeeds", async () => {
    const event = await seed();
    await fixture.query(
      `CREATE FUNCTION public.grade_poison() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture' USING ERRCODE = 'P0001'; END $$`,
    );
    await fixture.query(
      "CREATE TRIGGER grade_poison BEFORE INSERT ON assessment.question_statistics FOR EACH ROW EXECUTE FUNCTION public.grade_poison()",
    );
    try {
      await expect(consumer.consume(event, digest(event))).rejects.toMatchObject({ code: "P0001" });
      expect(await counts()).toEqual({
        results: 0,
        inbox: 0,
        contributions: 0,
        sections: 0,
        questions: 0,
      });
      expect(
        (
          await fixture.query(`
                              SELECT
                                status
                              FROM
                                assessment.attempts
                              `)
        ).rows[0].status,
      ).toBe("SUBMITTED");
    } finally {
      await fixture.query("DROP TRIGGER grade_poison ON assessment.question_statistics");
      await fixture.query("DROP FUNCTION public.grade_poison()");
    }
    expect(await other.consume(event, digest(event))).toBe("completed");
  });
  it("uses earned DESC, submitted ASC, UUID ASC regardless of completion order", async () => {
    const late = await seed({ time: "2026-10-09T00:02:00.000Z" });
    const high = await seed({ id: "ffffffff-ffff-4fff-8fff-ffffffffffff" });
    const low = await seed({ id: "11111111-1111-4111-8111-111111111111" });
    const wrong = await seed({ selections: [[1], [0]] });
    for (const e of [late, high, low, wrong]) await consumer.consume(e, digest(e));
    expect(
      (
        await fixture.query(`
                            SELECT
                              attempt_id
                            FROM
                              assessment.leaderboard_entries
                            `)
      ).rows[0].attempt_id,
    ).toBe(low.aggregateId);
    expect((await counts()).contributions).toBe(12);
  });
  it("rolls back even when deferred validation fails at COMMIT after inbox insertion", async () => {
    const e = await seed();
    await fixture.query(
      `CREATE FUNCTION public.grading_commit_poison() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture' USING ERRCODE = 'P0001'; END $$`,
    );
    await fixture.query(
      "CREATE CONSTRAINT TRIGGER grading_commit_poison AFTER INSERT ON platform.inbox DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.grading_commit_poison()",
    );
    try {
      await expect(consumer.consume(e, digest(e))).rejects.toMatchObject({ code: "P0001" });
      expect(await counts()).toEqual({
        results: 0,
        inbox: 0,
        contributions: 0,
        sections: 0,
        questions: 0,
      });
      expect(
        (
          await fixture.query(`
                              SELECT
                                status
                              FROM
                                assessment.attempts
                              `)
        ).rows[0].status,
      ).toBe("SUBMITTED");
    } finally {
      await fixture.query("DROP TRIGGER grading_commit_poison ON platform.inbox");
      await fixture.query("DROP FUNCTION public.grading_commit_poison()");
    }
    expect(await other.consume(e, digest(e))).toBe("completed");
  });
  it("serializes projection contention across different attempts without lost counters", async () => {
    const a = await seed({ time: "2026-10-09T00:02:00.000Z" }),
      b = await seed();
    expect(
      await Promise.all([consumer.consume(a, digest(a)), other.consume(b, digest(b))]),
    ).toEqual(["completed", "completed"]);
    expect((await counts()).contributions).toBe(6);
    expect(
      (
        await fixture.query(`
                            SELECT
                              attempt_id
                            FROM
                              assessment.leaderboard_entries
                            `)
      ).rows[0].attempt_id,
    ).toBe(b.aggregateId);
  });
  it("does not reinterpret an inbox event already belonging to another completed attempt", async () => {
    const a = await seed(),
      b = await seed();
    for (const e of [a, b]) await consumer.consume(e, digest(e));
    const collision = { ...a, eventId: b.eventId };
    await expect(other.consume(collision, digest(collision))).rejects.toThrow(
      "INBOX_IDENTITY_CONFLICT",
    );
    expect(await counts()).toEqual({
      results: 2,
      inbox: 2,
      contributions: 6,
      sections: 4,
      questions: 6,
    });
  });
  it("requires durable replay authorization and clears it only when a FAILED attempt completes", async () => {
    const e = await seed();
    await fixture.query(
      `
      UPDATE assessment.attempts
      SET
        status = 'FAILED',
        failure_code = 'FIXTURE_FAILURE'
      WHERE
        id = $1
      `,
      [e.aggregateId],
    );
    await expect(consumer.consume(e, digest(e))).rejects.toThrow("GRADING_STATE_UNAVAILABLE");
    expect((await counts()).inbox).toBe(0);
    await fixture.query(
      `
      UPDATE assessment.attempts
      SET
        replay_pending = true
      WHERE
        id = $1
      `,
      [e.aggregateId],
    );
    expect(await other.consume(e, digest(e))).toBe("completed");
    expect(
      (
        await fixture.query(`
                            SELECT
                              status,
                              replay_pending,
                              failure_code
                            FROM
                              assessment.attempts
                            `)
      ).rows[0],
    ).toEqual({ status: "COMPLETED", replay_pending: false, failure_code: null });
  });
  it("grades expired submissions and records empty/missing as unanswered", async () => {
    const e = await seed({ time: "2026-10-09T01:00:00.000Z", expired: true, selections: [[]] });
    await consumer.consume(e, digest(e));
    expect(
      (
        await fixture.query(`
                            SELECT
                              sum (unanswered_count)::int AS n
                            FROM
                              assessment.question_statistics
                            `)
      ).rows[0].n,
    ).toBe(3);
    expect(
      (
        await fixture.query(`
                            SELECT
                              expired
                            FROM
                              assessment.attempts
                            `)
      ).rows[0].expired,
    ).toBe(true);
  });
  it("quarantines malformed/forged messages without mutating valid submissions or storing payload", async () => {
    const event = await seed(),
      forged = { ...event, payload: { ...event.payload, submissionId: randomUUID() } };
    for (const body of [{ secrets: "must never persist" }, forged])
      expect(await consumer.consume(body, digest(body))).toBe("quarantined");
    expect(
      (
        await fixture.query(`
                            SELECT
                              failure_code
                            FROM
                              platform.invalid_submission_messages
                            ORDER BY
                              failure_code
                            `)
      ).rows,
    ).toEqual([{ failure_code: "INVALID_SCHEMA" }, { failure_code: "SUBMISSION_MISMATCH" }]);
    expect((await counts()).results).toBe(0);
    expect(
      (
        await fixture.query(`
                            SELECT
                              status
                            FROM
                              assessment.attempts
                            `)
      ).rows[0].status,
    ).toBe("SUBMITTED");
  });
  it("rejects forged alternate ID until completed and accepts case-insensitive UUID syntax", async () => {
    const e = await seed(),
      forged = { ...e, eventId: randomUUID() };
    expect(await consumer.consume(forged, digest(forged))).toBe("quarantined");
    const upper = {
      ...e,
      eventId: e.eventId.toUpperCase(),
      aggregateId: e.aggregateId.toUpperCase(),
      payload: { ...e.payload, attemptId: e.aggregateId.toUpperCase() },
    };
    expect(await consumer.consume(upper, digest(upper))).toBe("completed");
  });
  it("cannot read identity secrets, mutate answers/submission identity or update results", async () => {
    const e = await seed();
    await consumer.consume(e, digest(e));
    for (const sql of [
      `
      SELECT
        password_hash
      FROM
        identity.users
      `,
      `
      UPDATE assessment.answers
      SET
        marked = false
      `,
      `
      UPDATE assessment.attempts
      SET
        submitted_at = submitted_at
      `,
      `
      UPDATE assessment.results
      SET
        earned_points = 0
      `,
      "DELETE FROM platform.inbox",
    ])
      await expect(db.query("diagnostic", sql)).rejects.toMatchObject({ code: "42501" });
  });
  it("captures a bounded local transaction diagnostic without claiming capacity", async () => {
    const events = await Promise.all(Array.from({ length: 10 }, () => seed()));
    const start = performance.now();
    for (const e of events) await consumer.consume(e, digest(e));
    const elapsedMs = performance.now() - start;
    const durations = observations
      .filter((v) => v.kind === "transaction")
      .map((v) => v.durationMs)
      .sort((a, b) => a - b);
    const output = {
      environment: "local PG17 ARM64, synthetic 3-question attempts, sequential 10 jobs",
      elapsedMs,
      observedJobsPerSecond: (events.length * 1000) / elapsedMs,
      transactions: durations,
      queriesPerJob: observations.filter((v) => v.kind === "query").length / events.length,
      scope: "diagnostic only, not sustainable throughput or AWS evidence",
    };
    if (process.env.GRADING_EVIDENCE_FILE)
      await writeFile(process.env.GRADING_EVIDENCE_FILE, JSON.stringify(output, null, 2));
    expect((await counts()).results).toBe(10);
  });
  it("persists the 500-question/5000-selection limit using constant query count", async () => {
    const version = randomUUID(),
      section = randomUUID(),
      attempt = randomUUID();
    const snapshot = Array.from({ length: 500 }, (_, position) => ({
      id: randomUUID(),
      source: randomUUID(),
      position: position + 1,
      options: Array.from({ length: 10 }, (_, optionPosition) => ({
        id: randomUUID(),
        position: optionPosition + 1,
      })),
    }));
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
        INSERT INTO
          catalog.published_versions (
            id,
            exam_id,
            version,
            title,
            description,
            duration_seconds,
            attempt_limit,
            opens_at,
            closes_at,
            display_timezone,
            explanation_policy,
            category,
            published_by
          )
        VALUES
          (
            $1,
            $2,
            2,
            'Bounded maximum',
            '',
            3600,
            10,
            '2026-10-08T00:00:00Z',
            '2026-10-10T00:00:00Z',
            'Asia/Ho_Chi_Minh',
            'NEVER',
            'IT_CERTIFICATION',
            $3
          )
        `,
        [version, examId, userId],
      );
      await c.query(
        `
        INSERT INTO
          catalog.published_sections (
            version_id,
            id,
            title,
            position
          )
        VALUES
          (
            $1,
            $2,
            'Maximum',
            1
          )
        `,
        [version, section],
      );
      await c.query(
        `
        INSERT INTO
          catalog.published_questions (
            version_id,
            id,
            section_id,
            source_question_id,
            source_revision,
            type,
            prompt,
            explanation,
            points,
            position
          )
        SELECT
          $1,
          q.id,
          $2,
          q.source,
          1,
          'MULTIPLE_CHOICE',
          'Q',
          '',
          1000,
          q.position
        FROM
          jsonb_to_recordset ($3::jsonb) AS q (
            id uuid,
            source uuid,
            position integer
          )
        `,
        [version, section, JSON.stringify(snapshot)],
      );
      const choices = snapshot.flatMap((q) => q.options.map((o) => ({ question: q.id, ...o })));
      await c.query(
        `
        INSERT INTO
          catalog.published_options (
            version_id,
            question_id,
            id,
            position,
            text
          )
        SELECT
          $1,
          o.question,
          o.id,
          o.position,
          'O'
        FROM
          jsonb_to_recordset ($2::jsonb) AS o (
            question uuid,
            id uuid,
            position integer
          )
        `,
        [version, JSON.stringify(choices)],
      );
      await c.query(
        `
        INSERT INTO
          catalog.published_answer_keys (
            version_id,
            question_id,
            option_id
          )
        SELECT
          $1,
          o.question,
          o.id
        FROM
          jsonb_to_recordset ($2::jsonb) AS o (
            question uuid,
            id uuid
          )
        `,
        [version, JSON.stringify(choices)],
      );
      await c.query("COMMIT");
      const e = submissionEvent({
        eventId: randomUUID(),
        attemptId: attempt,
        examId,
        publishedVersionId: version,
        submissionId: randomUUID(),
        occurredAt: "2026-10-09T00:01:00.000Z",
        deadline: "2026-10-09T01:00:00.000Z",
        expired: false,
        submissionKind: "MANUAL",
        correlationId: randomUUID(),
        causationId: randomUUID(),
      });
      await c.query(
        `
        INSERT INTO
          assessment.attempts (
            id,
            user_id,
            exam_id,
            version_id,
            status,
            started_at,
            deadline,
            submitted_at,
            submission_id,
            submission_event_id,
            submission_kind,
            revision
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'SUBMITTED',
            '2026-10-09T00:00:00Z',
            $5,
            $6,
            $7,
            $8,
            'MANUAL',
            2
          )
        `,
        [
          attempt,
          userId,
          examId,
          version,
          e.payload.deadline,
          e.occurredAt,
          e.payload.submissionId,
          e.eventId,
        ],
      );
      await c.query(
        `
        INSERT INTO
          assessment.answers (
            attempt_id,
            version_id,
            question_id,
            version,
            marked
          )
        SELECT
          $1,
          $2,
          q.id,
          1,
          false
        FROM
          jsonb_to_recordset ($3::jsonb) AS q (id uuid)
        `,
        [attempt, version, JSON.stringify(snapshot)],
      );
      await c.query(
        `
        INSERT INTO
          assessment.answer_selections (
            attempt_id,
            version_id,
            question_id,
            option_id
          )
        SELECT
          $1,
          $2,
          o.question,
          o.id
        FROM
          jsonb_to_recordset ($3::jsonb) AS o (
            question uuid,
            id uuid
          )
        `,
        [attempt, version, JSON.stringify(choices)],
      );
      observations.length = 0;
      const start = performance.now();
      expect(await consumer.consume(e, digest(e))).toBe("completed");
      const output = {
        questions: 500,
        selections: 5000,
        elapsedMs: performance.now() - start,
        queryCount: observations.filter((v) => v.kind === "query").length,
        transactionMs: observations.find((v) => v.kind === "transaction")?.durationMs,
        lockMs: observations
          .filter((v) => v.kind === "lock")
          .reduce((sum, v) => sum + v.durationMs, 0),
        scope:
          "single local correctness/latency observation, not a latency percentile or sustainable capacity",
      };
      expect(output.queryCount).toBe(15);
      expect(
        (
          await fixture.query(
            `
            SELECT
              earned_points,
              correct_count
            FROM
              assessment.results
            WHERE
              attempt_id = $1
            `,
            [attempt],
          )
        ).rows[0],
      ).toEqual({ earned_points: 500000, correct_count: 500 });
      expect(
        (
          await fixture.query(`
                              SELECT
                                sum (selected_count)::int AS n
                              FROM
                                assessment.option_statistics
                              `)
        ).rows[0].n,
      ).toBe(5000);
      if (process.env.GRADING_MAX_EVIDENCE_FILE)
        await writeFile(process.env.GRADING_MAX_EVIDENCE_FILE, JSON.stringify(output, null, 2));
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  });
});

async function recoveryState(event: SubmittedEvent) {
  const row = (
    await fixture.query(
      `
    SELECT
      status,
      replay_pending,
      grading_generation,
      revision,
      failure_code
    FROM
      assessment.attempts
    WHERE
      id = $1
  `,
      [event.aggregateId],
    )
  ).rows[0];
  const effects = (
    await fixture.query(
      `
    SELECT
      (SELECT count(*)::int FROM platform.quarantined_jobs WHERE attempt_id = $1) AS failures,
      (SELECT count(*)::int FROM platform.audit_logs WHERE resource_id = $1
        AND action = 'assessment.grading.failed') AS failure_audits,
      (SELECT count(*)::int FROM platform.audit_logs WHERE resource_id = $1
        AND action = 'assessment.grading.replay') AS replay_audits
  `,
      [event.aggregateId],
    )
  ).rows[0];
  return { ...row, ...effects };
}
const acceptReplay = (event: SubmittedEvent, revision: number) =>
  createGradingReplay(operatorDb).replay(
    event.aggregateId,
    revision,
    "local-operator",
    "Verified dependency repaired",
    randomUUID(),
  );

describe("terminal failure and authorized replay on restricted PostgreSQL", () => {
  it("settles two concurrent DLQ deliveries once without result/inbox or key authority", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    const outcomes = await Promise.all([
      createGradingRecovery(recoveryDb).consume(raw),
      createGradingRecovery(db).consume(raw),
    ]);
    expect(outcomes.map((v) => v.outcome)).toEqual(["terminal", "terminal"]);
    expect(await recoveryState(event)).toMatchObject({
      status: "FAILED",
      replay_pending: false,
      grading_generation: 0,
      revision: 3,
      failure_code: "RETRY_EXHAUSTED",
      failures: 1,
      failure_audits: 1,
      replay_audits: 0,
    });
    expect(await counts()).toMatchObject({ results: 0, inbox: 0, contributions: 0 });
    expect((await createGradingConsumer(db, createScoringCatalog(db)).consume(raw)).outcome).toBe(
      "terminal",
    );
    await expect(
      recoveryDb.query("diagnostic", "SELECT * FROM catalog.published_answer_keys"),
    ).rejects.toThrow();
    await expect(
      recoveryDb.query("diagnostic", "SELECT * FROM assessment.answer_selections"),
    ).rejects.toThrow();
  });
  it("rolls back FAILED/quarantine on audit failure, then redelivery succeeds", async () => {
    const event = await seed();
    await fixture.query(`CREATE FUNCTION platform.reject_grading_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.action = 'assessment.grading.failed' THEN RAISE EXCEPTION 'test audit failure'; END IF;
        RETURN NEW;
      END $$`);
    await fixture.query(`CREATE TRIGGER reject_grading_audit BEFORE INSERT ON platform.audit_logs
      FOR EACH ROW EXECUTE FUNCTION platform.reject_grading_audit()`);
    try {
      await expect(
        createGradingRecovery(recoveryDb).consume(JSON.stringify(event)),
      ).rejects.toThrow();
      expect(await recoveryState(event)).toMatchObject({
        status: "SUBMITTED",
        failures: 0,
        failure_audits: 0,
        revision: 2,
      });
    } finally {
      await fixture.query("DROP TRIGGER reject_grading_audit ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.reject_grading_audit()");
    }
    expect((await createGradingRecovery(recoveryDb).consume(JSON.stringify(event))).outcome).toBe(
      "terminal",
    );
  });
  it("classifies permanent scoring validation after grading rollback in a separate transaction", async () => {
    const event = await seed();
    const broken = createGradingConsumer(db, { getScoringSnapshot: async () => [] });
    expect((await broken.consume(JSON.stringify(event))).outcome).toBe("terminal");
    expect(await recoveryState(event)).toMatchObject({
      status: "FAILED",
      failure_code: "SCORING_INVALID",
      failures: 1,
      failure_audits: 1,
    });
    expect(await counts()).toMatchObject({ results: 0, inbox: 0, contributions: 0 });
  });
  it("authorizes one concurrent replay, fences old source/DLQ, preserves identity and completes once", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    await createGradingRecovery(recoveryDb).consume(raw);
    // Recovery can reconstruct an already-retained/pruned delivery from the validated quarantine envelope.
    const accepted = await Promise.all([acceptReplay(event, 3), acceptReplay(event, 3)]);
    expect(accepted).toEqual([
      { revision: 4, generation: 1, replayPending: true },
      { revision: 4, generation: 1, replayPending: true },
    ]);
    expect(await recoveryState(event)).toMatchObject({
      status: "FAILED",
      replay_pending: true,
      grading_generation: 1,
      revision: 4,
      replay_audits: 1,
    });
    const outbox = (
      await fixture.query(
        `
      SELECT
        event_id,
        aggregate_id,
        payload,
        grading_generation,
        delivered_at
      FROM
        platform.outbox
      WHERE
        event_id = $1
    `,
        [event.eventId],
      )
    ).rows[0];
    expect(outbox).toMatchObject({
      event_id: event.eventId,
      aggregate_id: event.aggregateId,
      payload: event,
      grading_generation: 1,
      delivered_at: null,
    });
    const sent: { body: string; generation?: number }[] = [];
    const publisher = createSubmissionPublisher(
      dispatchDb,
      {
        publish: async (body, generation) => {
          dispatchDb.assertOutsideTransaction();
          sent.push({ body, generation });
          expect(
            (
              await fixture.query(
                `
                SELECT
                  lease_token IS NOT NULL AS claimed
                FROM
                  platform.outbox
                WHERE
                  event_id = $1
                `,
                [event.eventId],
              )
            ).rows[0].claimed,
          ).toBe(true);
        },
      },
      {
        concurrency: 1,
        leaseMs: 10000,
        maxAttempts: 3,
        maxAgeMs: 86400000,
        backoffInitialMs: 100,
        backoffMaxMs: 1000,
      },
    );
    expect(await publisher.runOnce()).toMatchObject({ delivered: 1, fenced: 0 });
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!.body)).toEqual(event);
    expect(sent[0]!.generation).toBe(1);
    expect(
      (await createGradingConsumer(db, createScoringCatalog(db)).consume(raw, 0)).outcome,
    ).toBe("stale");
    expect((await createGradingRecovery(recoveryDb).consume(raw, 0)).outcome).toBe("stale");
    expect(await recoveryState(event)).toMatchObject({ replay_pending: true, revision: 4 });
    expect(await consumer.consume(event, digest(event), 1)).toBe("completed");
    expect(await other.consume(event, digest(event), 1)).toBe("duplicate");
    expect(await recoveryState(event)).toMatchObject({
      status: "COMPLETED",
      replay_pending: false,
    });
    expect(await counts()).toMatchObject({ results: 1, inbox: 1, contributions: 3 });
    expect(
      (await fixture.query("SELECT resolved_at FROM platform.quarantined_jobs")).rows[0]
        .resolved_at,
    ).not.toBeNull();
    await expect(acceptReplay(event, 5)).rejects.toThrow();
  });
  it("tracks repeated replay failures without admitting an old generation or stale operator revision", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    await createGradingRecovery(recoveryDb).consume(raw);
    await acceptReplay(event, 3);
    await createGradingRecovery(recoveryDb).consume(raw, 1);
    expect(await recoveryState(event)).toMatchObject({
      status: "FAILED",
      replay_pending: false,
      grading_generation: 1,
      revision: 5,
      failures: 2,
      failure_audits: 2,
    });
    await expect(acceptReplay(event, 3)).rejects.toThrow();
    expect(await acceptReplay(event, 5)).toEqual({
      revision: 6,
      generation: 2,
      replayPending: true,
    });
    expect((await createGradingRecovery(recoveryDb).consume(raw, 1)).outcome).toBe("stale");
    expect(await recoveryState(event)).toMatchObject({ replay_pending: true, revision: 6 });
  });
  it("rolls back replay/outbox/authorization when replay audit fails", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    await createGradingRecovery(recoveryDb).consume(raw);
    await fixture.query(`CREATE FUNCTION platform.reject_replay_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.action = 'assessment.grading.replay' THEN RAISE EXCEPTION 'test replay audit failure'; END IF;
        RETURN NEW;
      END $$`);
    await fixture.query(`CREATE TRIGGER reject_replay_audit BEFORE INSERT ON platform.audit_logs
      FOR EACH ROW EXECUTE FUNCTION platform.reject_replay_audit()`);
    try {
      await expect(acceptReplay(event, 3)).rejects.toThrow();
      expect(await recoveryState(event)).toMatchObject({
        replay_pending: false,
        grading_generation: 0,
        revision: 3,
        replay_audits: 0,
      });
      expect(
        (await fixture.query("SELECT count(*)::int AS n FROM platform.outbox")).rows[0].n,
      ).toBe(0);
    } finally {
      await fixture.query("DROP TRIGGER reject_replay_audit ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.reject_replay_audit()");
    }
  });
  it("cannot replay with worker/runtime authority or erase successful evidence", async () => {
    const event = await seed();
    await createGradingRecovery(recoveryDb).consume(JSON.stringify(event));
    for (const login of [db, recoveryDb]) {
      await expect(
        createGradingReplay(login).replay(
          event.aggregateId,
          3,
          "worker",
          "not authorized",
          randomUUID(),
        ),
      ).rejects.toThrow();
      await expect(
        login.query("assessment.write", "DELETE FROM platform.quarantined_jobs"),
      ).rejects.toThrow();
    }
    expect(await recoveryState(event)).toMatchObject({ replay_pending: false, replay_audits: 0 });
  });
  it("requires a root committed boundary for terminal settlement and operator replay", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    await expect(
      recoveryDb.transaction(() => createGradingRecovery(recoveryDb).consume(raw)),
    ).rejects.toMatchObject({ code: "DB_TRANSACTION_FORBIDDEN" });
    expect(await recoveryState(event)).toMatchObject({ status: "SUBMITTED", failure_audits: 0 });
    await createGradingRecovery(recoveryDb).consume(raw);
    await expect(operatorDb.transaction(() => acceptReplay(event, 3))).rejects.toThrow();
    expect(await recoveryState(event)).toMatchObject({ replay_pending: false, replay_audits: 0 });
  });
  it("quarantines malformed/future/forged DLQ without failing a valid attempt", async () => {
    const event = await seed();
    for (const [body, generation] of [
      [event, 1],
      [event, null],
      [{ ...event, eventId: randomUUID() }, 0],
    ] as const) {
      expect(
        (await createGradingRecovery(recoveryDb).consume(JSON.stringify(body), generation)).outcome,
      ).toBe("quarantined");
    }
    expect(await recoveryState(event)).toMatchObject({ status: "SUBMITTED", failures: 0 });
  });
});

describe("DLQ worker lifecycle and operator CLI", () => {
  it("ACKs only after durable FAILED/audit, survives Delete ACK loss and exits on SIGTERM", async () => {
    const event = await seed();
    const raw = JSON.stringify(event);
    const previous = {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
    };
    process.env.AWS_ACCESS_KEY_ID = "local-fixture";
    process.env.AWS_SECRET_ACCESS_KEY = "local-fixture-not-a-secret";
    let deliveries = 0,
      deletes = 0,
      ackAfterCommit = true;
    const sourceArn = "arn:aws:sqs:us-east-1:123456789012:grading";
    const broker = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      const target = String(req.headers["x-amz-target"]);
      res.setHeader("content-type", "application/x-amz-json-1.0");
      if (target.endsWith("GetQueueAttributes")) {
        const isDlq = String(input.QueueUrl).endsWith("/grading-dlq");
        res.end(
          JSON.stringify({
            Attributes: {
              QueueArn: isDlq ? sourceArn + "-dlq" : sourceArn,
              SqsManagedSseEnabled: "true",
              RedrivePolicy: JSON.stringify({
                deadLetterTargetArn: sourceArn + "-dlq",
                maxReceiveCount: "5",
              }),
              RedriveAllowPolicy: JSON.stringify({
                redrivePermission: "byQueue",
                sourceQueueArns: [sourceArn],
              }),
            },
          }),
        );
      } else if (target.endsWith("ReceiveMessage")) {
        if (deliveries < 2) {
          deliveries++;
          res.end(
            JSON.stringify({
              Messages: [
                {
                  Body: raw,
                  ReceiptHandle: "dlq-receipt-" + deliveries,
                  MessageId: "local-broker-id",
                  MD5OfBody: createHash("md5").update(raw).digest("hex"),
                  Attributes: { DeadLetterQueueSourceArn: sourceArn },
                },
              ],
            }),
          );
        } else res.end("{}");
      } else if (target.endsWith("DeleteMessage")) {
        const observed = await recoveryState(event);
        ackAfterCommit &&= observed.status === "FAILED" && observed.failure_audits === 1;
        deletes++;
        if (deletes === 1) {
          res.statusCode = 503;
          res.end(JSON.stringify({ __type: "ServiceUnavailable" }));
        } else res.end("{}");
      } else res.end("{}");
    });
    await new Promise<void>((done) => broker.listen(0, "127.0.0.1", done));
    const address = broker.address();
    if (!address || typeof address === "string") throw new Error("Missing broker");
    const endpoint = "http://127.0.0.1:" + address.port;
    const env = {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: config(recoveryLogin).url,
      DB_POOL_MAX: "2",
      AWS_REGION: "us-east-1",
      SQS_ENDPOINT: endpoint,
      SUBMISSION_QUEUE_URL: endpoint + "/123456789012/grading",
      GRADING_DLQ_ARN: sourceArn + "-dlq",
      GRADING_QUEUE_MODE: "dead-letter",
      GRADING_HEALTH_PORT: "0",
      GRADING_WAIT_SECONDS: "0",
      GRADING_TIMEOUT_MS: "2000",
    };
    let handle: Awaited<ReturnType<typeof startGradingWorker>> | undefined;
    try {
      handle = await startGradingWorker(env, () => {});
      for (let i = 0; i < 150 && deletes < 2; i++)
        await new Promise((done) => setTimeout(done, 20));
      expect(deletes).toBe(2);
      expect(ackAfterCommit).toBe(true);
      await handle.stop();
      handle = undefined;
      expect(await recoveryState(event)).toMatchObject({ failure_audits: 1, failures: 1 });
      const child = spawn(process.execPath, ["dist/workers/sqs/grading.main.js"], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (part) => {
        output += part;
      });
      child.stderr.on("data", (part) => {
        output += part;
      });
      const exited = new Promise<number | null>((done) => child.once("exit", done));
      try {
        for (let i = 0; i < 150 && !output.includes("grading.worker.signals"); i++)
          await new Promise((done) => setTimeout(done, 20));
        expect(output).toContain("grading.worker.signals");
        child.kill("SIGTERM");
        expect(await exited).toBe(0);
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGTERM");
          await exited;
        }
      }
      const cli = spawn(
        process.execPath,
        ["dist/workers/operator/grading-replay.main.js", event.aggregateId, "3"],
        {
          env: {
            ...process.env,
            NODE_ENV: "test",
            DATABASE_OPERATOR_URL: config(operatorLogin).url,
            OPERATOR_IDENTITY: "local-operator",
            OPERATOR_REASON: "Verified repair",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let cliOutput = "";
      cli.stdout.on("data", (part) => {
        cliOutput += part;
      });
      cli.stderr.on("data", (part) => {
        cliOutput += part;
      });
      expect(await new Promise((done) => cli.once("exit", done))).toBe(0);
      expect(cliOutput).toContain("grading.replay.accepted");
      expect(cliOutput).not.toContain(password);
      expect(await recoveryState(event)).toMatchObject({ replay_pending: true, replay_audits: 1 });
    } finally {
      await handle?.stop();
      await new Promise<void>((done) => broker.close(() => done()));
      if (previous.key === undefined) delete process.env.AWS_ACCESS_KEY_ID;
      else process.env.AWS_ACCESS_KEY_ID = previous.key;
      if (previous.secret === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;
      else process.env.AWS_SECRET_ACCESS_KEY = previous.secret;
    }
  });
});
