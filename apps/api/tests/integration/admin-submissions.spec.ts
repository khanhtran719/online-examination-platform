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

import { SubmissionsController } from "../../src/modules/reporting/presentation/http/submissions.controller";
import { SubmissionsService } from "../../src/modules/reporting/application/services/submissions.service";
import { SubmissionPage } from "../../src/modules/reporting/application/dto/submissions.dto";
import { PostgresSubmissionsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-submissions.query";
import { SubmissionsCrypto } from "../../src/modules/reporting/infrastructure/security/submissions-cursor";
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = "submissions_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "as_ddl_" + suffix,
  runtimeRole = "as_api_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const crypto = new SubmissionsCrypto(randomBytes(32)),
  observations: DatabaseObservation[] = [];
let fixture: Pool, db: PostgresDatabase, identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string,
  viewer: string,
  headers: { cookie: string },
  validate: ValidateFunction,
  validateResult: ValidateFunction;
let security: PostgresSecurity;
const reader = () =>
  new SubmissionsService(identity, new PostgresSubmissionsQuery(db), crypto, security, db);
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
interface Version {
  examId: string;
  versionId: string;
}
async function version(enabled = true, examId?: string): Promise<Version> {
  const exam = examId ?? randomUUID(),
    id = randomUUID(),
    section = randomUUID(),
    question = randomUUID(),
    option = randomUUID();
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    if (!examId)
      await c.query(
        `
      INSERT INTO
        catalog.exams (id, title, category, duration_seconds, attempt_limit, opens_at, closes_at)
      VALUES
        ($1, 'Ranking', 'IT_CERTIFICATION', 600, 10, '2020-01-01Z', '2030-01-01Z')
    `,
        [exam],
      );
    await c.query(
      `
      INSERT INTO
        catalog.published_versions (
          id, exam_id, version, title, description, duration_seconds, attempt_limit,
          opens_at, closes_at, display_timezone, explanation_policy, leaderboard_enabled, published_by
        )
      VALUES
        ($1, $2, $3, 'Ranking', '', 600, 10, '2020-01-01Z', '2030-01-01Z', 'UTC', 'NEVER', $4, $5)
    `,
      [id, exam, examId ? 2 : 1, enabled, viewer],
    );
    await c.query(
      `
      INSERT INTO
        catalog.published_sections (version_id, id, title, position)
      VALUES
        ($1, $2, 'One', 1)
    `,
      [id, section],
    );
    await c.query(
      `
      INSERT INTO
        catalog.published_questions (
          version_id, id, section_id, source_question_id, source_revision,
          type, prompt, explanation, points, position
        )
      VALUES
        ($1, $2, $3, $4, 1, 'SINGLE_CHOICE', 'Question', 'PRIVATE_EXPLANATION', 100, 1)
    `,
      [id, question, section, randomUUID()],
    );
    await c.query(
      `
      INSERT INTO
        catalog.published_options (version_id, question_id, id, position, text)
      VALUES
        ($1, $2, $3, 1, 'A'), ($1, $2, $4, 2, 'B')
    `,
      [id, question, option, randomUUID()],
    );
    await c.query(
      `
      INSERT INTO
        catalog.published_answer_keys (version_id, question_id, option_id)
      VALUES
        ($1, $2, $3)
    `,
      [id, question, option],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return { examId: exam, versionId: id };
}
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [login, group] of [
    [owner, "examination_owner"],
    [runtimeRole, "examination_runtime"],
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
    controllers: [SubmissionsController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: SubmissionsService, useValue: reader() },
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
  validate = ajv.compile(document.components.schemas.AdminSubmissionListEnvelope!);
  validateResult = ajv.compile(document.components.schemas.ResultEnvelope!);
});
afterAll(async () => {
  await api?.app.close();
  await db?.close();
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
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}`);
  await admin.end();
});

async function attempt(
  v: Version,
  status = "IN_PROGRESS",
  at?: string,
  deadline?: string,
  existingCandidateId?: string,
) {
  const candidateId = existingCandidateId ?? (await user(false)),
    id = randomUUID();
  const started = at ?? new Date(Date.now() - 10000).toISOString();
  const end = deadline ?? new Date(Date.now() + 600000).toISOString();
  const submitted = ["SUBMITTED", "FAILED", "EXPIRED"].includes(status);
  await fixture.query(
    `
    INSERT INTO
      assessment.attempts (
        id, user_id, exam_id, version_id, status, started_at, deadline,
        submitted_at, submission_id, submission_event_id, submission_kind, revision, expired
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12)
  `,
    [
      id,
      candidateId,
      v.examId,
      v.versionId,
      status,
      started,
      end,
      submitted ? (status === "EXPIRED" ? end : started) : null,
      submitted ? randomUUID() : null,
      submitted ? randomUUID() : null,
      submitted ? (status === "EXPIRED" ? "DEADLINE" : "MANUAL") : null,
      status === "EXPIRED",
    ],
  );
  return { id, candidateId };
}
async function get(examId: string, query = "", h = headers) {
  await new Promise((r) => setTimeout(r, 110));
  return http.inject({
    method: "GET",
    url: `/v1/admin/exams/${examId}/submissions${query}`,
    headers: h,
  });
}
function body(response: Awaited<ReturnType<typeof get>>): SubmissionPage {
  const value = response.json();
  if (response.statusCode === 200 && !validate(value))
    throw new Error(JSON.stringify(validate.errors));
  return { items: value.data, metadata: value.metadata };
}

async function audits(examId: string) {
  return (
    await fixture.query(
      `
    SELECT
      actor_id,
      resource_id,
      resource_type,
      correlation_id,
      outcome,
      changed_fields
    FROM
      platform.audit_logs
    WHERE
      action = 'reporting.submissions.read'
      AND resource_id = $1
  `,
      [examId],
    )
  ).rows;
}
async function result(id: string, h = headers, query = "") {
  await new Promise((r) => setTimeout(r, 110));
  const response = await http.inject({
    method: "GET",
    url: `/v1/admin/attempts/${id}/result${query}`,
    headers: h,
  });
  if (response.statusCode === 200 && !validateResult(response.json()))
    throw new Error(JSON.stringify(validateResult.errors));
  return response;
}
async function complete(
  v: Version,
  a: Awaited<ReturnType<typeof attempt>>,
  earned = 100,
  client?: import("pg").PoolClient,
) {
  const c = client ?? (await fixture.connect());
  try {
    if (!client) await c.query("BEGIN");
    await c.query(
      `
      UPDATE assessment.attempts
      SET
        status = 'COMPLETED',
        submitted_at = coalesce(submitted_at, clock_timestamp()),
        submission_id = coalesce(submission_id, gen_random_uuid()),
        submission_event_id = coalesce(submission_event_id, gen_random_uuid()),
        submission_kind = coalesce(submission_kind, 'MANUAL'),
        revision = revision + 1
      WHERE
        id = $1
    `,
      [a.id],
    );
    await c.query(
      `
      INSERT INTO
        assessment.results (
          attempt_id,
          version_id,
          user_id,
          earned_points,
          possible_points,
          correct_count,
          question_count
        )
      VALUES
        ($1, $2, $3, $4, 100, $5, 1)
    `,
      [a.id, v.versionId, a.candidateId, earned, earned === 100 ? 1 : 0],
    );
    await c.query(
      `
      INSERT INTO
        assessment.result_sections (attempt_id, version_id, section_id, earned_points, possible_points)
      SELECT
        $1, version_id, id, $3, 100
      FROM
        catalog.published_sections
      WHERE
        version_id = $2
    `,
      [a.id, v.versionId, earned],
    );
    await c.query(
      `
      INSERT INTO
        assessment.result_questions (attempt_id, version_id, question_id, earned_points, correct, answered)
      SELECT
        $1, version_id, id, $3, $3::int = 100, true
      FROM
        catalog.published_questions
      WHERE
        version_id = $2
    `,
      [a.id, v.versionId, earned],
    );
    if (!client) await c.query("COMMIT");
  } catch (e) {
    if (!client) await c.query("ROLLBACK");
    throw e;
  } finally {
    if (!client) c.release();
  }
}
describe("Admin score and submission semantics", () => {
  it("lists every attempt across frozen versions, filters version scope and never turns unfinished scores into zero", async () => {
    const v = await version(),
      v2 = await version(false, v.examId),
      other = await version();
    const rows = [];
    for (const status of ["CREATED", "IN_PROGRESS", "SUBMITTED", "EXPIRED", "FAILED"])
      rows.push(await attempt(v, status));
    const zero = await attempt(v2, "SUBMITTED"),
      full = await attempt(v2, "SUBMITTED", undefined, undefined, zero.candidateId);
    await complete(v2, zero, 0);
    await complete(v2, full);
    await attempt(other);
    await fixture.query(
      `
      UPDATE catalog.exams
      SET
        published = false,
        archived_at = clock_timestamp()
      WHERE
        id = $1
    `,
      [v.examId],
    );
    const page = body(await get(v.examId));
    expect(page.items).toHaveLength(7);
    for (const row of page.items) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "candidateId",
          "attemptId",
          "publishedVersionId",
          "submittedAt",
          "status",
          "expired",
          "earned",
          "possible",
        ].sort(),
      );
      if (row.status === "COMPLETED") expect(row.possible).toBe(100);
      else expect([row.earned, row.possible]).toEqual([null, null]);
      if (["CREATED", "IN_PROGRESS"].includes(row.status)) expect(row.submittedAt).toBeNull();
    }
    expect(page.items.find((r) => r.attemptId === zero.id)?.earned).toBe(0);
    expect(body(await get(v.examId, `?publishedVersionId=${v2.versionId}`)).items).toHaveLength(2);
    expect((await get(v.examId, `?publishedVersionId=${other.versionId}`)).statusCode).toBe(404);
    expect((await get(v.examId, `?publishedVersionId=${randomUUID()}`)).statusCode).toBe(404);
    const score = await result(zero.id);
    expect(score.statusCode).toBe(200);
    expect(score.json().data).toMatchObject({
      earned: 0,
      possible: 100,
      correct: 0,
      total: 1,
      percentageBasisPoints: 0,
      review: null,
      sections: [{ earned: 0, possible: 100, correct: 0, total: 1 }],
    });
    for (const secret of [
      "PRIVATE_DISPLAY_NAME",
      "PRIVATE_EXPLANATION",
      "correctOptionIds",
      "selectedOptionIds",
      "@example.test",
      "failureCode",
    ])
      expect(JSON.stringify(page.items) + score.payload).not.toContain(secret);
    for (const row of rows) expect((await result(row.id)).statusCode).toBe(409);
    expect((await result(randomUUID())).statusCode).toBe(404);
  });
  it("returns old committed state while grading holds the attempt lock, then fresh atomic scores on continuation", async () => {
    const v = await version(),
      a = await attempt(v, "SUBMITTED", "2026-01-01T00:00:00.000Z"),
      b = await attempt(v, "SUBMITTED", "2026-01-02T00:00:00.000Z");
    const first = body(await get(v.examId, "?pageSize=1"));
    expect(first.items[0]?.attemptId).toBe(b.id);
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await complete(v, a, 100, c);
      expect((await result(a.id)).statusCode).toBe(409);
      expect(body(await get(v.examId)).items.find((r) => r.attemptId === a.id)?.earned).toBeNull();
      await c.query("COMMIT");
      const next = body(await get(v.examId, `?pageSize=1&cursor=${first.metadata.next}`));
      expect(next.items).toHaveLength(1);
      expect(next.items[0]).toMatchObject({ attemptId: a.id, status: "COMPLETED", earned: 100 });
      expect((await result(a.id)).json().data).toMatchObject({
        earned: 100,
        sections: [{ earned: 100 }],
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("binds version filtering in the opaque cursor and rejects duplicate/unknown query values", async () => {
    const v = await version(),
      v2 = await version(false, v.examId);
    await attempt(v);
    await attempt(v);
    const token = body(await get(v.examId, `?pageSize=1&publishedVersionId=${v.versionId}`))
      .metadata.next;
    expect((await get(v.examId, `?pageSize=1&cursor=${token}`)).statusCode).toBe(400);
    expect(
      (await get(v.examId, `?pageSize=1&publishedVersionId=${v2.versionId}&cursor=${token}`))
        .statusCode,
    ).toBe(400);
    for (const query of [
      "?publishedVersionId=invalid",
      `?publishedVersionId=${v.versionId}&publishedVersionId=${v2.versionId}`,
      "?status=COMPLETED",
    ])
      expect((await get(v.examId, query)).statusCode).toBe(400);
    const a = await attempt(v, "SUBMITTED");
    await complete(v, a);
    expect((await result(a.id, headers, "?pageSize=1")).statusCode).toBe(400);
  });
  it("requires permission for score detail and commits minimal audit before returning, failing closed on audit outage", async () => {
    const v = await version(),
      a = await attempt(v, "SUBMITTED");
    await complete(v, a);
    const candidate = await user(),
      s = await identity.login(`${candidate}@example.test`, "ranking fixture password");
    expect((await result(a.id, { cookie: `__Host-access=${s.access}` })).statusCode).toBe(403);
    expect((await result(a.id, { cookie: "" })).statusCode).toBe(401);
    await fixture.query("REVOKE INSERT ON platform.audit_logs FROM examination_runtime");
    try {
      const response = await result(a.id);
      expect(response.statusCode).toBe(503);
      expect(response.json().data).toBeNull();
    } finally {
      await fixture.query("GRANT INSERT ON platform.audit_logs TO examination_runtime");
    }
    observations.length = 0;
    const response = await result(a.id);
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(observations.filter((r) => r.kind === "query")).toHaveLength(8);
    const audit = (
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
        AND action = 'reporting.result.read'
    `,
        [a.id],
      )
    ).rows;
    expect(audit).toEqual([
      {
        actor_id: viewer,
        resource_type: "ATTEMPT",
        correlation_id: response.headers["x-correlation-id"],
        changed_fields: [],
      },
    ]);
  });
  it("withdraws retained/purged score payloads without inventing a zero score", async () => {
    const v = await version(),
      a = await attempt(v, "SUBMITTED", "2020-01-01T00:00:00.000Z");
    await complete(v, a);
    // Administrator constructs a valid synthetic compact identity; production
    // retention authority and age/settlement guards have their own real RPC suite.
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
        DELETE FROM
          assessment.result_questions
        WHERE
          attempt_id = $1
      `,
        [a.id],
      );
      await c.query(
        `
        DELETE FROM
          assessment.result_sections
        WHERE
          attempt_id = $1
      `,
        [a.id],
      );
      await c.query(
        `
        DELETE FROM
          assessment.results
        WHERE
          attempt_id = $1
      `,
        [a.id],
      );
      await c.query(
        `
        UPDATE assessment.attempts
        SET
          purged_at = clock_timestamp()
        WHERE
          id = $1
      `,
        [a.id],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    expect(body(await get(v.examId)).items).toEqual([]);
    expect((await result(a.id)).statusCode).toBe(404);
  });
});
describe("Admin submissions on restricted PostgreSQL/HTTP", () => {
  it("bounds actor lock wait and returns no report/audit, then recovers on release", async () => {
    const v = await version(),
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
      const started = performance.now(),
        response = await get(v.examId);
      expect(response.statusCode).toBe(503);
      expect(response.json().data).toBeNull();
      expect(performance.now() - started).toBeLessThan(2500);
      expect(await audits(v.examId)).toEqual([]);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
    expect((await get(v.examId)).statusCode).toBe(200);
    expect(db.stats().waiting).toBe(0);
  });
  it("returns an audited empty primary page for an existing draft, with no-store", async () => {
    const v = await version(),
      response = await get(v.examId);
    expect(response.statusCode).toBe(200);
    expect(body(response)).toEqual({
      items: [],
      metadata: { pageSize: 20, next: null },
    });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(await audits(v.examId)).toEqual([
      {
        actor_id: viewer,
        resource_id: v.examId,
        resource_type: "EXAM",
        correlation_id: response.headers["x-correlation-id"],
        outcome: "SUCCESS",
        changed_fields: [],
      },
    ]);
    expect((await get(randomUUID())).statusCode).toBe(404);
  });
  it("uses descending time/UUID keysets without duplicates and excludes starts after the initial watermark", async () => {
    const v = await version(),
      at = new Date(Date.now() - 5000).toISOString();
    const seeded = await Promise.all([
      attempt(v, "IN_PROGRESS", at),
      attempt(v, "IN_PROGRESS", at),
      attempt(v, "IN_PROGRESS", at),
    ]);
    const first = body(await get(v.examId, "?pageSize=1"));
    expect(first.items[0]!.attemptId).toBe(
      seeded
        .map((r) => r.id)
        .sort()
        .reverse()[0],
    );
    await attempt(
      v,
      "IN_PROGRESS",
      new Date(Date.parse(new Date().toISOString()) + 1).toISOString(),
    );
    const seen = [...first.items];
    let next = first.metadata.next;
    while (next) {
      const page = body(await get(v.examId, `?pageSize=1&cursor=${next}`));
      seen.push(...page.items);
      next = page.metadata.next;
    }
    expect(seen.map((r) => r.attemptId)).toEqual(
      seeded
        .map((r) => r.id)
        .sort()
        .reverse(),
    );
    expect(new Set(seen.map((r) => r.attemptId)).size).toBe(3);
  });
  it("requires current admin permission, verified/enabled session, and cannot take actor scope from the query", async () => {
    const v = await version(),
      candidate = await user();
    const session = await identity.login(`${candidate}@example.test`, "ranking fixture password");
    expect(
      (await get(v.examId, "", { cookie: `__Host-access=${session.access}` })).statusCode,
    ).toBe(403);
    expect((await get(v.examId, "", { cookie: "" })).statusCode).toBe(401);
    expect((await get(v.examId, `?actorId=${candidate}`)).statusCode).toBe(400);
    await fixture.query(
      `
        DELETE FROM
          identity.user_roles
        WHERE
          user_id = $1
          AND role_id = 'ADMIN'
      `,
      [viewer],
    );
    try {
      expect((await get(v.examId)).statusCode).toBe(403);
    } finally {
      await fixture.query(
        `
        INSERT INTO
          identity.user_roles (user_id, role_id)
        VALUES
          ($1, 'ADMIN')
      `,
        [viewer],
      );
    }
    await fixture.query(
      `
        UPDATE
          identity.users
        SET
          enabled = false
        WHERE
          id = $1
      `,
      [viewer],
    );
    try {
      expect((await get(v.examId)).statusCode).toBe(401);
    } finally {
      await fixture.query(
        `
        UPDATE
          identity.users
        SET
          enabled = true
        WHERE
          id = $1
      `,
        [viewer],
      );
    }
    await fixture.query(
      `
        UPDATE
          identity.users
        SET
          email_verified_at = NULL
        WHERE
          id = $1
      `,
      [viewer],
    );
    try {
      expect((await get(v.examId)).statusCode).toBe(401);
    } finally {
      await fixture.query(
        `
        UPDATE
          identity.users
        SET
          email_verified_at = clock_timestamp()
        WHERE
          id = $1
      `,
        [viewer],
      );
    }
    expect(await audits(v.examId)).toEqual([]);
  });
  it.each([
    "?pageSize=0",
    "?pageSize=101",
    "?pageSize=2.5",
    "?pageSize=1&pageSize=2",
    "?cursor=",
    "?cursor=bad.token",
    `?cursor=${"a".repeat(2049)}`,
  ])("rejects bounded malformed input %s", async (query) => {
    const v = await version();
    expect((await get(v.examId, query)).statusCode).toBe(400);
    expect(await audits(v.examId)).toEqual([]);
  });
  it("binds opaque cursors to current actor/exam/size and rejects expired/tampered tokens", async () => {
    const v = await version(),
      other = await version();
    await attempt(v);
    await attempt(v);
    const page = body(await get(v.examId, "?pageSize=1")),
      token = page.metadata.next!;
    expect((await get(other.examId, `?pageSize=1&cursor=${token}`)).statusCode).toBe(400);
    expect((await get(v.examId, `?pageSize=2&cursor=${token}`)).statusCode).toBe(400);
    const second = await user();
    await fixture.query(
      `
        INSERT INTO
          identity.user_roles (user_id, role_id)
        VALUES
          ($1, 'ADMIN')
      `,
      [second],
    );
    const session = await identity.login(`${second}@example.test`, "ranking fixture password");
    expect(
      (
        await get(v.examId, `?pageSize=1&cursor=${token}`, {
          cookie: `__Host-access=${session.access}`,
        })
      ).statusCode,
    ).toBe(400);
    const packed = Buffer.from(token, "base64url");
    packed[28] = packed[28]! ^ 1;
    expect(
      (await get(v.examId, `?pageSize=1&cursor=${packed.toString("base64url")}`)).statusCode,
    ).toBe(400);
    const watermark = new Date(Date.now() - 901000).toISOString(),
      expired = crypto.sign(
        { actorId: viewer, examId: v.examId, publishedVersionId: null, pageSize: 1 },
        {
          watermark,
          position: [watermark, randomUUID()],
          expiresAt: Date.parse(watermark) + 900000,
        },
      );
    expect((await get(v.examId, `?pageSize=1&cursor=${expired}`)).statusCode).toBe(400);
    expect(await audits(v.examId)).toHaveLength(1);
  });
  it("rolls back and returns no report when transactional audit fails", async () => {
    const v = await version();
    await attempt(v);
    await fixture.query(`REVOKE INSERT ON platform.audit_logs FROM examination_runtime`);
    try {
      const response = await get(v.examId);
      expect(response.statusCode).toBe(503);
      expect(response.json().data).toBeNull();
      expect(await audits(v.examId)).toEqual([]);
    } finally {
      await fixture.query(`GRANT INSERT ON platform.audit_logs TO examination_runtime`);
    }
    expect((await get(v.examId)).statusCode).toBe(200);
    expect(await audits(v.examId)).toHaveLength(1);
    expect(db.stats().waiting).toBe(0);
  });
  it("revalidates permission inside the audit transaction after initial HTTP authentication", async () => {
    const v = await version(),
      raw = headers.cookie.slice("__Host-access=".length);
    const access = {
      authenticate: identity.authenticate.bind(identity),
      requirePermission: identity.requirePermission.bind(identity),
      revalidate: async (token: string, permission: string) => {
        await fixture.query(
          `
        DELETE FROM
          identity.user_roles
        WHERE
          user_id = $1
          AND role_id = 'ADMIN'
      `,
          [viewer],
        );
        return identity.revalidate(token, permission);
      },
    };
    const service = new SubmissionsService(
      access,
      new PostgresSubmissionsQuery(db),
      crypto,
      security,
      db,
    );
    expect((await identity.authenticate(raw)).permissions).toContain("reporting.read");
    try {
      await expect(
        service.page({
          raw,
          actorId: viewer,
          examId: v.examId,
          publishedVersionId: null,
          pageSize: 20,
          cursor: null,
          correlationId: randomUUID(),
        }),
      ).rejects.toMatchObject({ category: "forbidden" });
    } finally {
      await fixture.query(
        `
        INSERT INTO
          identity.user_roles (user_id, role_id)
        VALUES
          ($1, 'ADMIN')
      `,
        [viewer],
      );
    }
    expect(await audits(v.examId)).toEqual([]);
  });
  it("has a fixed eight-statement auth-inclusive budget and one bounded projection for page sizes 1 and 100", async () => {
    const v = await version();
    await attempt(v);
    for (const size of [1, 100]) {
      observations.length = 0;
      const response = await get(v.examId, `?pageSize=${size}`);
      expect(response.statusCode).toBe(200);
      const calls = observations.filter((r) => r.kind === "query");
      expect(calls.map((r) => r.operation)).toEqual([
        "identity.read",
        "security.rate",
        "transaction.begin",
        "lock.acquire",
        "identity.read",
        "reporting.read",
        "audit.write",
        "transaction.commit",
      ]);
      expect(Buffer.byteLength(response.payload)).toBeLessThan(64 * 1024);
      expect(db.stats().waiting).toBe(0);
    }
  });
});

it("records natural plans and local query/HTTP diagnostics on 100k attempts without adding infrastructure", async () => {
  const versions: Version[] = [];
  for (let i = 0; i < 20; i++) versions.push(await version());
  const anchor = new Date(Date.now() - 100000).toISOString();
  for (let offset = 0; offset < 100000; offset += 1000) {
    // Small commits keep real deferred guards and index/constraint work enabled.
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
        WITH source AS (
          SELECT
            i,
            gen_random_uuid() AS id
          FROM
            generate_series($1::int, $1::int + 999) i
        ), users AS (
          INSERT INTO
            identity.users (id, email, password_hash, display_name, email_verified_at)
          SELECT
            id,
            id::text || '@example.test',
            $2,
            'Synthetic monitor',
            clock_timestamp()
          FROM
            source
          RETURNING
            id
        )
        INSERT INTO
          assessment.attempts (
            id, user_id, exam_id, version_id, status, started_at, deadline,
            submitted_at, submission_id, submission_event_id, submission_kind, revision
          )
        SELECT
          gen_random_uuid(),
          u.id,
          ($3::uuid[])[((s.i / 50) % 20) + 1],
          ($4::uuid[])[((s.i / 50) % 20) + 1],
          CASE WHEN s.i % 50 = 0 THEN 'IN_PROGRESS' ELSE 'FAILED' END,
          $5::timestamptz - s.i * interval '1 millisecond',
          $5::timestamptz - s.i * interval '1 millisecond' + interval '10 minutes',
          CASE WHEN s.i % 50 = 0 THEN NULL ELSE $5::timestamptz END,
          CASE WHEN s.i % 50 = 0 THEN NULL ELSE gen_random_uuid() END,
          CASE WHEN s.i % 50 = 0 THEN NULL ELSE gen_random_uuid() END,
          CASE WHEN s.i % 50 = 0 THEN NULL ELSE 'MANUAL' END,
          1
        FROM
          users u
          JOIN source s ON s.id = u.id
      `,
        [offset, hash, versions.map((v) => v.examId), versions.map((v) => v.versionId), anchor],
      );
      await c.query("COMMIT");
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
    if (offset % 10000 === 0) await fixture.query("ANALYZE assessment.attempts");
  }
  await fixture.query("ANALYZE assessment.attempts");
  const counts = (
    await fixture.query(
      `
    SELECT
      count(*)::int AS attempts,
      count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS active
    FROM
      assessment.attempts
    WHERE
      exam_id = ANY($1::uuid[])
  `,
      [versions.map((v) => v.examId)],
    )
  ).rows[0]!;
  expect(counts).toEqual({ attempts: 100000, active: 2000 });
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
  );
  const query = new PostgresSubmissionsQuery(measured),
    target = versions[0]!;
  function metrics(samples: number[]) {
    const sorted = [...samples].sort((a, b) => a - b),
      percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1]!;
    return {
      n: samples.length,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    };
  }
  async function sample(
    position: [string, string] | null,
    publishedVersionId: string | null = null,
  ) {
    const input = {
      examId: target.examId,
      publishedVersionId,
      limit: 21,
      watermark: new Date().toISOString(),
      position,
    };
    for (let n = 0; n < 5; n++) await query.page(input);
    const samples: number[] = [],
      cpu = process.cpuUsage(),
      started = performance.now();
    for (let n = 0; n < 40; n++) {
      const at = performance.now();
      const page = await query.page(input);
      expect(page.rows).toHaveLength(21);
      samples.push(performance.now() - at);
    }
    const delta = process.cpuUsage(cpu),
      elapsed = performance.now() - started;
    const plan = (
      await measured.query("diagnostic", `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, bindings)
    ).rows[0]!["QUERY PLAN"];
    return {
      rawLatencyMs: samples,
      latencyMs: metrics(samples),
      successfulRps: 40000 / elapsed,
      elapsedMs: elapsed,
      harnessCpuMsPerQuery: (delta.user + delta.system) / 1000 / 40,
      plan,
    };
  }
  try {
    const page = await query.page({
      examId: target.examId,
      publishedVersionId: null,
      limit: 51,
      watermark: null,
      position: null,
    });
    const last = page.rows.at(-1)!,
      deep: [string, string] = [last.startedAt, last.attemptId];
    const baseline = {
      first: await sample(null),
      continuationAfter51: await sample(deep),
      versionFiltered: await sample(null, target.versionId),
    };
    const httpSamples: number[] = [],
      bytes: number[] = [],
      httpSql: number[] = [],
      tx: number[] = [],
      wait: number[] = [];
    const maximum = await get(target.examId, "?pageSize=100");
    expect(body(maximum).items).toHaveLength(100);
    expect(Buffer.byteLength(maximum.payload)).toBeLessThan(64 * 1024);
    let httpWindowStart = 0,
      httpCpuStart = process.cpuUsage();
    for (let n = 0; n < 35; n++) {
      await new Promise((r) => setTimeout(r, 110));
      observations.length = 0;
      const at = performance.now();
      if (n === 5) {
        httpWindowStart = at;
        httpCpuStart = process.cpuUsage();
      }
      const response = await http.inject({
        method: "GET",
        url: `/v1/admin/exams/${target.examId}/submissions`,
        headers,
      });
      expect(response.statusCode).toBe(200);
      expect(body(response).items).toHaveLength(20);
      if (n >= 5) {
        httpSamples.push(performance.now() - at);
        bytes.push(Buffer.byteLength(response.payload));
        httpSql.push(observations.filter((r) => r.kind === "query").length);
        tx.push(...observations.filter((r) => r.kind === "transaction").map((r) => r.durationMs));
        wait.push(...observations.filter((r) => r.kind === "acquire").map((r) => r.durationMs));
      }
    }
    const httpElapsedMs = performance.now() - httpWindowStart,
      httpCpu = process.cpuUsage(httpCpuStart);
    expect(new Set(httpSql)).toEqual(new Set([8]));
    const scored = await attempt(target, "SUBMITTED");
    await complete(target, scored);
    const scoreSamples: number[] = [],
      scoreBytes: number[] = [];
    const scoreWindow = performance.now(),
      scoreCpuStart = process.cpuUsage();
    for (let n = 0; n < 30; n++) {
      await new Promise((r) => setTimeout(r, 110));
      observations.length = 0;
      const at = performance.now();
      const response = await http.inject({
        method: "GET",
        url: `/v1/admin/attempts/${scored.id}/result`,
        headers,
      });
      expect(response.statusCode).toBe(200);
      expect(validateResult(response.json())).toBe(true);
      expect(observations.filter((r) => r.kind === "query")).toHaveLength(8);
      scoreSamples.push(performance.now() - at);
      scoreBytes.push(Buffer.byteLength(response.payload));
    }
    const scoreElapsedMs = performance.now() - scoreWindow,
      scoreCpu = process.cpuUsage(scoreCpuStart);
    const evidence = {
      localOnly: true,
      notCapacityEvidence: true,
      dataset: counts,
      scope:
        "100k synthetic users/attempts;20 exams;2000 active,100 per exam;primary restricted role;sequential warm baseline; first/51-row continuation/version-filtered",
      nodeVersion: process.version,
      cpuArchitecture: process.arch,
      sqlSha256: createHash("sha256").update(sql).digest("hex"),
      baseline,
      http: {
        rawLatencyMs: httpSamples,
        rawPayloadBytes: bytes,
        rawTransactionMs: tx,
        rawAcquireMs: wait,
        latencyMs: metrics(httpSamples),
        payloadBytes: metrics(bytes),
        sqlCalls: 8,
        transactionMs: metrics(tx),
        acquireMs: metrics(wait),
        pollingPaceMs: 110,
        achievedSuccessfulRps: (httpSamples.length * 1000) / httpElapsedMs,
        windowElapsedMs: httpElapsedMs,
        errors: 0,
        harnessCpuMsPerRequest: (httpCpu.user + httpCpu.system) / 1000 / httpSamples.length,
        scope:
          "Fastify inject, real Identity/restricted primary PostgreSQL; includes Jest harness CPU, no TCP/TLS/ALB; sleep excluded from latency but included in RPS window",
        maximumPageBytes: Buffer.byteLength(maximum.payload),
      },
      scoreHttp: {
        rawLatencyMs: scoreSamples,
        rawPayloadBytes: scoreBytes,
        latencyMs: metrics(scoreSamples),
        payloadBytes: metrics(scoreBytes),
        sqlCalls: 8,
        completedQuestions: 1,
        completedSections: 1,
        pollingPaceMs: 110,
        elapsedMs: scoreElapsedMs,
        achievedSuccessfulRps: 30000 / scoreElapsedMs,
        harnessCpuMsPerRequest: (scoreCpu.user + scoreCpu.system) / 1000 / 30,
        errors: 0,
      },
      rssBytes: process.memoryUsage().rss,
      allocationBytesPerRequest: null,
      databaseCpu: null,
      awsCostPerHour: null,
      sustainableRps: null,
      concurrentCapacity: null,
      decision:
        "Baseline only: no competing index/resource measured, no optimization or capacity winner. Review plans and required admin load before adding an index.",
    };
    const directory = process.env.ADMIN_SUBMISSIONS_EVIDENCE_DIR;
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
