import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Module } from "@nestjs/common";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Pool, type QueryResultRow } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  type DatabaseObservation,
  type DatabaseOperation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { createHttpApplication } from "../../src/infrastructure/http/configure-http-application";
import { ShutdownGate } from "../../src/infrastructure/resilience/shutdown/shutdown-gate";
import { IdentityService } from "../../src/modules/identity/application/services/identity.service";
import {
  IDENTITY_ACCESS,
  REQUEST_GUARD,
} from "../../src/modules/identity/application/facades/identity.facade";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../src/modules/identity/infrastructure/security/identity-crypto";
import { PostgresIdentityRepository } from "../../src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import { PostgresIdentityQuery } from "../../src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";
import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { HttpSession } from "../../src/modules/identity/infrastructure/http/http-session";

import { BusinessMetricsController } from "../../src/modules/reporting/presentation/http/business-metrics.controller";
import { BusinessMetricsService } from "../../src/modules/reporting/application/services/business-metrics.service";
import { BusinessMetrics } from "../../src/modules/reporting/application/dto/business-metrics.dto";
import { PostgresBusinessMetricsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-business-metrics.query";
import {
  createGradingConsumer,
  createGradingRecovery,
  createGradingReplay,
} from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";
import { submissionEvent } from "../../src/modules/assessment/domain/assessment-policy";
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = "business_metrics_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "bm_ddl_" + suffix,
  runtimeRole = "bm_api_" + suffix,
  graderRole = "bm_grade_" + suffix,
  maintenanceRole = "bm_maintenance_" + suffix,
  recoveryRole = "bm_recovery_" + suffix,
  operatorRole = "bm_operator_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const observations: DatabaseObservation[] = [];
let fixture: Pool,
  db: PostgresDatabase,
  gradeDb: PostgresDatabase,
  maintenance: PostgresDatabase,
  recoveryDb: PostgresDatabase,
  operatorDb: PostgresDatabase,
  identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string, viewer: string, headers: { cookie: string }, validate: ValidateFunction;
let security: PostgresSecurity;
const reader = () =>
  new BusinessMetricsService(identity, new PostgresBusinessMetricsQuery(db), security, db);
async function user(optIn = true): Promise<string> {
  const id = randomUUID();
  await fixture.query(
    `
    INSERT INTO
      identity.users (id, email, password_hash, display_name, email_verified_at, leaderboard_opt_in)
    VALUES
      ($1, $2, $3, 'PRIVATE_DISPLAY_NAME', clock_timestamp(), $4)
  `,
    [id, `${id}@example.test`, hash, optIn],
  );
  await fixture.query(
    `
    INSERT INTO
      identity.user_roles (user_id, role_id)
    VALUES
      ($1, 'CANDIDATE')
  `,
    [id],
  );
  return id;
}
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [login, group] of [
    [owner, "examination_owner"],
    [runtimeRole, "examination_runtime"],
    [graderRole, "examination_grading_worker"],
    [maintenanceRole, "examination_assessment_maintenance"],
    [recoveryRole, "examination_grading_recovery"],
    [operatorRole, "examination_operator"],
  ]) {
    await admin.query(
      `CREATE ROLE ${login} LOGIN ${login === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
    await admin.query(`GRANT ${group} TO ${login}`);
  }
  const migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(owner) }), migrations);
  fixture = new Pool({
    connectionString: base.toString(),
    max: 3,
    options: "-c statement_timeout=90000 -c timezone=UTC",
  });
  db = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    (value) => observations.push(value),
  );
  gradeDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(graderRole) }),
  );
  maintenance = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(maintenanceRole) }),
  );
  recoveryDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(recoveryRole) }),
  );
  operatorDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(operatorRole) }),
  );
  const passwords = new ArgonPasswords(2, 8),
    pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  hash = await passwords.hash("ranking fixture password");
  const signing = {
    kid: "ranking",
    privatePem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const tokens = await JwtSessionTokens.create("urn:test:ranking", signing, [signing]),
    createdSecurity = new PostgresSecurity(db, randomBytes(32));
  security = createdSecurity;
  identity = new IdentityService(
    new PostgresIdentityRepository(db),
    db,
    passwords,
    tokens,
    new VerificationCodec("mail", { mail: randomBytes(32) }),
    hash,
    security,
    new PostgresIdempotency(db),
    new PostgresIdentityQuery(db),
    new PostgresAuthenticatedWriteAdmission(db),
  );
  const transport = new HttpSession(identity, security, "http://127.0.0.1:3000", randomBytes(32));
  @Module({
    controllers: [BusinessMetricsController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: BusinessMetricsService, useValue: reader() },
    ],
  })
  class BusinessMetricsHttpModule {}
  api = await createHttpApplication(BusinessMetricsHttpModule);
  http = api.app.getHttpAdapter().getInstance();
  viewer = await user();
  await fixture.query(
    `
        INSERT INTO
          identity.user_roles (user_id, role_id)
        VALUES
          ($1, 'ADMIN')
      `,
    [viewer],
  );
  const session = await identity.login(`${viewer}@example.test`, "ranking fixture password");
  headers = { cookie: `__Host-access=${session.access}` };
  const document = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  validate = ajv.compile(document.components.schemas.BusinessMetricsEnvelope!);
});

afterAll(async () => {
  await api?.app.close();
  await db?.close();
  await gradeDb?.close();
  await maintenance?.close();
  await recoveryDb?.close();
  await operatorDb?.close();
  await fixture?.end();
  for (let n = 0; n < 100; n++) {
    const count = (
      await admin.query<{ n: number }>(
        `
      SELECT
        count(*)::int AS n
      FROM
        pg_stat_activity
      WHERE
        datname = $1
    `,
        [name],
      )
    ).rows[0]!.n;
    if (!count) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(
    `DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${graderRole}, ${maintenanceRole}, ${recoveryRole}, ${operatorRole}`,
  );
  await admin.end();
});
async function universe(size = 3, optionsCount = 2, examId?: string) {
  const user = randomUUID(),
    exam = examId ?? randomUUID(),
    version = randomUUID(),
    section = randomUUID();
  const questions = Array.from({ length: size }, (_, i) => ({
    id: randomUUID(),
    position: (i % 25) + 1,
    section: Math.floor(i / 25) + 1,
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
    if (!examId)
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
          $4,
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
      [version, exam, user, examId ? 2 : 1],
    );
    await c.query(
      `
        INSERT INTO catalog.published_sections (
          version_id,
          id,
          title,
          position
        )
        SELECT
          $1,
          (substr($2::text, 1, 24) || lpad(i::text, 12, '0'))::uuid,
          'Section',
          i
        FROM
          generate_series(1, $3::int) i
      `,
      [version, section, Math.ceil(size / 25)],
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
          (substr($2::text, 1, 24) || lpad(q.section::text, 12, '0'))::uuid,
          q.id,
          1,
          CASE
            WHEN $4::int = 10 THEN 'MULTIPLE_CHOICE'
            WHEN q.position = 2 THEN 'MULTIPLE_CHOICE'
            WHEN q.position = 3 THEN 'TRUE_FALSE'
            ELSE 'SINGLE_CHOICE'
          END,
          'PRIVATE_QUESTION_TEXT',
          'PRIVATE_EXPLANATION',
          1,
          q.position
        FROM
          jsonb_to_recordset($3::jsonb) AS q(id uuid, position smallint, section smallint)
      `,
      [version, section, JSON.stringify(questions), optionsCount],
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
          AND (position = 1 OR $2::boolean OR question_id IN (
            SELECT
              id
            FROM
              catalog.published_questions
            WHERE
              version_id = $1
              AND type = 'MULTIPLE_CHOICE'
          ))
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
const day = 86400000;
async function attempt(
  f: Universe,
  ageDays = 366,
  selections: number[][] = [[0], [0, 1], []],
  expired = false,
  submittedOverride?: string,
) {
  const id = randomUUID(),
    eventId = randomUUID(),
    submissionId = randomUUID();
  const submittedAt = submittedOverride ?? new Date(Date.now() - ageDays * day).toISOString();
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
        $10,
        $5,
        $6,
        $7,
        $8,
        $9,
        $11,
        $12,
        1
      )
    `,
    [
      id,
      f.user,
      f.exam,
      f.version,
      startedAt,
      expired ? submittedAt : deadline,
      submittedAt,
      submissionId,
      eventId,
      expired ? "EXPIRED" : "SUBMITTED",
      expired ? "DEADLINE" : "MANUAL",
      expired,
    ],
  );
  const selected = f.questions.filter((_q, i) => i < selections.length);
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
  const choices = selected.flatMap((q, i) =>
    selections[i]!.map((index) => q.options[index]!).map((o) => ({
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
    deadline: expired ? submittedAt : deadline,
    expired,
    submissionKind: expired ? "DEADLINE" : "MANUAL",
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

async function grade(a: Awaited<ReturnType<typeof attempt>>) {
  return createGradingConsumer(gradeDb, createScoringCatalog(gradeDb)).consume(a.raw);
}
async function get(query = "", h = headers) {
  await new Promise((r) => setTimeout(r, 110));
  return http.inject({ method: "GET", url: `/v1/admin/business-metrics${query}`, headers: h });
}
function body(response: Awaited<ReturnType<typeof get>>): BusinessMetrics {
  const value = response.json();
  if (response.statusCode === 200 && !validate(value))
    throw new Error(JSON.stringify(validate.errors));
  return value.data;
}
async function audits() {
  return (
    await fixture.query(`
   SELECT
     actor_id,
     resource_id,
     resource_type,
     changed_fields
   FROM
     platform.audit_logs
   WHERE
     action = 'reporting.business-metrics.read'
 `)
  ).rows;
}
beforeEach(async () => {
  // Fixture administrator reset only; runtime has no TRUNCATE authority.
  await fixture.query("TRUNCATE assessment.attempts, platform.audit_logs CASCADE");
});

async function purge(a: Awaited<ReturnType<typeof attempt>>) {
  await fixture.query(
    `
    UPDATE assessment.results
    SET
      completed_at = clock_timestamp() - interval '8 days'
    WHERE
      attempt_id = $1
  `,
    [a.id],
  );
  await fixture.query(
    `
    UPDATE platform.outbox
    SET
      delivered_at = clock_timestamp()
    WHERE
      aggregate_id = $1
  `,
    [a.id],
  );
  const outcome = (
    await maintenance.query(
      "assessment.write",
      `
      SELECT
        assessment.purge_retained_attempt($1, $2) AS outcome
    `,
      [a.id, randomUUID()],
    )
  ).rows[0]!.outcome;
  expect(outcome.purged).toBe(true);
}
const iso = (n: number) => new Date(n).toISOString();
const range = (from: string, to: string) => `?${new URLSearchParams({ from, to })}`;
async function notSubmitted(
  f: Universe,
  startedAt: string,
  status = "IN_PROGRESS",
  deadline = iso(Date.now() + 3600000),
) {
  await fixture.query(
    `
   INSERT INTO assessment.attempts (
     id, user_id, exam_id, version_id, status, started_at, deadline, revision
   )
   VALUES
     ($1, $2, $3, $4, $5, $6, $7, 1)
 `,
    [randomUUID(), f.user, f.exam, f.version, status, startedAt, deadline],
  );
}
async function replay(a: Awaited<ReturnType<typeof attempt>>) {
  const revision = (
    await fixture.query(
      `
   SELECT
     revision
   FROM
     assessment.attempts
   WHERE
     id = $1
 `,
      [a.id],
    )
  ).rows[0].revision as number;
  return createGradingReplay(operatorDb).replay(
    a.id,
    revision,
    viewer,
    "Dependency restored",
    randomUUID(),
  );
}
describe("Business metrics on real restricted primary PostgreSQL", () => {
  it("returns explicit empty default cohort/backlog and safe audit with8 SQL calls", async () => {
    observations.length = 0;
    const r = await get(),
      m = body(r);
    expect(r.statusCode).toBe(200);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(Date.parse(m.window.to) - Date.parse(m.window.from)).toBe(86400000);
    expect(m.window.to).toBe(m.asOf);
    expect(Object.values(m.counts)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(m.backlog).toEqual({
      pendingAttempts: 0,
      replayPendingAttempts: 0,
      oldestSubmittedAt: null,
      oldestAgeSeconds: null,
    });
    expect(observations.filter((x) => x.kind === "query")).toHaveLength(8);
    expect(await audits()).toEqual([
      {
        actor_id: viewer,
        resource_id: "00000000-0000-4000-8000-000000000000",
        resource_type: "BUSINESS_METRICS",
        changed_fields: [],
      },
    ]);
    expect(Object.keys(m).sort()).toEqual(["asOf", "backlog", "counts", "window"]);
  });
  it("uses inclusive start/exclusive end and never counts CREATED/future starts", async () => {
    const t = Date.now(),
      from = iso(t - 7200000),
      to = iso(t - 3600000),
      v = await universe(1);
    for (const started of [iso(t - 7200001), from, iso(t - 3600001), to, iso(t + 3600000)])
      await notSubmitted({ ...v, user: await user() }, started);
    await notSubmitted({ ...v, user: await user() }, from, "CREATED");
    const m = body(await get(range(from, to)));
    expect(m.counts.startedAttempts).toBe(2);
    expect(m.counts.activeAttempts).toBe(2);
    expect(m.window).toEqual({ from, to, basis: "ATTEMPT_STARTED_AT" });
  });
  it("distinguishes current cohort states from global backlog without consent/archive filters", async () => {
    const t = Date.now(),
      v = await universe(1),
      recent = iso(t - 30000);
    const done = await attempt(v, 1, [[0]], false, recent),
      expiredDone = await attempt(v, 1, [], true, recent);
    await grade(done);
    await grade(expiredDone);
    const terminal = await attempt(v, 1, [], false, recent),
      retry = await attempt(v, 1, [], false, recent);
    await createGradingRecovery(recoveryDb).consume(terminal.raw);
    await createGradingRecovery(recoveryDb).consume(retry.raw);
    await replay(retry);
    await attempt(v, 1, [], false, recent);
    await attempt(v, 1, [], true, recent);
    await notSubmitted({ ...v, user: await user() }, iso(t - 60000));
    await notSubmitted({ ...v, user: await user() }, iso(t - 60000), "IN_PROGRESS", iso(t - 1));
    await notSubmitted({ ...v, user: await user() }, iso(t - 60000), "CREATED");
    const old = await attempt(v, 1, [], false, iso(t - 2 * 86400000));
    await fixture.query(
      `
    UPDATE identity.users
    SET
      enabled = false,
      leaderboard_opt_in = false
    WHERE
      id = $1
  `,
      [v.user],
    );
    await fixture.query(
      `
    UPDATE catalog.exams
    SET
      published = false,
      archived_at = clock_timestamp()
    WHERE
      id = $1
  `,
      [v.exam],
    );
    const m = body(await get(range(iso(t - 3600000), iso(t - 1000))));
    expect(m.counts).toEqual({
      startedAttempts: 8,
      activeAttempts: 1,
      submittedAttempts: 6,
      completedAttempts: 2,
      failedAttempts: 2,
      expiredSubmissions: 2,
      expiredCompletedAttempts: 1,
    });
    expect(m.backlog).toMatchObject({
      pendingAttempts: 4,
      replayPendingAttempts: 1,
      oldestSubmittedAt: old.event.occurredAt,
    });
    expect(m.backlog.oldestAgeSeconds).toBe(
      Math.floor((Date.parse(m.asOf) - Date.parse(old.event.occurredAt)) / 1000),
    );
    for (const secret of [
      "PRIVATE_",
      "@example.test",
      "queueDepth",
      "httpRps",
      "earned",
      "selectedOptionIds",
    ])
      expect(JSON.stringify(m)).not.toContain(secret);
  });
  it("keeps original backlog age across failure/replay then counts completion once after duplicate delivery", async () => {
    const v = await universe(1),
      a = await attempt(v, 2, [[0]]),
      first = body(await get());
    await createGradingRecovery(recoveryDb).consume(a.raw);
    expect(body(await get()).backlog).toMatchObject({
      pendingAttempts: 0,
      oldestSubmittedAt: null,
      oldestAgeSeconds: null,
    });
    await replay(a);
    expect(body(await get()).backlog).toMatchObject({
      pendingAttempts: 1,
      replayPendingAttempts: 1,
      oldestSubmittedAt: first.backlog.oldestSubmittedAt,
    });
    const consumer = createGradingConsumer(gradeDb, createScoringCatalog(gradeDb));
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("completed");
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("duplicate");
    const t = Date.now(),
      m = body(await get(range(iso(t - 3 * 86400000), iso(t - 86400000))));
    expect(m.counts).toMatchObject({
      startedAttempts: 1,
      submittedAttempts: 1,
      completedAttempts: 1,
      failedAttempts: 0,
    });
    expect(m.backlog.pendingAttempts).toBe(0);
  });
  it("preserves compact purged completion counts without a result join", async () => {
    const t = Date.now(),
      v = await universe(1),
      a = await attempt(v, 366, [[0]], true);
    await grade(a);
    const q = range(iso(t - 367 * 86400000), iso(t - 365 * 86400000)),
      before = body(await get(q));
    await purge(a);
    const after = body(await get(q));
    expect(after.counts).toEqual(before.counts);
    expect(after.counts).toMatchObject({ completedAttempts: 1, expiredCompletedAttempts: 1 });
    expect(
      (
        await fixture.query(`
    SELECT
      count(*)::int AS n
    FROM
      assessment.results
  `)
      ).rows[0].n,
    ).toBe(0);
  });
  it("shows only committed state while real grading waits, then fresh complete counts", async () => {
    const t = Date.now(),
      v = await universe(1),
      a = await attempt(v, 1, [[0]], false, iso(t - 30000));
    const holder = await fixture.connect();
    let grading: ReturnType<typeof grade> | undefined;
    try {
      await holder.query("BEGIN");
      await holder.query(
        `
    SELECT
      id
    FROM
      assessment.attempts
    WHERE
      id = $1
    FOR UPDATE
   `,
        [a.id],
      );
      grading = grade(a);
      let blocked = false;
      for (let i = 0; i < 30; i++) {
        blocked = (
          await fixture.query(
            `
    SELECT
      EXISTS (
        SELECT
          1
        FROM
          pg_stat_activity
        WHERE
          usename = $1
          AND wait_event_type = 'Lock'
      ) AS blocked
   `,
            [graderRole],
          )
        ).rows[0].blocked;
        if (blocked) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(blocked).toBe(true);
      expect(body(await get()).counts.completedAttempts).toBe(0);
      expect(body(await get()).backlog.pendingAttempts).toBe(1);
      await holder.query("COMMIT");
      expect((await grading).outcome).toBe("completed");
      const m = body(await get());
      expect(m.counts.completedAttempts).toBe(1);
      expect(m.backlog.pendingAttempts).toBe(0);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
      if (grading) await grading.catch(() => undefined);
    }
  });
  it.each([
    "?from=0000-01-01T00%3A00%3A00.000Z&to=0000-01-02T00%3A00%3A00.000Z",
    "?from=bad",
    "?to=bad",
    "?pageSize=20",
    "?examId=anything",
    "?from=2026-01-01T00%3A00%3A00.000Z&to=2026-02-01T00%3A00%3A00.000Z",
    "?from=2026-01-01T00%3A00%3A00.000Z&from=again&to=2026-01-02T00%3A00%3A00.000Z",
  ])("rejects unpaired/invalid/unknown/duplicate query%s", async (q) => {
    expect((await get(q)).statusCode).toBe(400);
    expect(await audits()).toEqual([]);
  });
  it("rejects future end using the primary clock and accepts exact7day past window", async () => {
    const t = Date.now();
    expect((await get(range(iso(t - 3600000), iso(t + 3600000)))).statusCode).toBe(400);
    expect(await audits()).toEqual([]);
    expect((await get(range(iso(t - 8 * 86400000), iso(t - 86400000)))).statusCode).toBe(200);
  });
  it("denies Candidate/anonymous before parsing and fails closed on audit outage", async () => {
    const who = await user(),
      session = await identity.login(`${who}@example.test`, "ranking fixture password");
    expect(
      (await get("?invalid=true", { cookie: `__Host-access=${session.access}` })).statusCode,
    ).toBe(403);
    expect(
      (await http.inject({ method: "GET", url: "/v1/admin/business-metrics?invalid=true" }))
        .statusCode,
    ).toBe(401);
    await fixture.query("REVOKE INSERT ON platform.audit_logs FROM examination_runtime");
    try {
      const r = await get();
      expect(r.statusCode).toBe(503);
      expect(r.json().data).toBeNull();
    } finally {
      await fixture.query("GRANT INSERT ON platform.audit_logs TO examination_runtime");
    }
    expect(await audits()).toEqual([]);
    expect((await get()).statusCode).toBe(200);
  });
  it("revalidates permission after a prior successful auth before releasing an aggregate", async () => {
    const raw = headers.cookie.slice("__Host-access=".length);
    expect((await identity.authenticate(raw)).permissions).toContain("reporting.read");
    await fixture.query(
      `
   DELETE FROM identity.user_roles
   WHERE
     user_id = $1
     AND role_id = 'ADMIN'
  `,
      [viewer],
    );
    try {
      await expect(
        reader().snapshot({
          raw,
          actorId: viewer,
          correlationId: randomUUID(),
          from: null,
          to: null,
        }),
      ).rejects.toMatchObject({ category: "forbidden" });
      expect(await audits()).toEqual([]);
    } finally {
      await fixture.query(
        `
   INSERT INTO identity.user_roles (user_id, role_id)
   VALUES
     ($1, 'ADMIN')
  `,
        [viewer],
      );
    }
  });
  it("bounds live actor lock wait without a report and recovers", async () => {
    const holder = await fixture.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        `
   SELECT
     id
   FROM
     identity.users
   WHERE
     id = $1
   FOR UPDATE
  `,
        [viewer],
      );
      const start = performance.now(),
        r = await get();
      expect(r.statusCode).toBe(503);
      expect(r.json().data).toBeNull();
      expect(performance.now() - start).toBeLessThan(2500);
      expect(await audits()).toEqual([]);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
    expect((await get()).statusCode).toBe(200);
  });
});
function percentile(raw: number[]) {
  const ordered = [...raw].sort((a, b) => a - b),
    p = (n: number) => ordered[Math.ceil(n * ordered.length) - 1]!;
  return { n: raw.length, p50: p(0.5), p95: p(0.95), p99: p(0.99) };
}
it("records natural100k and1M identity aggregation diagnostics with bounded payload/query count", async () => {
  const v = await universe(1),
    datasets: unknown[] = [];
  let capturedSql = "",
    bindings: unknown[] = [];
  class CapturingDatabase extends PostgresDatabase {
    override async query<T extends QueryResultRow = QueryResultRow>(
      operation: DatabaseOperation,
      statement: string,
      parameters: unknown[] = [],
    ) {
      if (operation === "reporting.read") {
        capturedSql = statement;
        bindings = parameters;
      }
      return super.query<T>(operation, statement, parameters);
    }
  }
  const measured = new CapturingDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    ),
    query = new PostgresBusinessMetricsQuery(measured);
  let previous = 0;
  try {
    for (const n of [100000, 1000000]) {
      const client = await fixture.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `
      INSERT INTO identity.users (id, email, password_hash, email_verified_at)
      SELECT
        ('55555555-5555-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        'metric-' || g || '@cardinality.test',
        $3,
        clock_timestamp()
      FROM
        generate_series($1::int / 10 + 1, $2::int / 10) g
    `,
          [previous, n, hash],
        );
        await client.query(
          `
      INSERT INTO identity.user_roles (user_id, role_id)
      SELECT
        ('55555555-5555-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        'CANDIDATE'
      FROM
        generate_series($1::int / 10 + 1, $2::int / 10) g
    `,
          [previous, n],
        );
        await client.query(
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
        revision
      )
      SELECT
        ('66666666-6666-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        ('55555555-5555-4000-8000-' || lpad(((g - 1) / 10 + 1)::text, 12, '0'))::uuid,
        $3,
        $4,
        CASE WHEN g % 10 = 0 THEN 'IN_PROGRESS' ELSE 'SUBMITTED' END,
        statement_timestamp() - interval '20 minutes' + g * interval '1 millisecond',
        statement_timestamp() + interval '40 minutes' + g * interval '1 millisecond',
        CASE
          WHEN g % 10 <> 0 THEN statement_timestamp() - interval '19 minutes'
            + g * interval '1 millisecond'
          ELSE NULL
        END,
        CASE WHEN g % 10 <> 0 THEN gen_random_uuid() ELSE NULL END,
        CASE WHEN g % 10 <> 0 THEN gen_random_uuid() ELSE NULL END,
        CASE WHEN g % 10 <> 0 THEN 'MANUAL' ELSE NULL END,
        1
      FROM
        generate_series($1::int + 1, $2::int) g
    `,
          [previous, n, v.exam, v.version],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      previous = n;
      await fixture.query("ANALYZE assessment.attempts");
      for (let i = 0; i < 3; i++) await query.snapshot({ from: null, to: null });
      const raw: number[] = [],
        start = performance.now(),
        cpuStart = process.cpuUsage();
      for (let i = 0; i < 20; i++) {
        const at = performance.now(),
          value = await query.snapshot({ from: null, to: null });
        expect(value.counts.startedAttempts).toBe(String(n));
        expect(value.counts.pendingAttempts).toBe(String((n * 9) / 10));
        raw.push(performance.now() - at);
      }
      const elapsedMs = performance.now() - start,
        cpu = process.cpuUsage(cpuStart);
      const plan = (
        await measured.query(
          "diagnostic",
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${capturedSql}`,
          bindings,
        )
      ).rows[0]!["QUERY PLAN"];
      const latency: number[] = [],
        transactions: number[] = [],
        acquire: number[] = [],
        bytes: number[] = [];
      let window = 0,
        httpCpuStart = process.cpuUsage();
      for (let i = 0; i < 23; i++) {
        await new Promise((r) => setTimeout(r, 110));
        observations.length = 0;
        const at = performance.now();
        if (i === 3) {
          window = at;
          httpCpuStart = process.cpuUsage();
        }
        const r = await http.inject({ method: "GET", url: "/v1/admin/business-metrics", headers });
        expect(r.statusCode).toBe(200);
        expect(body(r).counts.startedAttempts).toBe(n);
        expect(observations.filter((x) => x.kind === "query")).toHaveLength(8);
        expect(Buffer.byteLength(r.payload)).toBeLessThan(4096);
        if (i >= 3) {
          latency.push(performance.now() - at);
          bytes.push(Buffer.byteLength(r.payload));
          transactions.push(
            ...observations.filter((x) => x.kind === "transaction").map((x) => x.durationMs),
          );
          acquire.push(
            ...observations.filter((x) => x.kind === "acquire").map((x) => x.durationMs),
          );
        }
      }
      const httpElapsedMs = performance.now() - window,
        httpCpu = process.cpuUsage(httpCpuStart);
      datasets.push({
        attempts: n,
        candidates: n / 10,
        attemptsPerCandidate: 10,
        syntheticCardinality: true,
        realLifecycleLoad: false,
        producerProjectionsSeeded: false,
        query: {
          warmups: 3,
          rawLatencyMs: raw,
          latencyMs: percentile(raw),
          elapsedMs,
          sequentialRps: 20000 / elapsedMs,
          harnessCpuMsPerQuery: (cpu.user + cpu.system) / 1000 / 20,
          plan,
        },
        http: {
          warmups: 3,
          rawLatencyMs: latency,
          latencyMs: percentile(latency),
          rawPayloadBytes: bytes,
          payloadBytes: percentile(bytes),
          rawTransactionMs: transactions,
          transactionMs: percentile(transactions),
          rawAcquireMs: acquire,
          acquireMs: percentile(acquire),
          sqlCalls: 8,
          paceMs: 110,
          elapsedMs: httpElapsedMs,
          achievedSuccessfulRps: 20000 / httpElapsedMs,
          harnessCpuMsPerRequest: (httpCpu.user + httpCpu.system) / 1000 / 20,
          errors: 0,
        },
        rssBytes: process.memoryUsage().rss,
      });
    }
    const directory = process.env.ADMIN_BUSINESS_METRICS_EVIDENCE_DIR;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/diagnostic-${randomUUID()}.json`,
        JSON.stringify(
          {
            localOnly: true,
            notCapacityEvidence: true,
            nodeVersion: process.version,
            architecture: process.arch,
            poolMax: 2,
            sqlSha256: createHash("sha256").update(capturedSql).digest("hex"),
            datasets,
            databaseCpu: null,
            databaseIops: null,
            allocationPerRequest: null,
            sustainableRps: null,
            concurrentCapacity: null,
            awsCostPerHour: null,
            costPerMillionRequests: null,
            decision:
              "Existing-index full-scan baseline; no optimization or production sizing winner. Compare sustained/skewed concurrent reports with primary workload before new indexes/projections/cache.",
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await measured.close();
  }
}, 180000);
