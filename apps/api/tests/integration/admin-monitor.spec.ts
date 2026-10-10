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

import { ActiveCandidatesController } from "../../src/modules/reporting/presentation/http/active-candidates.controller";
import { ActiveCandidatesService } from "../../src/modules/reporting/application/services/active-candidates.service";
import { ActiveCandidatesPage } from "../../src/modules/reporting/application/dto/active-candidates.dto";
import { PostgresActiveCandidatesQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-active-candidates.query";
import { ActiveCandidatesCrypto } from "../../src/modules/reporting/infrastructure/security/active-candidates-cursor";
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = "monitor_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "am_ddl_" + suffix,
  runtimeRole = "am_api_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const crypto = new ActiveCandidatesCrypto(randomBytes(32)),
  observations: DatabaseObservation[] = [];
let fixture: Pool, db: PostgresDatabase, identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string, viewer: string, headers: { cookie: string }, validate: ValidateFunction;
let security: PostgresSecurity;
const reader = () =>
  new ActiveCandidatesService(
    identity,
    new PostgresActiveCandidatesQuery(db),
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
    controllers: [ActiveCandidatesController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: ActiveCandidatesService, useValue: reader() },
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
  validate = ajv.compile(document.components.schemas.ActiveCandidateListEnvelope!);
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

async function attempt(v: Version, status = "IN_PROGRESS", at?: string, deadline?: string) {
  const candidateId = await user(false),
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
    url: `/v1/admin/exams/${examId}/active-candidates${query}`,
    headers: h,
  });
}
function body(response: Awaited<ReturnType<typeof get>>): ActiveCandidatesPage {
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
      action = 'reporting.active-candidates.read'
      AND resource_id = $1
  `,
      [examId],
    )
  ).rows;
}
describe("Admin active monitor on restricted PostgreSQL/HTTP", () => {
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
  it("returns an audited empty primary page for an existing draft, with database asOf and no-store", async () => {
    const v = await version(),
      response = await get(v.examId);
    expect(response.statusCode).toBe(200);
    expect(body(response)).toEqual({
      items: [],
      metadata: { pageSize: 20, next: null, asOf: expect.any(String) },
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
  it("includes only started live IN_PROGRESS across frozen versions, even when archived or unpublished", async () => {
    const v = await version(),
      old = await attempt(v),
      v2 = await version(false, v.examId),
      live = await attempt(v2);
    await fixture.query(
      `
        UPDATE
          identity.users
        SET
          enabled = false
        WHERE
          id = $1
      `,
      [old.candidateId],
    );
    await attempt(v, "CREATED");
    await attempt(v, "SUBMITTED");
    await attempt(v, "FAILED");
    await attempt(v, "IN_PROGRESS", "2020-01-01T00:00:00.000Z", "2020-01-01T01:00:00.000Z");
    await attempt(v, "EXPIRED", "2019-12-31T23:59:00.000Z", "2020-01-01T00:00:00.000Z");
    await attempt(v, "IN_PROGRESS", "2029-01-01T00:00:00.000Z", "2029-01-01T01:00:00.000Z");
    const other = await version();
    await attempt(other);
    await fixture.query(
      `
        UPDATE
          catalog.exams
        SET
          published = false, archived_at = clock_timestamp()
        WHERE
          id = $1
      `,
      [v.examId],
    );
    const page = body(await get(v.examId));
    expect(page.items.map((r) => r.attemptId).sort()).toEqual([old.id, live.id].sort());
    for (const r of page.items) {
      expect(r.status).toBe("IN_PROGRESS");
      expect(Date.parse(r.startedAt)).toBeLessThanOrEqual(Date.parse(page.metadata.asOf));
      expect(Date.parse(r.deadline)).toBeGreaterThan(Date.parse(page.metadata.asOf));
      expect(Object.keys(r).sort()).toEqual(
        ["candidateId", "attemptId", "status", "startedAt", "deadline"].sort(),
      );
    }
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
    await attempt(v, "IN_PROGRESS", new Date(Date.parse(first.metadata.asOf) + 1).toISOString());
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
  it("hides a newly submitted row on continuation and a fresh page without locking the attempt", async () => {
    const v = await version(),
      a = await attempt(v),
      b = await attempt(v);
    const first = body(await get(v.examId, "?pageSize=1")),
      unseen = first.items[0]!.attemptId === a.id ? b : a;
    const holder = await fixture.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        `
        UPDATE assessment.attempts
        SET
          status = 'SUBMITTED',
          submitted_at = clock_timestamp(),
          submission_id = $2,
          submission_event_id = $3,
          submission_kind = 'MANUAL',
          revision = revision + 1
        WHERE
          id = $1
      `,
        [unseen.id, randomUUID(), randomUUID()],
      );
      const before = body(await get(v.examId));
      expect(before.items).toHaveLength(2);
      await holder.query("COMMIT");
      const after = body(await get(v.examId, `?pageSize=1&cursor=${first.metadata.next}`));
      expect(after.items).toEqual([]);
      expect(body(await get(v.examId)).items).toHaveLength(1);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
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
    const watermark = new Date(Date.now() - 61000).toISOString(),
      expired = crypto.sign(
        { actorId: viewer, examId: v.examId, pageSize: 1 },
        {
          watermark,
          position: [watermark, randomUUID()],
          expiresAt: Date.parse(watermark) + 60000,
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
    const service = new ActiveCandidatesService(
      access,
      new PostgresActiveCandidatesQuery(db),
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
      expect(Buffer.byteLength(response.payload)).toBeLessThan(32 * 1024);
      expect(db.stats().waiting).toBe(0);
    }
  });
});

it("compares natural plans and local query/HTTP diagnostics on 100k attempts without adopting an index blindly", async () => {
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
  const query = new PostgresActiveCandidatesQuery(measured),
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
  async function sample(position: [string, string] | null) {
    const input = {
      examId: target.examId,
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
      limit: 51,
      watermark: null,
      position: null,
    });
    const last = page.rows.at(-1)!,
      deep: [string, string] = [last.startedAt, last.attemptId];
    const before = { first: await sample(null), deep: await sample(deep) };
    // Isolated DDL experiment, never an application privilege or applied migration.
    await fixture.query(`
      CREATE INDEX monitor_candidate_experiment
      ON assessment.attempts (exam_id, started_at DESC, id DESC)
      WHERE status = 'IN_PROGRESS' AND purged_at IS NULL
    `);
    let withIndex;
    try {
      await fixture.query("ANALYZE assessment.attempts");
      withIndex = { first: await sample(null), deep: await sample(deep) };
    } finally {
      await fixture.query("DROP INDEX assessment.monitor_candidate_experiment");
    }
    await fixture.query("ANALYZE assessment.attempts");
    const afterRemoval = { first: await sample(null), deep: await sample(deep) };
    const httpSamples: number[] = [],
      bytes: number[] = [],
      httpSql: number[] = [],
      tx: number[] = [],
      wait: number[] = [];
    const maximum = await get(target.examId, "?pageSize=100");
    expect(body(maximum).items).toHaveLength(100);
    expect(Buffer.byteLength(maximum.payload)).toBeLessThan(32 * 1024);
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
        url: `/v1/admin/exams/${target.examId}/active-candidates`,
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
    const evidence = {
      localOnly: true,
      notCapacityEvidence: true,
      dataset: counts,
      scope:
        "100k synthetic users/attempts;20 exams;2000 active,100 per exam;primary restricted role;sequential warm A/B/A",
      sqlSha256: createHash("sha256").update(sql).digest("hex"),
      before,
      withIndex,
      afterRemoval,
      http: {
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
      rssBytes: process.memoryUsage().rss,
      allocationBytesPerRequest: null,
      databaseCpu: null,
      awsCostPerHour: null,
      sustainableRps: null,
      concurrentCapacity: null,
      decision:
        "No runtime index accepted by this test; review timings, SLO need and write/storage cost separately.",
    };
    const directory = process.env.ADMIN_MONITOR_EVIDENCE_DIR;
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
