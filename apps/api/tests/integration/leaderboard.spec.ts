import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Module } from "@nestjs/common";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  type DatabaseObservation,
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
import { LeaderboardController } from "../../src/modules/assessment/presentation/http/leaderboard.controller";
import {
  RANKING_PROJECTION,
  type RankingPage,
} from "../../src/modules/reporting/application/facades/ranking.facade";
import { RankingService } from "../../src/modules/reporting/application/services/ranking.service";
import { PostgresRankingQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-ranking.query";
import { RankingCrypto } from "../../src/modules/reporting/infrastructure/security/ranking-crypto";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = `ranking_${randomUUID().replaceAll("-", "")}`,
  suffix = name.slice(-12),
  password = randomUUID();
const owner = `lb_ddl_${suffix}`,
  runtimeRole = `lb_api_${suffix}`,
  graderRole = `lb_grade_${suffix}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const base = new URL(adminUrl);
base.pathname = `/${name}`;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const key = randomBytes(32),
  crypto = new RankingCrypto(key),
  observations: DatabaseObservation[] = [];
const at = "2025-01-01T00:01:00.000Z",
  before = "2025-01-01T00:00:00.000Z",
  deadline = "2025-01-01T00:10:00.000Z";
let fixture: Pool, db: PostgresDatabase, gradeDb: PostgresDatabase, identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string, viewer: string, headers: { cookie: string }, validate: ValidateFunction;
const reader = () => new RankingService(new PostgresRankingQuery(db), crypto, crypto);
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
interface Completed {
  attemptId: string;
  userId: string;
  earned: number;
  sequence: string;
  submitted: string;
}
async function completed(
  v: Version,
  userId: string,
  earned: 0 | 100 = 100,
  submitted = at,
  attemptId = randomUUID(),
): Promise<Completed> {
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `
      INSERT INTO
        assessment.attempts (
          id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
          submission_id, submission_event_id, submission_kind, revision, expired
        )
      VALUES
        ($1, $2, $3, $4, 'COMPLETED', $5, $6, $7, $8, $9, 'MANUAL', 1, $7::timestamptz >= $6::timestamptz)
    `,
      [
        attemptId,
        userId,
        v.examId,
        v.versionId,
        before,
        deadline,
        submitted,
        randomUUID(),
        randomUUID(),
      ],
    );
    const row = (
      await c.query<{ sequence: string }>(
        `
      INSERT INTO
        assessment.results (
          attempt_id, version_id, user_id, earned_points, possible_points,
          correct_count, question_count, completed_at
        )
      VALUES
        ($1, $2, $3, $4, 100, $5, 1, clock_timestamp())
      RETURNING
        completion_sequence::text AS sequence
    `,
        [attemptId, v.versionId, userId, earned, earned === 100 ? 1 : 0],
      )
    ).rows[0]!;
    await c.query("COMMIT");
    return { attemptId, userId, earned, sequence: row.sequence, submitted };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
// Fixture supplies the already-selected best entry; independent real grading
// suites own selection/scoring semantics. Read tests keep worse/latest results too.
async function entry(
  v: Version,
  result: Completed,
  client: Pool | import("pg").PoolClient = fixture,
) {
  await client.query(
    `
    INSERT INTO
      assessment.leaderboard_entries (version_id, user_id, attempt_id, earned_points, submitted_at, completion_sequence)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (version_id, user_id) DO UPDATE
    SET
      attempt_id = EXCLUDED.attempt_id,
      earned_points = EXCLUDED.earned_points,
      submitted_at = EXCLUDED.submitted_at,
      completion_sequence = EXCLUDED.completion_sequence
  `,
    [
      v.versionId,
      result.userId,
      result.attemptId,
      result.earned,
      result.submitted,
      result.sequence,
    ],
  );
}
function path(v: Version, query = "") {
  return `/v1/exams/${v.examId}/versions/${v.versionId}/leaderboard${query}`;
}
async function get(v: Version, query = "", h = headers) {
  // Respect the real actor read-rate policy across this serial HTTP fixture.
  await new Promise((resolve) => setTimeout(resolve, 110));
  return http.inject({ method: "GET", url: path(v, query), headers: h });
}
function body(response: Awaited<ReturnType<typeof get>>): RankingPage {
  const value = response.json() as {
    data: RankingPage["items"];
    metadata: RankingPage["metadata"];
  };
  if (response.statusCode === 200 && !validate(value))
    throw new Error(JSON.stringify(validate.errors));
  return { items: value.data, metadata: value.metadata };
}
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [login, group] of [
    [owner, "examination_owner"],
    [runtimeRole, "examination_runtime"],
    [graderRole, "examination_grading_worker"],
  ]) {
    await admin.query(
      `CREATE ROLE ${login} LOGIN ${login === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
    await admin.query(`GRANT ${group} TO ${login}`);
  }
  const migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(owner) }),
    process.env.LEADERBOARD_BASELINE === "true" ? migrations.slice(0, 17) : migrations,
  );
  fixture = new Pool({
    connectionString: base.toString(),
    max: 3,
    options: "-c statement_timeout=90000 -c timezone=UTC",
  });
  if (process.env.LEADERBOARD_BASELINE === "true") {
    await fixture.query(
      "CREATE TABLE assessment.leaderboard_epochs (version_id uuid PRIMARY KEY, epoch bigint NOT NULL)",
    );
    await fixture.query("GRANT SELECT ON assessment.leaderboard_epochs TO examination_runtime");
  }
  db = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    (value) => observations.push(value),
  );
  gradeDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(graderRole) }),
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
    security = new PostgresSecurity(db, randomBytes(32));
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
    controllers: [LeaderboardController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: RANKING_PROJECTION, useValue: reader() },
    ],
  })
  class RankingHttpModule {}
  api = await createHttpApplication(RankingHttpModule);
  http = api.app.getHttpAdapter().getInstance();
  viewer = await user();
  const session = await identity.login(`${viewer}@example.test`, "ranking fixture password");
  headers = { cookie: `__Host-access=${session.access}` };
  const document = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  validate = ajv.compile(document.components.schemas.LeaderboardEntryListEnvelope!);
});
afterAll(async () => {
  await api?.app.close();
  await db?.close();
  await gradeDb?.close();
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
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${graderRole}`);
  await admin.end();
});
describe("Public leaderboard on restricted PostgreSQL/HTTP", () => {
  it("gates exact immutable version and returns an empty bounded no-store page", async () => {
    const v = await version(),
      disabled = await version(false);
    const response = await get(v);
    expect(response.statusCode).toBe(200);
    expect(body(response)).toEqual({ items: [], metadata: { pageSize: 20, next: null } });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect((await get(disabled)).statusCode).toBe(403);
    expect((await get({ ...v, versionId: disabled.versionId })).statusCode).toBe(404);
    expect((await get({ ...v, versionId: randomUUID() })).statusCode).toBe(404);
    expect((await get(v, "", { cookie: "" })).statusCode).toBe(401);
  });
  it("uses retained best rather than latest and resolves ties by submit time/UUID, not completion time", async () => {
    const v = await version(),
      a = await user(),
      b = await user(),
      c = await user();
    const low = await completed(v, a, 0),
      high = await completed(v, a, 100);
    await completed(v, a, 0); // latest result must not replace best in a read.
    const earlier = await completed(v, b, 100, "2025-01-01T00:00:30.000Z");
    const tied = await completed(v, c, 100, at, "00000000-0000-4000-8000-000000000001");
    for (const row of [high, earlier, tied]) await entry(v, row);
    expect(low.sequence).not.toBe(high.sequence);
    const response = await get(v),
      rows = body(response).items;
    expect(rows.map((r) => r.pseudonym)).toEqual(
      [b, c, a].map((u) => crypto.alias(v.versionId, u)),
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.earned)).toEqual([100, 100, 100]);
    expect(response.body).not.toMatch(/example.test|PRIVATE_|userId|attemptId|correctOption/);
    for (const id of [a, b, c, high.attemptId]) expect(response.body).not.toContain(id);
  });
  it("suppresses opt-out, disabled, unverified and deletion-request candidates on fresh reads", async () => {
    const v = await version(),
      users = await Promise.all([user(), user(), user(), user()]);
    for (const id of users) await entry(v, await completed(v, id));
    expect(body(await get(v)).items).toHaveLength(4);
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
        UPDATE identity.users
        SET
          leaderboard_opt_in = false
        WHERE
          id = $1
      `,
        [users[0]],
      );
      expect(body(await get(v)).items).toHaveLength(4); // uncommitted change is not authoritative.
      await c.query("ROLLBACK");
    } finally {
      c.release();
    }
    await fixture.query(
      `
      UPDATE identity.users
      SET
        leaderboard_opt_in = false
      WHERE
        id = $1
    `,
      [users[0]],
    );
    await fixture.query(
      `
      UPDATE identity.users
      SET
        enabled = false
      WHERE
        id = $1
    `,
      [users[1]],
    );
    await fixture.query(
      `
      UPDATE identity.users
      SET
        email_verified_at = NULL
      WHERE
        id = $1
    `,
      [users[2]],
    );
    await fixture.query(
      `
      UPDATE identity.users
      SET
        privacy_requested_at = clock_timestamp()
      WHERE
        id = $1
    `,
      [users[3]],
    );
    expect(body(await get(v)).items).toHaveLength(0);
  });
  it("binds opaque cursor to actor/version/page size and rejects invalid requests", async () => {
    const v = await version();
    for (let n = 0; n < 3; n++) await entry(v, await completed(v, await user()));
    const first = body(await get(v, "?pageSize=1")),
      token = first.metadata.next!;
    expect(token).toBeTruthy();
    expect(body(await get(v, "?pageSize=1&cursor=" + token)).items[0]!.rank).toBe(2);
    for (const suffix of [
      "?pageSize=2&cursor=" + token,
      "?pageSize=0",
      "?pageSize=101",
      "?pageSize=1.5",
      "?cursor=",
      "?userId=" + viewer,
      "?pageSize=1&cursor=" + token.slice(3),
    ])
      expect((await get(v, suffix)).statusCode).toBe(400);
    const other = await user(),
      session = await identity.login(`${other}@example.test`, "ranking fixture password");
    expect(
      (await get(v, "?pageSize=1&cursor=" + token, { cookie: `__Host-access=${session.access}` }))
        .statusCode,
    ).toBe(400);
    const otherVersion = await version();
    expect((await get(otherVersion, "?pageSize=1&cursor=" + token)).statusCode).toBe(400);
  });
  it("omits newer completions/improvements beyond watermark until refresh", async () => {
    const v = await version(),
      a = await user(),
      b = await user();
    await entry(v, await completed(v, a, 100));
    await entry(v, await completed(v, b, 0));
    const first = body(await get(v, "?pageSize=1"));
    await entry(v, await completed(v, await user(), 100));
    await entry(v, await completed(v, b, 100));
    expect(body(await get(v, "?pageSize=1&cursor=" + first.metadata.next!)).items).toEqual([]);
    expect(body(await get(v)).items).toHaveLength(3);
  });
  it("recomputes live sequential rank after a seen candidate opts out and includes expired completions", async () => {
    const v = await version(),
      a = await user(),
      b = await user(),
      c = await user();
    await entry(v, await completed(v, a, 100));
    await entry(v, await completed(v, b, 100, "2025-01-01T00:02:00.000Z"));
    await entry(v, await completed(v, c, 0, deadline));
    const first = body(await get(v, "?pageSize=1"));
    expect(first.items[0]!.pseudonym).toBe(crypto.alias(v.versionId, a));
    await fixture.query(
      `
      UPDATE identity.users
      SET
        leaderboard_opt_in = false
      WHERE
        id = $1
    `,
      [a],
    );
    const second = body(await get(v, "?pageSize=1&cursor=" + first.metadata.next!));
    expect(second.items[0]).toMatchObject({ rank: 1, pseudonym: crypto.alias(v.versionId, b) });
    const third = body(await get(v, "?pageSize=1&cursor=" + second.metadata.next!));
    expect(third.items[0]).toMatchObject({
      rank: 2,
      earned: 0,
      pseudonym: crypto.alias(v.versionId, c),
    });
    expect(third.metadata.next).toBeNull();
    const expired = crypto.sign(
      { actorId: viewer, ...v, pageSize: 1 },
      {
        watermark: "1",
        epoch: "0",
        position: ["100", at, "70000000-0000-4000-8000-000000000001"],
        expiresAt: 1,
      },
    );
    expect((await get(v, "?pageSize=1&cursor=" + expired)).statusCode).toBe(400);
  });
  it("disallows changing the candidate/version identity of a best row", async () => {
    const v = await version();
    await entry(v, await completed(v, await user()));
    await expect(
      db.query("diagnostic", "UPDATE assessment.leaderboard_entries SET user_id = user_id"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("diagnostic", "UPDATE assessment.leaderboard_entries SET version_id = version_id"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("invalidates a continuation when retention replaces a seen best with a worse surviving attempt", async () => {
    const v = await version(),
      a = await user(),
      b = await user();
    const surviving = await completed(v, a, 0, "2025-01-01T00:00:30.000Z"),
      best = await completed(v, a, 100);
    await entry(v, best);
    await entry(v, await completed(v, b, 0));
    const first = body(await get(v, "?pageSize=1"));
    expect(first.items[0]!.pseudonym).toBe(crypto.alias(v.versionId, a));
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
        DELETE FROM assessment.leaderboard_entries
        WHERE
          attempt_id = $1
      `,
        [best.attemptId],
      );
      await entry(v, surviving, c);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    const continued = await get(v, "?pageSize=1&cursor=" + first.metadata.next!);
    if (process.env.LEADERBOARD_BASELINE === "true") {
      expect(continued.statusCode).toBe(200);
      expect(body(continued).items[0]!.pseudonym).toBe(first.items[0]!.pseudonym);
    }
    expect(continued.statusCode).toBe(400);
    expect(body(await get(v)).items).toHaveLength(2);
  });
  it("keeps epoch changes atomic and restricts their write authority", async () => {
    const v = await version(),
      a = await user(),
      low = await completed(v, a, 0),
      high = await completed(v, a, 100);
    await entry(v, high);
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await entry(v, low, c);
      await c.query("ROLLBACK");
    } finally {
      c.release();
    }
    expect(
      (
        await new PostgresRankingQuery(db).page({
          ...v,
          limit: 1,
          watermark: null,
          epoch: null,
          position: null,
        })
      ).epoch,
    ).toBe("0");
    await entry(v, low);
    const downgraded = await new PostgresRankingQuery(db).page({
      ...v,
      limit: 1,
      watermark: null,
      epoch: null,
      position: null,
    });
    expect(downgraded.epoch).toBe("1");
    // Existing grader can improve; the normal path does not write the epoch.
    await gradeDb.query(
      "assessment.write",
      `
      UPDATE assessment.leaderboard_entries
      SET
        attempt_id = $2,
        earned_points = $3,
        submitted_at = $4,
        completion_sequence = $5
      WHERE
        version_id = $1
        AND user_id = $6
    `,
      [v.versionId, high.attemptId, high.earned, high.submitted, high.sequence, a],
    );
    expect(
      (
        await new PostgresRankingQuery(db).page({
          ...v,
          limit: 1,
          watermark: null,
          epoch: null,
          position: null,
        })
      ).epoch,
    ).toBe("1");
    await expect(
      db.query("diagnostic", "UPDATE assessment.leaderboard_epochs SET epoch = 99"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      gradeDb.query("diagnostic", "UPDATE assessment.leaderboard_epochs SET epoch = 99"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("diagnostic", "SELECT assessment.invalidate_leaderboard_cursor()"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("diagnostic", "UPDATE assessment.leaderboard_entries SET user_id = user_id"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("diagnostic", "UPDATE assessment.leaderboard_entries SET version_id = version_id"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("uses frozen visibility after unpublish/republish and does not cross versions", async () => {
    const v = await version(),
      next = await version(false, v.examId);
    await entry(v, await completed(v, await user()));
    await fixture.query(
      `
      UPDATE catalog.exams
      SET
        published = false,
        current_version_id = $2,
        archived_at = clock_timestamp()
      WHERE
        id = $1
    `,
      [v.examId, next.versionId],
    );
    expect(body(await get(v)).items).toHaveLength(1);
    expect((await get(next)).statusCode).toBe(403);
  });
  it("rechecks current viewer permission/session and observes three SQL calls per read", async () => {
    const v = await version();
    observations.length = 0;
    expect((await get(v)).statusCode).toBe(200);
    expect(observations.filter((o) => o.kind === "query")).toHaveLength(3);
    await fixture.query(
      `
      DELETE FROM identity.user_roles
      WHERE
        user_id = $1
    `,
      [viewer],
    );
    expect((await get(v)).statusCode).toBe(403);
    await fixture.query(
      `
      INSERT INTO
        identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'CANDIDATE')
    `,
      [viewer],
    );
  });
  it("records natural large-version plans and rate-paced HTTP diagnostics without capacity claims", async () => {
    const v = await version(),
      client = await fixture.connect();
    try {
      // Bounded seed transactions preserve every FK/completion trigger without
      // one artificial100k-row transaction dominating fixture setup.
      for (let batch = 0; batch < 100; batch++) {
        const start = batch * 1000 + 1,
          end = (batch + 1) * 1000;
        await client.query("BEGIN");
        await client.query(
          `
        INSERT INTO
          identity.users (id, email, password_hash, display_name, email_verified_at, leaderboard_opt_in)
        SELECT
          ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
          n::text || '@large.example.test', $1, 'PRIVATE_LARGE', clock_timestamp(), true
        FROM
          generate_series($2::int, $3::int) AS n
      `,
          [hash, start, end],
        );
        await client.query(
          `
        INSERT INTO
          assessment.attempts (
            id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
            submission_id, submission_event_id, submission_kind, revision
          )
        SELECT
          ('70000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
          ('60000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
          $1, $2, 'COMPLETED', $3::timestamptz, $4::timestamptz, $5::timestamptz,
          ('80000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
          ('90000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'MANUAL', 1
        FROM
          generate_series($6::int, $7::int) AS n
      `,
          [v.examId, v.versionId, before, deadline, at, start, end],
        );
        await client.query(
          `
        INSERT INTO
          assessment.results (attempt_id, version_id, user_id, earned_points, possible_points, correct_count, question_count)
        SELECT
          id, version_id, user_id, 100, 100, 1, 1
        FROM
          assessment.attempts
        WHERE
          version_id = $1
          AND id BETWEEN $2::uuid AND $3::uuid
      `,
          [
            v.versionId,
            `70000000-0000-4000-8000-${String(start).padStart(12, "0")}`,
            `70000000-0000-4000-8000-${String(end).padStart(12, "0")}`,
          ],
        );
        await client.query(
          `
        INSERT INTO
          assessment.leaderboard_entries (version_id, user_id, attempt_id, earned_points, submitted_at, completion_sequence)
        SELECT
          r.version_id, r.user_id, r.attempt_id, r.earned_points, a.submitted_at, r.completion_sequence
        FROM
          assessment.results r
          JOIN assessment.attempts a ON a.id = r.attempt_id
        WHERE
          r.version_id = $1
          AND r.attempt_id BETWEEN $2::uuid AND $3::uuid
      `,
          [
            v.versionId,
            `70000000-0000-4000-8000-${String(start).padStart(12, "0")}`,
            `70000000-0000-4000-8000-${String(end).padStart(12, "0")}`,
          ],
        );
        await client.query("COMMIT");
      }
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    for (const table of [
      "identity.users",
      "assessment.attempts",
      "assessment.results",
      "assessment.leaderboard_entries",
      "catalog.published_versions",
    ])
      await fixture.query(`ANALYZE ${table}`);
    const source = await readFile(
      "apps/api/src/modules/reporting/infrastructure/persistence/postgres-ranking.query.ts",
      "utf8",
    );
    const sql = source.match(/`\s*(WITH policy[\s\S]*?)`/)?.[1];
    if (!sql) throw new Error("Exact ranking statement missing");
    const args = [v.examId, v.versionId, null, null, null, null, null, 101];
    const plan = await db.query(
      "diagnostic",
      "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + sql,
      args,
    );
    const comparison: unknown[] = [];
    if (process.env.LEADERBOARD_COMPARISON === "true") {
      const beforeSource = await readFile(
          "docs/evidence/leaderboard-2026-10-09/ranking-before.txt",
          "utf8",
        ),
        beforeSql = beforeSource.match(/`\s*(WITH policy[\s\S]*?)`/)?.[1];
      if (!beforeSql) throw new Error("Frozen comparison source missing");
      const first = await new PostgresRankingQuery(db).page({
        ...v,
        limit: 101,
        watermark: null,
        epoch: null,
        position: null,
      });
      for (const [label, binds, repetitions] of [
        ["first-page101", args, 40],
        [
          "after-rank50000-page101",
          [
            v.examId,
            v.versionId,
            first.watermark,
            first.epoch,
            100,
            at,
            "70000000-0000-4000-8000-000000050000",
            101,
          ],
          20,
        ],
      ] as const) {
        const windows = [];
        for (const [name, statement, statementSource] of [
          ["before", beforeSql, beforeSource],
          ["after", sql, source],
        ] as const) {
          const explain = await db.query(
            "diagnostic",
            "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + statement,
            [...binds],
          );
          for (let warm = 0; warm < 2; warm++) await db.query("diagnostic", statement, [...binds]);
          windows.push({
            name,
            statement,
            sourceSha256: createHash("sha256").update(statementSource).digest("hex"),
            plan: explain.rows,
            samplesMs: [] as number[],
          });
        }
        for (let n = 0; n < repetitions; n++) {
          const results = [];
          // Alternate order to reduce a fixed cache/order bias; no planner forcing.
          for (const window of n % 2 ? [...windows].reverse() : windows) {
            const started = performance.now(),
              result = await db.query("diagnostic", window.statement, [...binds]);
            window.samplesMs.push(performance.now() - started);
            results.push(result.rows[0]!.rows);
          }
          expect(results[0]).toEqual(results[1]);
        }
        comparison.push({
          label,
          repetitions,
          sameDatabaseDatasetPoolAndSettings: true,
          windows: windows.map(({ statement: _statement, ...window }) => {
            const sorted = [...window.samplesMs].sort((a, b) => a - b);
            return {
              ...window,
              p50: sorted[Math.ceil(repetitions * 0.5) - 1],
              p95: sorted[Math.ceil(repetitions * 0.95) - 1],
              p99: sorted[Math.ceil(repetitions * 0.99) - 1],
            };
          }),
        });
      }
      const middle = await new PostgresRankingQuery(db).page({
        ...v,
        limit: 101,
        watermark: first.watermark,
        epoch: first.epoch,
        position: ["100", at, "70000000-0000-4000-8000-000000050000"],
      });
      expect(middle.rows[0]!.rank).toBe(50001);
      expect(middle.rows).toHaveLength(101);
    }
    const databaseFacts = (
      await fixture.query(`
      SELECT
        version() AS version,
        current_setting('shared_buffers') AS shared_buffers,
        current_setting('work_mem') AS work_mem,
        current_setting('max_connections') AS max_connections
    `)
    ).rows[0];
    const durations: number[] = [],
      bytes: number[] = [];
    observations.length = 0;
    const cpu = process.cpuUsage(),
      rss = process.memoryUsage().rss,
      windowStarted = performance.now();
    for (let n = 0; n < 40; n++) {
      // Admission pacing occurs before starting each latency measurement.
      await new Promise((r) => setTimeout(r, 110));
      const started = performance.now(),
        response = await http.inject({ method: "GET", url: path(v), headers });
      durations.push(performance.now() - started);
      bytes.push(Buffer.byteLength(response.body));
      expect(response.statusCode).toBe(200);
      expect(body(response).items).toHaveLength(20);
    }
    const windowMs = performance.now() - windowStarted,
      usage = process.cpuUsage(cpu),
      sorted = [...durations].sort((a, b) => a - b);
    const output = {
      localOnly: true,
      dataset: {
        candidates: 100000,
        attempts: 100000,
        results: 100000,
        rankingEntries: 100000,
        versions: 1,
        scoreDistribution: "all100/tied submit timestamp",
      },
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pool: 2,
        databaseFacts,
      },
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      plan: plan.rows,
      comparison,
      samplesMs: durations,
      p50: sorted[19],
      p95: sorted[37],
      p99: sorted[39],
      samples: 40,
      successfulRequests: 40,
      unexpectedErrors: 0,
      windowMs,
      achievedSuccessfulRps: 40000 / windowMs,
      offeredArrivalRate: null,
      concurrentInFlight: 1,
      cpuUsPerRequestIncludingHarnessAndIdle: (usage.user + usage.system) / 40,
      rssBefore: rss,
      rssAfter: process.memoryUsage().rss,
      allocationBytesPerRequest: null,
      payloadBytes: bytes,
      queriesPerRequest: observations.filter((o) => o.kind === "query").length / 40,
      databaseObservations: observations,
      pool: {
        maximumTotal: Math.max(...observations.map((o) => o.total)),
        maximumWaiting: Math.max(...observations.map((o) => o.waiting)),
      },
      pureRowLockDurationMs: null,
      explicitReadTransaction: false,
      transactionDurationMs: null,
      sustainableRps: null,
      awsCost: null,
      scope:
        "Fastify HTTP injection, rate-paced single actor, no socket/TLS; local diagnostic, not saturation/SLO/cost",
    };
    expect(output.queriesPerRequest).toBe(3);
    if (process.env.LEADERBOARD_EVIDENCE_FILE)
      await writeFile(
        process.env.LEADERBOARD_EVIDENCE_FILE,
        JSON.stringify(output, null, 2) + "\n",
      );
  }, 180000);
});
