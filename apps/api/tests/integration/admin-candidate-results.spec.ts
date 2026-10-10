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

import { CandidateResultsController } from "../../src/modules/reporting/presentation/http/candidate-results.controller";
import { CandidateResultsService } from "../../src/modules/reporting/application/services/candidate-results.service";
import { CandidateResultsPage } from "../../src/modules/reporting/application/dto/candidate-results.dto";
import { PostgresCandidateResultsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-candidate-results.query";
import { CandidateResultsCrypto } from "../../src/modules/reporting/infrastructure/security/candidate-results-cursor";
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
const name = "candidate_results_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "bl_ddl_" + suffix,
  runtimeRole = "bl_api_" + suffix,
  graderRole = "bl_grade_" + suffix,
  maintenanceRole = "bl_maintenance_" + suffix,
  recoveryRole = "bl_recovery_" + suffix,
  operatorRole = "bl_operator_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const crypto = new CandidateResultsCrypto(randomBytes(32)),
  observations: DatabaseObservation[] = [];
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
  new CandidateResultsService(
    identity,
    new PostgresCandidateResultsQuery(db),
    crypto,
    security,
    db,
  );
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
    controllers: [CandidateResultsController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: CandidateResultsService, useValue: reader() },
    ],
  })
  class RankingHttpModule {}
  api = await createHttpApplication(RankingHttpModule);
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
  validate = ajv.compile(document.components.schemas.CandidateResultPairListEnvelope!);
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
async function get(v: Universe, query = "", h = headers) {
  await new Promise((r) => setTimeout(r, 110));
  return http.inject({
    method: "GET",
    url: `/v1/admin/exams/${v.exam}/versions/${v.version}/candidate-results${query}`,
    headers: h,
  });
}
function body(response: Awaited<ReturnType<typeof get>>): CandidateResultsPage {
  const value = response.json();
  if (response.statusCode === 200 && !validate(value))
    throw new Error(JSON.stringify(validate.errors));
  return { items: value.data, metadata: value.metadata };
}
async function audits(v: Universe) {
  return (
    await fixture.query(
      `
    SELECT
      actor_id,
      resource_type,
      correlation_id,
      changed_fields
    FROM
      platform.audit_logs
    WHERE
      resource_id = $1
      AND action = 'reporting.candidate-results.read'
  `,
      [v.version],
    )
  ).rows;
}

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
describe("Admin retained best/latest on real primary PostgreSQL", () => {
  it("returns an audited empty exact version and404 for missing/foreign versions", async () => {
    const v = await universe(),
      other = await universe();
    const response = await get(v);
    expect(response.statusCode).toBe(200);
    expect(body(response)).toEqual({ items: [], metadata: { pageSize: 20, next: null } });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(await audits(v)).toEqual([
      expect.objectContaining({
        actor_id: viewer,
        resource_type: "EXAM_VERSION",
        changed_fields: [],
      }),
    ]);
    expect((await get({ ...v, version: other.version })).statusCode).toBe(404);
    expect((await get({ ...v, version: randomUUID() })).statusCode).toBe(404);
  });
  it("separates highest completed score from latest submission, preserving zero and pending/FAILED", async () => {
    const v = await universe(),
      older = await attempt(v, 1, [[0], [0, 1], [0]], false, "2025-01-01T00:00:00.000Z"),
      recent = await attempt(v, 1, [[1], [1], []], false, "2025-01-02T00:00:00.000Z");
    expect((await grade(recent)).outcome).toBe("completed");
    expect((await grade(older)).outcome).toBe("completed");
    let pair = body(await get(v)).items[0]!;
    expect(pair.best).toMatchObject({
      attemptId: older.id,
      status: "COMPLETED",
      earned: 3,
      possible: 3,
    });
    expect(pair.latest).toMatchObject({
      attemptId: recent.id,
      status: "COMPLETED",
      earned: 0,
      possible: 3,
    });
    const pending = await attempt(v, 1, [], false, "2025-01-03T00:00:00.000Z");
    pair = body(await get(v)).items[0]!;
    expect(pair.latest).toMatchObject({
      attemptId: pending.id,
      status: "SUBMITTED",
      earned: null,
      possible: null,
    });
    expect((await createGradingRecovery(recoveryDb).consume(pending.raw)).outcome).toBe("terminal");
    pair = body(await get(v)).items[0]!;
    expect(pair.best?.attemptId).toBe(older.id);
    expect(pair.latest.status).toBe("FAILED");
    for (const secret of [
      "PRIVATE_DISPLAY_NAME",
      "PRIVATE_EXPLANATION",
      "@retention.test",
      "correctOptionIds",
      "selectedOptionIds",
      "failureCode",
    ])
      expect(JSON.stringify(pair)).not.toContain(secret);
    expect(Object.keys(pair).sort()).toEqual(
      ["candidateId", "publishedVersionId", "best", "latest"].sort(),
    );
  });
  it("resolves score/time ties by attempt UUID and ignores worker completion order", async () => {
    const v = await universe(1),
      a = await attempt(v, 1, [[0]], false, "2025-02-01T00:00:00.000Z"),
      b = await attempt(v, 1, [[0]], false, "2025-02-01T00:00:00.000Z"),
      later = await attempt(v, 1, [[0]], false, "2025-02-02T00:00:00.000Z");
    for (const x of [later, b, a]) await grade(x);
    const pair = body(await get(v)).items[0]!;
    expect(pair.best?.attemptId).toBe([a.id, b.id].sort()[0]);
    expect(pair.latest.attemptId).toBe(later.id);
    const tied = await universe(1),
      x = await attempt(tied, 1, [], false, "2025-02-01T00:00:00.000Z"),
      y = await attempt(tied, 1, [], false, "2025-02-01T00:00:00.000Z");
    expect(body(await get(tied)).items[0]!.latest.attemptId).toBe([x.id, y.id].sort().at(-1));
  });
  it("keeps latest stable across replay generations and duplicate delivery", async () => {
    const v = await universe(1),
      a = await attempt(v);
    await createGradingRecovery(recoveryDb).consume(a.raw);
    const first = body(await get(v)).items[0]!;
    expect(first.best).toBeNull();
    expect(first.latest.status).toBe("FAILED");
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
    ).rows[0]!.revision as number;
    const replay = await createGradingReplay(operatorDb).replay(
      a.id,
      revision,
      viewer,
      "Dependency restored",
      randomUUID(),
    );
    expect(replay.generation).toBe(1);
    const consumer = createGradingConsumer(gradeDb, createScoringCatalog(gradeDb));
    expect((await consumer.consume(a.raw, 0)).outcome).toBe("stale");
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("completed");
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("duplicate");
    const after = body(await get(v)).items[0]!;
    expect(after.best?.attemptId).toBe(a.id);
    expect(after.latest.submittedAt).toBe(first.latest.submittedAt);
  });
  it("includes expired completion, opt-out/disabled candidates and archived versions without merging versions", async () => {
    const v = await universe(1),
      v2 = await universe(1, 2, v.exam),
      expired = await attempt(v, 1, [], true);
    await grade(expired);
    await grade(await attempt({ ...v2, user: v.user }, 1, [[0]]));
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
    const pair = body(await get(v)).items[0]!;
    expect(pair).toMatchObject({
      candidateId: v.user,
      publishedVersionId: v.version,
      best: { attemptId: expired.id, expired: true, earned: 0 },
      latest: { attemptId: expired.id, expired: true },
    });
    expect(body(await get(v2)).items[0]!.best?.earned).toBe(1);
  });
  it("excludes unsubmitted candidates and returns best:null for pending/failed-only candidates", async () => {
    const v = await universe(1);
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
        revision
      )
      VALUES
        ($1, $2, $3, $4, 'IN_PROGRESS', clock_timestamp(), clock_timestamp() + interval '1 hour', 1)
    `,
      [randomUUID(), v.user, v.exam, v.version],
    );
    expect(body(await get(v)).items).toEqual([]);
    const a = await attempt(v);
    expect(body(await get(v)).items[0]!.best).toBeNull();
    await createGradingRecovery(recoveryDb).consume(a.raw);
    expect(body(await get(v)).items[0]).toMatchObject({
      best: null,
      latest: { status: "FAILED", earned: null, possible: null },
    });
  });
  it("reads old committed best/latest while real grading is blocked, then fresh atomic selection", async () => {
    const v = await universe(1),
      old = await attempt(v, 1, [], false, "2025-01-01T00:00:00.000Z");
    await grade(old);
    const next = await attempt(v, 1, [[0]], false, "2025-01-02T00:00:00.000Z");
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
        [next.id],
      );
      grading = grade(next);
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
        ).rows[0]!.blocked;
        if (blocked) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(blocked).toBe(true);
      expect(body(await get(v)).items[0]).toMatchObject({
        best: { attemptId: old.id, earned: 0 },
        latest: { attemptId: next.id, status: "SUBMITTED", earned: null },
      });
      await holder.query("COMMIT");
      expect((await grading).outcome).toBe("completed");
      expect(body(await get(v)).items[0]).toMatchObject({
        best: { attemptId: next.id, earned: 1 },
        latest: { attemptId: next.id, earned: 1 },
      });
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
      if (grading) await grading.catch(() => undefined);
    }
  });
  it("purges real best/latest payloads without repeating a candidate below the old cursor", async () => {
    const v = await universe(1),
      ids = [v.user, await user(), await user()].sort();
    const first = { ...v, user: ids[0]! },
      older = await attempt(first, 366, [[0]]),
      survivor = await attempt(first, 1, []);
    await grade(older);
    await grade(survivor);
    for (const id of ids.slice(1)) await grade(await attempt({ ...v, user: id }, 1, []));
    const page = body(await get(v, "?pageSize=1"));
    expect(page.items[0]!.candidateId).toBe(ids[0]);
    expect(page.items[0]!.best?.attemptId).toBe(older.id);
    await purge(older);
    const after = body(await get(v));
    expect(after.items[0]!.best?.attemptId).toBe(survivor.id);
    const continuation = body(await get(v, `?pageSize=1&cursor=${page.metadata.next}`));
    expect(continuation.items[0]!.candidateId).toBe(ids[1]);
    expect((await grade(older)).outcome).toBe("duplicate");
    const only = await universe(1),
      a = await attempt(only, 366);
    await grade(a);
    await purge(a);
    expect(body(await get(only)).items).toEqual([]);
  });
  it("binds cursors to actor/exam/version/pageSize/order with fixed original expiry", async () => {
    const v = await universe(1);
    for (let i = 0; i < 3; i++) await attempt({ ...v, user: await user() });
    const page = body(await get(v, "?pageSize=1")),
      token = page.metadata.next!;
    expect(token).not.toContain(v.user);
    expect(body(await get(v, `?pageSize=1&cursor=${token}`)).items[0]!.candidateId).not.toBe(
      page.items[0]!.candidateId,
    );
    for (const query of [`?pageSize=2&cursor=${token}`, `?pageSize=1&cursor=!${token}`])
      expect((await get(v, query)).statusCode).toBe(400);
    const other = await universe(1);
    expect((await get(other, `?pageSize=1&cursor=${token}`)).statusCode).toBe(400);
    const state = crypto.read(
      token,
      { actorId: viewer, examId: v.exam, versionId: v.version, pageSize: 1 },
      0,
    );
    const expired = crypto.sign(
      { actorId: viewer, examId: v.exam, versionId: v.version, pageSize: 1 },
      {
        ...state,
        watermark: "2020-01-01T00:00:00.000Z",
        expiresAt: Date.parse("2020-01-01T00:00:00.000Z") + 900000,
      },
    );
    expect((await get(v, `?pageSize=1&cursor=${expired}`)).statusCode).toBe(400);
  });
  it.each([
    "?pageSize=0",
    "?pageSize=101",
    "?pageSize=1.5",
    "?candidateId=anything",
    "?selection=BEST",
  ])("rejects unknown or unbounded query%s", async (query) =>
    expect((await get(await universe(1), query)).statusCode).toBe(400),
  );
  it("requires current permission, fails closed on audit outage and preserves the source completion guard", async () => {
    const v = await universe(1),
      a = await attempt(v);
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
      expect((await get(v)).statusCode).toBe(403);
      expect(await audits(v)).toEqual([]);
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
    await fixture.query("REVOKE INSERT ON platform.audit_logs FROM examination_runtime");
    try {
      const r = await get(v);
      expect(r.statusCode).toBe(503);
      expect(r.json().data).toBeNull();
    } finally {
      await fixture.query("GRANT INSERT ON platform.audit_logs TO examination_runtime");
    }
    expect(await audits(v)).toEqual([]);
    await expect(
      fixture.query(
        `
      UPDATE assessment.attempts
      SET
        status = 'COMPLETED'
      WHERE
        id = $1
    `,
        [a.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    const response = await get(v);
    expect(response.statusCode).toBe(200);
    expect(body(response).items[0]).toMatchObject({
      best: null,
      latest: { status: "SUBMITTED", earned: null },
    });
  });
});

it("records natural best/latest plans and local diagnostics on100k constrained attempts", async () => {
  const target = await universe(1),
    c = await fixture.connect();
  try {
    await c.query("BEGIN");
    await c.query(`
      INSERT INTO identity.users (id, email, password_hash, email_verified_at)
      SELECT
        ('33333333-3333-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        'bl-cardinality-' || g || '@example.test',
        'fixture-only',
        statement_timestamp()
      FROM
        generate_series(1, 10000) g
    `);
    await c.query(
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
      SELECT
        ('44444444-4444-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        ('33333333-3333-4000-8000-' || lpad(((g - 1) / 10 + 1)::text, 12, '0'))::uuid,
        $1,
        $2,
        'SUBMITTED',
        '2025-01-01Z'::timestamptz + g * interval '1 second',
        '2025-01-01Z'::timestamptz + g * interval '1 second' + interval '1 hour',
        '2025-01-01Z'::timestamptz + g * interval '1 second' + interval '1 minute',
        gen_random_uuid(),
        gen_random_uuid(),
        'MANUAL',
        false,
        1
      FROM
        generate_series(1, 100000) g
    `,
      [target.exam, target.version],
    );
    await c.query(
      `
      INSERT INTO assessment.results (
        attempt_id,
        version_id,
        user_id,
        earned_points,
        possible_points,
        correct_count,
        question_count
      )
      SELECT
        a.id,
        a.version_id,
        a.user_id,
        right(a.id::text, 12)::integer % 2,
        1,
        right(a.id::text, 12)::integer % 2,
        1
      FROM
        assessment.attempts a
      WHERE
        a.version_id = $1
    `,
      [target.version],
    );
    await c.query(
      `
      INSERT INTO assessment.result_sections (
        attempt_id,
        version_id,
        section_id,
        earned_points,
        possible_points
      )
      SELECT
        r.attempt_id,
        r.version_id,
        s.id,
        r.earned_points,
        1
      FROM
        assessment.results r
        JOIN catalog.published_sections s ON s.version_id = r.version_id
      WHERE
        r.version_id = $1
    `,
      [target.version],
    );
    await c.query(
      `
      INSERT INTO assessment.result_questions (
        attempt_id,
        version_id,
        question_id,
        earned_points,
        correct,
        answered
      )
      SELECT
        r.attempt_id,
        r.version_id,
        q.id,
        r.earned_points,
        r.correct_count = 1,
        true
      FROM
        assessment.results r
        JOIN catalog.published_questions q ON q.version_id = r.version_id
      WHERE
        r.version_id = $1
    `,
      [target.version],
    );
    await c.query(
      `
      UPDATE assessment.attempts
      SET
        status = 'COMPLETED',
        revision = revision + 1
      WHERE
        version_id = $1
    `,
      [target.version],
    );
    await c.query("COMMIT");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
  for (const table of ["assessment.attempts", "assessment.results", "catalog.published_versions"])
    await fixture.query(`ANALYZE ${table}`); // fixed trusted fixture table names
  let sql = "",
    bindings: unknown[] = [];
  class CapturingDatabase extends PostgresDatabase {
    override async query<T extends QueryResultRow = QueryResultRow>(
      operation: DatabaseOperation,
      statement: string,
      parameters: unknown[] = [],
    ) {
      if (operation === "reporting.read") {
        sql = statement;
        bindings = parameters;
      }
      return super.query<T>(operation, statement, parameters);
    }
  }
  const measured = new CapturingDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    ),
    query = new PostgresCandidateResultsQuery(measured);
  function metrics(raw: number[]) {
    const sorted = [...raw].sort((a, b) => a - b),
      percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1]!;
    return { n: raw.length, p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) };
  }
  async function sample(position: string | null, limit: number) {
    const input = {
      examId: target.exam,
      versionId: target.version,
      watermark: null,
      position,
      limit,
    };
    for (let i = 0; i < 5; i++) await query.page(input);
    const raw: number[] = [],
      cpuStart = process.cpuUsage(),
      window = performance.now();
    for (let i = 0; i < 40; i++) {
      const at = performance.now(),
        page = await query.page(input);
      expect(page.rows).toHaveLength(limit);
      expect(
        page.rows.every(
          (r) =>
            r.best?.earned === 1 &&
            r.latest.earned === 0 &&
            r.best.attemptId !== r.latest.attemptId,
        ),
      ).toBe(true);
      raw.push(performance.now() - at);
    }
    const elapsedMs = performance.now() - window,
      cpu = process.cpuUsage(cpuStart);
    const plan = (
      await measured.query("diagnostic", `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, bindings)
    ).rows[0]!["QUERY PLAN"];
    return {
      rawLatencyMs: raw,
      latencyMs: metrics(raw),
      elapsedMs,
      sequentialRps: 40000 / elapsedMs,
      harnessCpuMsPerQuery: (cpu.user + cpu.system) / 1000 / 40,
      plan,
    };
  }
  try {
    const querySamples = {
      first20: await sample(null, 21),
      maximum100: await sample(null, 101),
      continuationAfter5000: await sample("33333333-3333-4000-8000-000000005000", 101),
    };
    const latency: number[] = [],
      bytes: number[] = [],
      transactions: number[] = [],
      acquire: number[] = [];
    let window = 0,
      cpuStart = process.cpuUsage();
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 110));
      observations.length = 0;
      const at = performance.now();
      if (i === 5) {
        window = at;
        cpuStart = process.cpuUsage();
      }
      const response = await http.inject({
        method: "GET",
        url: `/v1/admin/exams/${target.exam}/versions/${target.version}/candidate-results?pageSize=100`,
        headers,
      });
      expect(response.statusCode).toBe(200);
      expect(body(response).items).toHaveLength(100);
      expect(observations.filter((r) => r.kind === "query")).toHaveLength(8);
      expect(Buffer.byteLength(response.payload)).toBeLessThan(128 * 1024);
      if (i >= 5) {
        latency.push(performance.now() - at);
        bytes.push(Buffer.byteLength(response.payload));
        transactions.push(
          ...observations.filter((r) => r.kind === "transaction").map((r) => r.durationMs),
        );
        acquire.push(...observations.filter((r) => r.kind === "acquire").map((r) => r.durationMs));
      }
    }
    const elapsedMs = performance.now() - window,
      cpu = process.cpuUsage(cpuStart);
    const evidence = {
      localOnly: true,
      notCapacityEvidence: true,
      nodeVersion: process.version,
      cpuArchitecture: process.arch,
      dataset: {
        candidates: 10000,
        attempts: 100000,
        attemptsPerCandidate: 10,
        versions: 1,
        syntheticCardinality: true,
        realLifecycleLoad: false,
        producerProjectionsSeeded: false,
      },
      sqlSha256: createHash("sha256").update(sql).digest("hex"),
      querySamples,
      http: {
        rawLatencyMs: latency,
        latencyMs: metrics(latency),
        rawPayloadBytes: bytes,
        payloadBytes: metrics(bytes),
        rawTransactionMs: transactions,
        transactionMs: metrics(transactions),
        rawAcquireMs: acquire,
        acquireMs: metrics(acquire),
        sqlCalls: 8,
        pollingPaceMs: 110,
        elapsedMs,
        achievedSuccessfulRps: 30000 / elapsedMs,
        harnessCpuMsPerRequest: (cpu.user + cpu.system) / 1000 / 30,
        errors: 0,
        scope:
          "Maximum100-candidate pair inject/real Identity/restricted primary PG; combined Jest CPU, no TCP/TLS/ALB; pace outside latency and inside RPS",
      },
      rssBytes: process.memoryUsage().rss,
      allocationBytesPerRequest: null,
      databaseCpu: null,
      utilization: null,
      sustainableRps: null,
      concurrentCapacity: null,
      awsCostPerHour: null,
      costPerMillionRequests: null,
      decision:
        "Baseline only; no matched index/resource comparison or optimization/capacity/cost winner.",
    };
    const directory = process.env.ADMIN_CANDIDATE_RESULTS_EVIDENCE_DIR;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/diagnostic-${randomUUID()}.json`,
        JSON.stringify(evidence, null, 2) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await measured.close();
  }
}, 120000);

it("revalidates permission inside UoW after prior successful authentication", async () => {
  const v = await universe(),
    raw = headers.cookie.slice("__Host-access=".length);
  expect((await identity.authenticate(raw)).permissions).toContain("reporting.read");
  const service = new CandidateResultsService(
    {
      authenticate: identity.authenticate.bind(identity),
      requirePermission: identity.requirePermission.bind(identity),
      revalidate: async (credential, permission) => {
        await fixture.query(
          `
          DELETE FROM identity.user_roles
          WHERE
            user_id = $1
            AND role_id = 'ADMIN'
        `,
          [viewer],
        );
        return identity.revalidate(credential, permission);
      },
    },
    new PostgresCandidateResultsQuery(db),
    crypto,
    security,
    db,
  );
  try {
    await expect(
      service.page({
        raw,
        actorId: viewer,
        examId: v.exam,
        versionId: v.version,
        pageSize: 20,
        cursor: null,
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ category: "forbidden" });
    expect(await audits(v)).toEqual([]);
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
it("bounds actor-lock wait without returning a report, then recovers", async () => {
  const v = await universe(),
    holder = await fixture.connect();
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
    const at = performance.now(),
      response = await get(v);
    expect(response.statusCode).toBe(503);
    expect(response.json().data).toBeNull();
    expect(performance.now() - at).toBeLessThan(2500);
    expect(await audits(v)).toEqual([]);
  } finally {
    await holder.query("ROLLBACK");
    holder.release();
  }
  expect((await get(v)).statusCode).toBe(200);
});
