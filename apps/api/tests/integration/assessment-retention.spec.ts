import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import {
  createAssessmentRetention,
  createGradingConsumer,
  createGradingRecovery,
} from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";
import { submissionEvent } from "../../src/modules/assessment/domain/assessment-policy";
import { PostgresCandidateResultsQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-candidate-results.query";
import { PostgresAttemptQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.query";
import { PostgresAttemptRepository } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "../../src/modules/assessment/infrastructure/persistence/postgres-submission-outbox";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { AssessmentService } from "../../src/modules/assessment/application/services/assessment.service";
import { IdentityAccess } from "../../src/modules/identity/application/facades/identity.facade";
import { CatalogAccess } from "../../src/modules/catalog/application/facades/catalog.facade";
import { HmacAssessmentCursor } from "../../src/modules/assessment/infrastructure/cursor/assessment-cursor";
import { HttpQuestionPageSizer } from "../../src/modules/assessment/infrastructure/http/http-question-page-sizer";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port === "55432")
  throw new Error("Disposable administrator required");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const name = `retention_${suffix}`,
  password = randomUUID();
const logins = {
  owner: `rt_ddl_${suffix}`,
  maintenance: `rt_maint_${suffix}`,
  grade: `rt_grade_${suffix}`,
  recovery: `rt_recovery_${suffix}`,
  api: `rt_api_${suffix}`,
};
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const base = new URL(adminUrl);
base.pathname = `/${name}`;
const url = (login: string) => {
  const value = new URL(base);
  value.username = login;
  value.password = password;
  return value.toString();
};
const config = (login: string) =>
  databaseConfig({
    NODE_ENV: "test",
    DATABASE_URL: url(login),
    DB_POOL_MAX: "2",
    DB_LOCK_TIMEOUT_MS: "5000",
    DB_STATEMENT_TIMEOUT_MS: "10000",
  });
let fixture: Pool,
  maintenance: PostgresDatabase,
  second: PostgresDatabase,
  gradeDb: PostgresDatabase,
  recoveryDb: PostgresDatabase,
  apiDb: PostgresDatabase;
const observations: DatabaseObservation[] = [];
const day = 86400000;
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [kind, login] of Object.entries(logins)) {
    await admin.query(
      `CREATE ROLE ${login} LOGIN ${kind === "owner" ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
    const group = {
      owner: "examination_owner",
      maintenance: "examination_assessment_maintenance",
      grade: "examination_grading_worker",
      recovery: "examination_grading_recovery",
      api: "examination_runtime",
    }[kind]!;
    await admin.query(`GRANT ${group} TO ${login}`);
  }
  const migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(
    config(logins.owner),
    process.env.RETENTION_BASELINE === "true" ? migrations.slice(0, 16) : migrations,
  );
  fixture = new Pool({
    connectionString: base.toString(),
    max: 4,
    options: "-c statement_timeout=90000",
  });
  maintenance = new PostgresDatabase(config(logins.maintenance), (v) => observations.push(v));
  second = new PostgresDatabase(config(logins.maintenance));
  gradeDb = new PostgresDatabase(config(logins.grade));
  recoveryDb = new PostgresDatabase(config(logins.recovery));
  apiDb = new PostgresDatabase(config(logins.api));
});
afterAll(async () => {
  for (const db of [maintenance, second, gradeDb, recoveryDb, apiDb]) await db?.close();
  await fixture?.end();
  await admin.query(`DROP DATABASE ${name}`);
  for (const login of Object.values(logins)) await admin.query(`DROP ROLE ${login}`);
  await admin.end();
});
beforeEach(async () => {
  await fixture.query("TRUNCATE identity.users CASCADE");
  observations.length = 0;
});

async function universe(size = 3, optionsCount = 2) {
  const user = randomUUID(),
    exam = randomUUID(),
    version = randomUUID(),
    section = randomUUID();
  const questions = Array.from({ length: size }, (_, i) => ({
    id: randomUUID(),
    position: i + 1,
    options: Array.from({ length: optionsCount }, (_, j) => ({
      id: randomUUID(),
      position: j + 1,
    })),
  }));
  await fixture.query(
    `
      INSERT INTO identity.users (
        id,
        email,
        password_hash
      )
      VALUES (
        $1,
        $2,
        'fixture-only'
      )
    `,
    [user, `${user}@retention.test`],
  );
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `
        INSERT INTO catalog.exams (
          id,
          title,
          category,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at
        )
        VALUES (
          $1,
          'Retention fixture',
          'IT_CERTIFICATION',
          3600,
          10,
          '2020-01-01',
          '2030-01-01'
        )
      `,
      [exam],
    );
    await c.query(
      `
        INSERT INTO catalog.published_versions (
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
        VALUES (
          $1,
          $2,
          1,
          'Retention fixture',
          '',
          3600,
          10,
          '2020-01-01',
          '2030-01-01',
          'Asia/Ho_Chi_Minh',
          'AFTER_COMPLETION',
          'IT_CERTIFICATION',
          $3
        )
      `,
      [version, exam, user],
    );
    await c.query(
      `
        INSERT INTO catalog.published_sections (
          version_id,
          id,
          title,
          position
        )
        VALUES (
          $1,
          $2,
          'Section',
          1
        )
      `,
      [version, section],
    );
    await c.query(
      `
        INSERT INTO catalog.published_questions (
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
          q.id,
          1,
          $4,
          'Question',
          'Explanation',
          1,
          q.position
        FROM
          jsonb_to_recordset($3::jsonb) AS q(id uuid, position smallint)
      `,
      [
        version,
        section,
        JSON.stringify(questions),
        optionsCount === 10 ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
      ],
    );
    const opts = questions.flatMap((q) => q.options.map((o) => ({ ...o, question: q.id })));
    await c.query(
      `
        INSERT INTO catalog.published_options (
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
          'Option'
        FROM
          jsonb_to_recordset($2::jsonb) AS o(question uuid, id uuid, position smallint)
      `,
      [version, JSON.stringify(opts)],
    );
    await c.query(
      `
        INSERT INTO catalog.published_answer_keys (
          version_id,
          question_id,
          option_id
        )
        SELECT
          version_id,
          question_id,
          id
        FROM
          catalog.published_options
        WHERE
          version_id = $1
          AND (position = 1 OR $2::boolean)
      `,
      [version, optionsCount === 10],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return { user, exam, version, questions, optionsCount };
}
type Universe = Awaited<ReturnType<typeof universe>>;
async function attempt(f: Universe, ageDays = 366, mode: "all" | "one" | "none" = "all") {
  const id = randomUUID(),
    eventId = randomUUID(),
    submissionId = randomUUID();
  const submittedAt = new Date(Date.now() - ageDays * day).toISOString();
  const startedAt = new Date(Date.parse(submittedAt) - 60000).toISOString();
  const deadline = new Date(Date.parse(submittedAt) + 3600000).toISOString();
  await fixture.query(
    `
      INSERT INTO assessment.attempts (
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
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'SUBMITTED',
        $5,
        $6,
        $7,
        $8,
        $9,
        'MANUAL',
        false,
        1
      )
    `,
    [id, f.user, f.exam, f.version, startedAt, deadline, submittedAt, submissionId, eventId],
  );
  const selected = mode === "none" ? [] : mode === "one" ? f.questions.slice(0, 1) : f.questions;
  await fixture.query(
    `
      INSERT INTO assessment.answers (
        attempt_id,
        version_id,
        question_id,
        version
      )
      SELECT
        $1,
        $2,
        q.id,
        1
      FROM
        jsonb_to_recordset($3::jsonb) AS q(id uuid)
    `,
    [id, f.version, JSON.stringify(selected)],
  );
  const choices = selected.flatMap((q) =>
    (f.optionsCount === 10 ? q.options : q.options.slice(0, 1)).map((o) => ({
      question: q.id,
      option: o.id,
    })),
  );
  await fixture.query(
    `
      INSERT INTO assessment.answer_selections (
        attempt_id,
        version_id,
        question_id,
        option_id
      )
      SELECT
        $1,
        $2,
        s.question,
        s.option
      FROM
        jsonb_to_recordset($3::jsonb) AS s(question uuid, option uuid)
    `,
    [id, f.version, JSON.stringify(choices)],
  );
  const event = submissionEvent({
    eventId,
    attemptId: id,
    examId: f.exam,
    publishedVersionId: f.version,
    submissionId,
    occurredAt: submittedAt,
    deadline,
    expired: false,
    submissionKind: "MANUAL",
    correlationId: randomUUID(),
    causationId: randomUUID(),
  });
  await fixture.query(
    `
      INSERT INTO platform.outbox (
        event_id,
        aggregate_id,
        type,
        payload,
        correlation_id,
        created_at
      )
      VALUES (
        $1,
        $2,
        'attempt.submitted.v1',
        $3::jsonb,
        $4,
        $5
      )
    `,
    [eventId, id, JSON.stringify(event), event.correlationId, submittedAt],
  );
  return { id, event, raw: JSON.stringify(event) };
}
type Submission = Awaited<ReturnType<typeof attempt>>;
async function complete(s: Submission, completedDays = 8) {
  expect(
    (await createGradingConsumer(gradeDb, createScoringCatalog(gradeDb)).consume(s.raw)).outcome,
  ).toBe("completed");
  // Test administrator ages synthetic lifecycle records; runtime cannot rewrite accepted identity.
  await fixture.query(
    `
      UPDATE assessment.results
      SET
        completed_at = $2
      WHERE
        attempt_id = $1
    `,
    [s.id, new Date(Date.now() - completedDays * day).toISOString()],
  );
  await fixture.query(
    `
      UPDATE platform.outbox
      SET
        delivered_at = clock_timestamp()
      WHERE
        event_id = $1
    `,
    [s.event.eventId],
  );
}
const job = (db = maintenance, receiptBatch = 100, attemptBatch = 10) =>
  createAssessmentRetention(db, { receiptBatch, attemptBatch });
async function purge(id: string, db = maintenance) {
  return (
    await db.query<{ outcome: { purged: boolean } }>(
      "assessment.write",
      "SELECT assessment.purge_retained_attempt($1, $2) AS outcome",
      [id, randomUUID()],
    )
  ).rows[0]!.outcome;
}
function keyAt(milliseconds: number) {
  const prefix = milliseconds.toString(16).padStart(12, "0");
  return `${prefix.slice(0, 8)}-${prefix.slice(8)}-7000-8000-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
async function receipt(
  f: Universe,
  s: Submission,
  ageDays: number,
  operation = "assessment.attempt.submit",
) {
  const key = keyAt(Date.now() - ageDays * day);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(["POST", `/v1/attempts/${s.id}/submit`, {}]))
    .digest();
  await fixture.query(
    `
      INSERT INTO platform.idempotency_receipts (
        actor_id,
        key,
        fingerprint,
        operation,
        resource_id,
        http_status,
        response,
        accepted_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        202,
        $6::jsonb,
        $7
      )
    `,
    [
      f.user,
      key,
      fingerprint,
      operation,
      s.id,
      JSON.stringify({ attemptId: s.id, submissionId: s.event.payload.submissionId }),
      new Date(Date.now() - ageDays * day).toISOString(),
    ],
  );
  return key;
}
async function snapshot(id: string) {
  return (
    await fixture.query(
      `
        SELECT
          a.purged_at IS NOT NULL AS purged,
          (
            SELECT count(*)::int
            FROM assessment.answers
            WHERE attempt_id = a.id
          ) AS answers,
          (
            SELECT count(*)::int
            FROM assessment.results
            WHERE attempt_id = a.id
          ) AS results,
          (
            SELECT count(*)::int
            FROM platform.inbox
            WHERE attempt_id = a.id
          ) AS inbox,
          (
            SELECT count(*)::int
            FROM platform.audit_logs
            WHERE resource_id = a.id
              AND action = 'assessment.payload.purge'
          ) AS audits
        FROM assessment.attempts a
        WHERE a.id = $1
      `,
      [id],
    )
  ).rows[0];
}
async function waiting(predicate: () => Promise<boolean>) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Observed lock/timing condition not reached");
}

describe("Assessment maintenance authority and receipt lifetime", () => {
  it("provides the bounded maintenance capability", async () => {
    expect(await job().runOnce(randomUUID())).toEqual({
      receipts: 0,
      attempts: 0,
      answers: 0,
      selections: 0,
    });
  });
  it("prunes only old completed Assessment receipts in finite batches and rejects the pruned UUIDv7 retry", async () => {
    const f = await universe(),
      old = await attempt(f, 10);
    await complete(old);
    const first = await receipt(f, old, 9),
      next = await receipt(f, old, 8);
    const recent = await receipt(f, old, 6),
      foreign = await receipt(f, old, 9, "catalog.exam.create");
    const pending = await attempt(f, 10),
      protectedKey = await receipt(f, pending, 9);
    expect((await job(maintenance, 1).runOnce(randomUUID())).receipts).toBe(1);
    const app = new AssessmentService(
      { revalidate: async () => ({ userId: f.user }) } as IdentityAccess,
      {} as CatalogAccess,
      new PostgresAttemptRepository(apiDb),
      new PostgresAttemptQuery(apiDb),
      new PostgresIdempotency(apiDb),
      new PostgresSubmissionOutbox(apiDb),
      apiDb,
      new HmacAssessmentCursor(Buffer.alloc(32)),
      new HttpQuestionPageSizer(),
    );
    await expect(
      app.submit("authenticated-test-actor", first, old.id, randomUUID()),
    ).rejects.toThrow("Idempotency key expired");
    expect((await job(maintenance, 1).runOnce(randomUUID())).receipts).toBe(1);
    const keys = (
      await fixture.query(`
        SELECT
          key
        FROM
          platform.idempotency_receipts
      `)
    ).rows.map((r) => r.key);
    expect(keys.sort()).toEqual([recent, foreign, protectedKey].sort());
    expect(keys).not.toContain(next);
    expect((await snapshot(old.id)).results).toBe(1);
  });
  it("has function-only authority with no direct table/foreign-module access", async () => {
    for (const sql of [
      `
        DELETE
        FROM
          assessment.answers
      `,
      `
        UPDATE assessment.attempts
        SET
          purged_at = clock_timestamp()
      `,
      `
        SELECT
          *
        FROM
          catalog.published_answer_keys
      `,
      `
        SELECT
          *
        FROM
          identity.users
      `,
      `
        DELETE
        FROM
          platform.idempotency_receipts
      `,
      "SELECT assessment.retention_facts(gen_random_uuid())",
    ])
      await expect(maintenance.query("diagnostic", sql)).rejects.toMatchObject({ code: "42501" });
    for (const db of [apiDb, gradeDb, recoveryDb])
      await expect(purge(randomUUID(), db)).rejects.toMatchObject({ code: "42501" });
    await expect(
      maintenance.query("diagnostic", "SELECT assessment.prune_retention_receipts(1001, $1)", [
        randomUUID(),
      ]),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(maintenance.transaction(() => job().runOnce(randomUUID()))).rejects.toMatchObject({
      code: "DB_TRANSACTION_FORBIDDEN",
    });
  });
});
describe("Completed payload withdrawal", () => {
  it("keeps projections correct while a new completion and purge contend on actual counter locks", async () => {
    const f = await universe(),
      old = await attempt(f),
      fresh = await attempt(f, 10, "one");
    await complete(old);
    const held = await fixture.connect();
    let grading: Promise<unknown> | undefined, purging: Promise<unknown> | undefined;
    try {
      await held.query("BEGIN");
      await held.query(
        `
          SELECT
            question_id
          FROM
            assessment.question_statistics
          WHERE
            version_id = $1
          FOR UPDATE
        `,
        [f.version],
      );
      grading = createGradingConsumer(gradeDb, createScoringCatalog(gradeDb)).consume(fresh.raw);
      await waiting(async () =>
        Boolean(
          (
            await fixture.query(
              `
                SELECT
                  1
                FROM
                  pg_stat_activity
                WHERE
                  usename = $1
                  AND wait_event_type = 'Lock'
              `,
              [logins.grade],
            )
          ).rowCount,
        ),
      );
      purging = job(maintenance, 100, 1).runOnce(randomUUID());
      await waiting(async () =>
        Boolean(
          (
            await fixture.query(
              `
                SELECT
                  1
                FROM
                  pg_stat_activity
                WHERE
                  usename = $1
                  AND wait_event_type = 'Lock'
              `,
              [logins.maintenance],
            )
          ).rowCount,
        ),
      );
      await held.query("ROLLBACK");
      expect(await grading).toMatchObject({ outcome: "completed" });
      expect(await purging).toMatchObject({ attempts: 1 });
      expect(
        (
          await fixture.query(`
            SELECT
              attempt_id
            FROM
              assessment.leaderboard_entries
          `)
        ).rows[0]!.attempt_id,
      ).toBe(fresh.id);
      expect(
        (
          await fixture.query(`
            SELECT
              completed_count
            FROM
              assessment.question_statistics
          `)
        ).rows.every((r) => r.completed_count === "1"),
      ).toBe(true);
    } finally {
      await held.query("ROLLBACK");
      held.release();
      await Promise.allSettled([grading, purging]);
    }
  });
  it("withdraws answers/results, recomputes surviving rank/statistics and hides every Candidate projection", async () => {
    const f = await universe(),
      old = await attempt(f),
      fresh = await attempt(f, 10, "one");
    await complete(old);
    await complete(fresh);
    expect(await job().runOnce(randomUUID())).toEqual({
      receipts: 0,
      attempts: 1,
      answers: 3,
      selections: 3,
    });
    expect(await snapshot(old.id)).toEqual({
      purged: true,
      answers: 0,
      results: 0,
      inbox: 1,
      audits: 1,
    });
    expect(
      (
        await fixture.query(
          `
      SELECT
        epoch::text AS epoch
      FROM
        assessment.leaderboard_epochs
      WHERE
        version_id = $1
    `,
          [f.version],
        )
      ).rows[0]!.epoch,
    ).toBe("1");
    expect(
      (
        await fixture.query(`
          SELECT
            attempt_id
          FROM
            assessment.leaderboard_entries
        `)
      ).rows[0]!.attempt_id,
    ).toBe(fresh.id);
    const stats = (
      await fixture.query(
        `
          SELECT
            completed_count,
            correct_count,
            unanswered_count
          FROM
            assessment.question_statistics
          ORDER BY
            question_id
        `,
      )
    ).rows;
    expect(stats.every((r) => r.completed_count === "1")).toBe(true);
    expect(stats.reduce((n, r) => n + Number(r.correct_count), 0)).toBe(1);
    expect(stats.reduce((n, r) => n + Number(r.unanswered_count), 0)).toBe(2);
    expect(
      Number(
        (
          await fixture.query(
            `
              SELECT
                sum(selected_count) AS count
              FROM
                assessment.option_statistics
            `,
          )
        ).rows[0]!.count,
      ),
    ).toBe(1);
    const reads = new PostgresCandidateResultsQuery(apiDb),
      attempts = new PostgresAttemptQuery(apiDb);
    expect(await reads.result(old.id, f.user)).toBeNull();
    expect(
      (await reads.review({ attemptId: old.id, userId: f.user, position: null, limit: 21 }))
        .present,
    ).toBe(false);
    expect(
      (
        await reads.history({ userId: f.user, watermark: null, at: null, id: null, limit: 21 })
      ).rows.map((r) => r.attemptId),
    ).toEqual([fresh.id]);
    expect(await attempts.read(old.id, f.user)).toBeNull();
    expect(
      (
        await attempts.answers({
          attemptId: old.id,
          userId: f.user,
          sectionPosition: null,
          questionPosition: null,
          questionId: null,
          limit: 21,
        })
      ).present,
    ).toBe(false);
    expect(
      await apiDb.transaction(() => new PostgresAttemptRepository(apiDb).lockOwned(old.id, f.user)),
    ).toBeNull();
    expect(
      (
        await fixture.query(
          `
            SELECT
              count(*)::int AS count
            FROM
              assessment.attempts
            WHERE
              user_id = $1
              AND exam_id = $2
          `,
          [f.user, f.exam],
        )
      ).rows[0]!.count,
    ).toBe(2);
    expect(
      (
        await fixture.query(
          `
            SELECT
              count(*)::int AS count
            FROM
              catalog.published_answer_keys
            WHERE
              version_id = $1
          `,
          [f.version],
        )
      ).rows[0]!.count,
    ).toBe(3);
    expect((await job().runOnce(randomUUID())).attempts).toBe(0);
  });
  it("protects young completion, recent receipt, unresolved failure and pending delivery before picking another due row", async () => {
    const f = await universe();
    const submissions = [];
    for (let i = 0; i < 5; i++) {
      const s = await attempt(f, 370 + i);
      await complete(s, i === 0 ? 1 : 8);
      submissions.push(s);
    }
    await receipt(f, submissions[1]!, 1);
    await fixture.query(
      `
        INSERT INTO platform.quarantined_jobs (
          event_id,
          attempt_id,
          failure_code
          ) VALUES($1, $2, 'TEST')
      `,
      [submissions[2]!.event.eventId, submissions[2]!.id],
    );
    await fixture.query(
      `
        UPDATE platform.outbox
        SET
          delivered_at = NULL,
          parked_at = clock_timestamp()
        WHERE
          aggregate_id = $1
      `,
      [submissions[3]!.id],
    );
    for (const s of submissions.slice(0, 4)) expect((await purge(s.id)).purged).toBe(false);
    expect((await job(maintenance, 100, 1).runOnce(randomUUID())).attempts).toBe(1);
    expect((await snapshot(submissions[4]!.id)).purged).toBe(true);
    for (const s of submissions.slice(0, 4)) expect((await snapshot(s.id)).purged).toBe(false);
  });
  it("preserves a full 168 hour receipt window when the caller changes timezone across DST", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    await receipt(f, s, 167.5 / 24);
    const now = (await fixture.query("SELECT clock_timestamp() AS now")).rows[0]!.now as Date;
    const year = now.getUTCFullYear();
    let julian =
      Math.floor(
        (Date.UTC(year, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(year, 0, 1)) / day,
      ) + 1;
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) && now.getUTCMonth() > 1) julian--;
    const wrap = (value: number) => ((value - 1 + 365) % 365) + 1;
    // Valid POSIX rules put today's date inside DST but seven days ago outside it.
    const timezone = `XST0XDT,J${wrap(julian - 3)}/0,J${wrap(julian + 3)}/0`;
    await maintenance.transaction(async () => {
      await maintenance.query("diagnostic", "SELECT set_config('TimeZone', $1, true)", [timezone]);
      const count = (
        await maintenance.query<{ count: number }>(
          "assessment.write",
          "SELECT assessment.prune_retention_receipts(100, $1) AS count",
          [randomUUID()],
        )
      ).rows[0]!.count;
      expect(count).toBe(0);
    });
    expect(
      (
        await fixture.query(`
          SELECT count(*)::int AS count
          FROM platform.idempotency_receipts
        `)
      ).rows[0]!.count,
    ).toBe(1);
  });
  it("rejects nonfinite completion metadata even through a direct maintenance RPC", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    for (const invalid of ["-infinity", "infinity"]) {
      await fixture.query(
        `
          UPDATE assessment.results
          SET completed_at = $2::timestamptz
          WHERE attempt_id = $1
        `,
        [s.id, invalid],
      );
      expect((await purge(s.id)).purged).toBe(false);
      expect((await job().runOnce(randomUUID())).attempts).toBe(0);
      expect(await snapshot(s.id)).toMatchObject({
        purged: false,
        answers: 3,
        results: 1,
        audits: 0,
      });
    }
  });
  it("never age-purges submitted/FAILED/replay work or its receipts", async () => {
    const f = await universe(),
      pending = await attempt(f, 800),
      failed = await attempt(f, 800);
    await createGradingRecovery(recoveryDb).consume(failed.raw);
    await fixture.query(
      `
        UPDATE assessment.attempts
        SET
          replay_pending = true
        WHERE
          id = $1
      `,
      [failed.id],
    );
    await receipt(f, pending, 799);
    await receipt(f, failed, 799);
    expect(await job().runOnce(randomUUID())).toEqual({
      receipts: 0,
      attempts: 0,
      answers: 0,
      selections: 0,
    });
    expect((await snapshot(pending.id)).answers).toBe(3);
    expect((await snapshot(failed.id)).answers).toBe(3);
  });
  it("serializes competing workers and preserves duplicate/source/DLQ fences after purge", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    const results = await Promise.all([
      job().runOnce(randomUUID()),
      job(second).runOnce(randomUUID()),
    ]);
    expect(results.reduce((n, r) => n + r.attempts, 0)).toBe(1);
    expect((await snapshot(s.id)).audits).toBe(1);
    const before = await fixture.query(`
      SELECT
        *
      FROM
        assessment.question_statistics
    `);
    expect(
      (await createGradingConsumer(gradeDb, createScoringCatalog(gradeDb)).consume(s.raw)).outcome,
    ).toBe("duplicate");
    expect((await createGradingRecovery(recoveryDb).consume(s.raw)).outcome).toBe("duplicate");
    expect(
      (
        await fixture.query(`
          SELECT
            *
          FROM
            assessment.question_statistics
        `)
      ).rows,
    ).toEqual(before.rows);
    expect((await snapshot(s.id)).results).toBe(0);
    expect((await snapshot(s.id)).inbox).toBe(1);
  });
  it("skips a locked oldest row and drains it on a later tick", async () => {
    const f = await universe(),
      old = await attempt(f, 370),
      other = await attempt(f, 369);
    await complete(old);
    await complete(other);
    const held = await fixture.connect();
    try {
      await held.query("BEGIN");
      await held.query(
        `
          SELECT
            id
          FROM
            assessment.attempts
          WHERE
            id = $1
          FOR UPDATE
        `,
        [old.id],
      );
      expect((await job(maintenance, 100, 1).runOnce(randomUUID())).attempts).toBe(1);
      expect((await snapshot(old.id)).purged).toBe(false);
      expect((await snapshot(other.id)).purged).toBe(true);
    } finally {
      await held.query("ROLLBACK");
      held.release();
    }
    expect((await job().runOnce(randomUUID())).attempts).toBe(1);
  });
  it("rolls back payload/projections/marker when audit fails and rejects unmarked result deletion", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    await fixture.query(`CREATE FUNCTION platform.retention_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action = 'assessment.payload.purge' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$`);
    await fixture.query(
      "CREATE TRIGGER retention_audit_failure BEFORE INSERT ON platform.audit_logs FOR EACH ROW EXECUTE FUNCTION platform.retention_audit_failure()",
    );
    try {
      await expect(job().runOnce(randomUUID())).rejects.toThrow();
      expect(await snapshot(s.id)).toEqual({
        purged: false,
        answers: 3,
        results: 1,
        inbox: 1,
        audits: 0,
      });
      expect(
        (
          await fixture.query(
            `
        SELECT
          epoch
        FROM
          assessment.leaderboard_epochs
        WHERE
          version_id = $1
      `,
            [f.version],
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await fixture.query(
            `
              SELECT
                min(completed_count) AS count
              FROM
                assessment.question_statistics
            `,
          )
        ).rows[0]!.count,
      ).toBe("1");
    } finally {
      await fixture.query("DROP TRIGGER retention_audit_failure ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.retention_audit_failure()");
    }
    // Full dependent removal without a retention marker must fail at COMMIT.
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
          DELETE
          FROM
            assessment.result_sections
          WHERE
            attempt_id = $1
        `,
        [s.id],
      );
      await c.query(
        `
          DELETE
          FROM
            assessment.result_questions
          WHERE
            attempt_id = $1
        `,
        [s.id],
      );
      await c.query(
        `
          DELETE
          FROM
            assessment.leaderboard_entries
          WHERE
            attempt_id = $1
        `,
        [s.id],
      );
      await c.query(
        `
          DELETE
          FROM
            assessment.results
          WHERE
            attempt_id = $1
        `,
        [s.id],
      );
      await expect(c.query("COMMIT")).rejects.toMatchObject({ code: "23514" });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("rolls back receipt pruning if its audit cannot persist", async () => {
    const f = await universe(),
      s = await attempt(f, 10);
    await complete(s);
    await receipt(f, s, 9);
    await fixture.query(`CREATE FUNCTION platform.receipt_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action = 'assessment.receipts.prune' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$`);
    await fixture.query(
      "CREATE TRIGGER receipt_audit_failure BEFORE INSERT ON platform.audit_logs FOR EACH ROW EXECUTE FUNCTION platform.receipt_audit_failure()",
    );
    try {
      await expect(job().runOnce(randomUUID())).rejects.toThrow();
      expect(
        (
          await fixture.query(`
            SELECT
              count(*)::int AS count
            FROM
              platform.idempotency_receipts
          `)
        ).rows[0]!.count,
      ).toBe(1);
    } finally {
      await fixture.query("DROP TRIGGER receipt_audit_failure ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.receipt_audit_failure()");
    }
  });
  it("survives a lost COMMIT acknowledgement without another effect on restart", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    let commits = 0;
    const lost = new Proxy(maintenance, {
      get(target, key) {
        if (key === "transaction")
          return async <T>(work: () => Promise<T>) => {
            const result = await target.transaction(work);
            if (++commits === 2) throw new Error("synthetic lost commit acknowledgement");
            return result;
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await expect(job(lost).runOnce(randomUUID())).rejects.toThrow("lost commit");
    expect((await snapshot(s.id)).purged).toBe(true);
    expect((await job(second).runOnce(randomUUID())).attempts).toBe(0);
    expect((await snapshot(s.id)).audits).toBe(1);
  });
  it("purges the maximum500-question/5000-selection payload in one bounded attempt transaction", async () => {
    const f = await universe(500, 10),
      s = await attempt(f);
    await complete(s);
    observations.length = 0;
    const start = performance.now(),
      result = await job(maintenance, 100, 1).runOnce(randomUUID());
    expect(result).toEqual({ receipts: 0, attempts: 1, answers: 500, selections: 5000 });
    expect(observations.filter((o) => o.kind === "query").length).toBe(7);
    const evidence = {
      scope:
        "local maximum payload purge; wrapper queries include BEGIN/COMMIT, internal function statements are separate; not sustainable throughput/cost",
      elapsedMs: performance.now() - start,
      result,
      observations,
    };
    if (process.env.RETENTION_EVIDENCE_FILE)
      await writeFile(process.env.RETENTION_EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
  });
});
describe("Compiled one-shot retention", () => {
  it("drains a locked purge on SIGTERM and stops before admitting the next attempt", async () => {
    const f = await universe(),
      old = await attempt(f, 370),
      next = await attempt(f, 369);
    await complete(old);
    await complete(next);
    const held = await fixture.connect();
    let output = "";
    await held.query("BEGIN");
    await held.query(
      `
        SELECT
          question_id
        FROM
          assessment.question_statistics
        WHERE
          version_id = $1
        FOR UPDATE
      `,
      [f.version],
    );
    const child = spawn(process.execPath, ["dist/workers/scheduler/assessment-retention.main.js"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: url(logins.maintenance),
        ASSESSMENT_RETENTION_ENABLED: "true",
        DB_POOL_MAX: "1",
        DB_LOCK_TIMEOUT_MS: "5000",
        DB_STATEMENT_TIMEOUT_MS: "10000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    const exited = new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", resolve);
    });
    try {
      await waiting(async () =>
        Boolean(
          (
            await fixture.query(
              `
                SELECT
                  1
                FROM
                  pg_stat_activity
                WHERE
                  usename = $1
                  AND wait_event_type = 'Lock'
              `,
              [logins.maintenance],
            )
          ).rowCount,
        ),
      );
      child.kill("SIGTERM");
      await waiting(async () => output.includes("retention.stopping"));
      await held.query("ROLLBACK");
      expect(await exited).toBe(0);
      expect(output).toContain('"attempts":1');
      expect((await snapshot(old.id)).purged).toBe(true);
      expect((await snapshot(next.id)).purged).toBe(false);
    } finally {
      await held.query("ROLLBACK");
      held.release();
      if (child.exitCode === null) child.kill("SIGTERM");
      await exited;
    }
  });
  it("is disabled without database access and exits cleanly when explicitly enabled", async () => {
    const run = (enabled: boolean) =>
      new Promise<{ code: number | null; output: string }>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["dist/workers/scheduler/assessment-retention.main.js"],
          {
            env: {
              ...process.env,
              NODE_ENV: "test",
              DATABASE_URL: enabled ? url(logins.maintenance) : "not-a-db",
              ASSESSMENT_RETENTION_ENABLED: String(enabled),
              DB_POOL_MAX: "1",
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let output = "";
        child.stdout.on("data", (b) => (output += b));
        child.stderr.on("data", (b) => (output += b));
        child.once("error", reject);
        child.once("exit", (code) => resolve({ code, output }));
      });
    const disabled = await run(false);
    expect(disabled.code).toBe(0);
    expect(disabled.output).toContain("retention.disabled");
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    const enabled = await run(true);
    expect(enabled.code).toBe(0);
    expect(enabled.output).toContain('"attempts":1');
    expect(enabled.output).not.toContain(f.user);
    expect(enabled.output).not.toContain(s.id);
  });
});

describe("Natural retention discovery plan", () => {
  it("uses the due partial index with 100k excluded FAILED rows without forcing the planner", async () => {
    const f = await universe(),
      s = await attempt(f);
    await complete(s);
    const seed = await fixture.connect();
    try {
      await seed.query("BEGIN");
      await seed.query(
        `
          INSERT INTO assessment.attempts (
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
            failure_code,
            revision
          )
          SELECT
            gen_random_uuid(),
            $1,
            $2,
            $3,
            'FAILED',
            '2024-01-01'::timestamptz,
            '2024-01-01'::timestamptz + interval '1 hour',
            '2024-01-01'::timestamptz + interval '1 minute',
            gen_random_uuid(),
            gen_random_uuid(),
            'MANUAL',
            false,
            'DIAGNOSTIC_FIXTURE',
            1
          FROM
            generate_series(1, 100000)
        `,
        [f.user, f.exam, f.version],
      );
      await seed.query("ANALYZE assessment.attempts");
      // Refresh planner statistics before deferred completion guards run on100k rows.
      await seed.query("COMMIT");
    } catch (error) {
      await seed.query("ROLLBACK");
      throw error;
    } finally {
      seed.release();
    }
    const definition = (
      await fixture.query(
        "SELECT pg_get_functiondef('assessment.lock_retention_candidate()'::regprocedure) AS source",
      )
    ).rows[0]!.source as string;
    const sql = definition
      .slice(
        definition.indexOf("SELECT\n    a.id"),
        definition.indexOf("FOR UPDATE OF a SKIP LOCKED;") + "FOR UPDATE OF a SKIP LOCKED".length,
      )
      .replace("  INTO target\n", "");
    const c = await fixture.connect();
    let plan: unknown;
    try {
      await c.query("BEGIN");
      await c.query("SET LOCAL ROLE examination_owner");
      plan = (await c.query("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql)).rows[0]![
        "QUERY PLAN"
      ];
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect(JSON.stringify(plan)).toContain("attempts_retention_due");
    if (process.env.RETENTION_EVIDENCE_FILE)
      await writeFile(
        process.env.RETENTION_EVIDENCE_FILE.replace("maximum-local.json", "plan-local.json"),
        JSON.stringify(
          {
            scope:
              "exact discovery SELECT extracted from applied SECURITY DEFINER under its owner role;100k synthetic excluded FAILED rows; no forced planner, not saturation",
            sql,
            plan,
          },
          null,
          2,
        ),
      );
  }, 120000);
});
