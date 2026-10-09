import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { HttpQuestionPageSizer } from "../../src/modules/assessment/infrastructure/http/http-question-page-sizer";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { Module } from "@nestjs/common";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Pool, type PoolClient } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  type DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { createHttpApplication } from "../../src/infrastructure/http/configure-http-application";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { ShutdownGate } from "../../src/infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { acceptAttemptSubmission } from "../../src/modules/assessment/application/services/attempt-submission";
import { AssessmentService } from "../../src/modules/assessment/application/services/assessment.service";
import { DeadlineSweep } from "../../src/modules/assessment/application/services/deadline-sweep";
import { HmacAssessmentCursor } from "../../src/modules/assessment/infrastructure/cursor/assessment-cursor";
import { claimDueSql } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.repository";
import { PostgresAttemptQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.query";
import { PostgresAttemptRepository } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "../../src/modules/assessment/infrastructure/persistence/postgres-submission-outbox";
import { AssessmentController } from "../../src/modules/assessment/presentation/http/assessment.controller";
import { CandidateResultsService } from "../../src/modules/assessment/application/services/candidate-results.service";
import { PostgresCandidateResultsQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-candidate-results.query";
import { CatalogService } from "../../src/modules/catalog/application/services/catalog.service";
import {
  type QuestionDraft,
  type QuestionType,
} from "../../src/modules/catalog/domain/catalog-policy";
import { HmacCatalogCursor } from "../../src/modules/catalog/infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.repository";
import {
  IDENTITY_ACCESS,
  REQUEST_GUARD,
} from "../../src/modules/identity/application/facades/identity.facade";
import { IdentityService } from "../../src/modules/identity/application/services/identity.service";
import { HttpSession } from "../../src/modules/identity/infrastructure/http/http-session";
import { PostgresIdentityQuery } from "../../src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";
import { PostgresIdentityRepository } from "../../src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../src/modules/identity/infrastructure/security/identity-crypto";
import { IdentityController } from "../../src/modules/identity/presentation/http/identity.controller";
import { HTTP_SESSION } from "../../src/modules/identity/presentation/http/http-session.port";
import { startExpiryWorker } from "../../src/workers/scheduler/expiry.main";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `expiry_test_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const owner = `expiry_ddl_${suffix}`;
const runtimeRole = `expiry_app_${suffix}`;
const operator = `expiry_ops_${suffix}`;
const expiryRole = `expiry_worker_${suffix}`;
const url = new URL(adminUrl);
url.pathname = `/${name}`;
const runtimeUrl = new URL(url);
runtimeUrl.username = runtimeRole;
runtimeUrl.password = password;
const ddlUrl = new URL(url);
ddlUrl.username = owner;
ddlUrl.password = password;
const opsUrl = new URL(url);
opsUrl.username = operator;
opsUrl.password = password;
const expiryUrl = new URL(url);
expiryUrl.username = expiryRole;
expiryUrl.password = password;
const rateKey = randomBytes(32);
const csrfKey = randomBytes(32);
const observations: DatabaseObservation[] = [];
const originalPassword = "initial candidate password";
const finalPassword = "email owner final password";
const origin = "http://127.0.0.1:3000";

let fixture: Pool;
let ops: Pool;
let db: PostgresDatabase;
let expiryDb: PostgresDatabase;
let expiryDb2: PostgresDatabase;
let identity: IdentityService;
let catalog: CatalogService;
let assessment: AssessmentService;
let sweep: DeadlineSweep;
let sweep2: DeadlineSweep;
let codec: VerificationCodec;
let adminUser: Actor;
let candidateUser: Actor;
let validateSubmit: ValidateFunction;

interface Actor {
  id: string;
  email: string;
  raw: string;
}

interface LiveSession {
  origin: string;
  cookie: string;
  "x-csrf-token": string;
}

function uuidv7(time = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = BigInt(time);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function choiceDraft(type: QuestionType, prompt: string): QuestionDraft {
  return {
    type,
    prompt,
    options: [
      { position: 1, text: "Option 1" },
      { position: 2, text: "Option 2" },
    ],
    correctOptionPositions: [1],
    points: 2,
    explanation: "hidden",
  };
}

function dbConfig(databaseUrl: string, poolMax = "4") {
  return databaseConfig({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    DB_POOL_MAX: poolMax,
    DB_MAX_WAITING: "8",
    DB_ACQUIRE_TIMEOUT_MS: "1000",
    DB_STATEMENT_TIMEOUT_MS: "2000",
    DB_LOCK_TIMEOUT_MS: "500",
    DB_IDLE_TRANSACTION_TIMEOUT_MS: "5000",
  });
}

async function scalar(sql: string, params: unknown[] = []): Promise<number> {
  const row = (await fixture.query<{ n: number }>(sql, params)).rows[0];
  if (!row) throw new Error("Scalar query returned no row");
  return Number(row.n);
}

async function text(sql: string, params: unknown[] = []): Promise<string> {
  const row = (await fixture.query<{ value: string }>(sql, params)).rows[0];
  if (!row) throw new Error("Text query returned no row");
  return row.value;
}

async function seenLock(): Promise<boolean> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const row = (
      await admin.query<{ n: number }>(
        `
        SELECT count(*)::int AS n
        FROM pg_stat_activity
        WHERE datname = $1 AND wait_event_type = 'Lock'
        `,
        [name],
      )
    ).rows[0];
    if (row && Number(row.n) > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return false;
}

async function registerAccount() {
  const email = `${randomUUID()}@example.test`;
  await identity.register({ email, displayName: "Candidate", password: originalPassword });
  const row = (
    await fixture.query<{ id: string; user_id: string; ciphertext: string }>(
      `
      SELECT c.id, c.user_id, c.ciphertext
      FROM identity.verification_challenges c
      JOIN identity.users u ON u.id = c.user_id
      WHERE u.email = $1
      `,
      [email],
    )
  ).rows[0];
  if (!row) throw new Error("Verification challenge missing");
  return { email, id: row.user_id, token: await codec.open(row.ciphertext, row.id) };
}

async function activated(): Promise<Actor> {
  const account = await registerAccount();
  await identity.confirm(account.token, finalPassword);
  const session = await identity.login(account.email, finalPassword);
  return { id: account.id, email: account.email, raw: session.access };
}

async function bankQuestion(draft: QuestionDraft): Promise<string> {
  const created = await catalog.createQuestion(
    adminUser.raw,
    uuidv7(),
    { ...draft, expectedRevision: 0 },
    randomUUID(),
  );
  return created.body.resourceId;
}

async function publishExam(attemptLimit = 2): Promise<{ examId: string; revision: number }> {
  const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", `Prompt ${randomUUID()}`));
  const draft = await catalog.createExam(
    adminUser.raw,
    uuidv7(),
    {
      title: "Expiry exam",
      category: "IT_CERTIFICATION",
      durationSeconds: 90,
      openAt: new Date(Date.now() - 60_000).toISOString(),
      closeAt: new Date(Date.now() + 3_600_000).toISOString(),
      displayTimezone: "Asia/Ho_Chi_Minh",
      attemptLimit,
      explanationPolicy: "NEVER",
      leaderboardEnabled: false,
      expectedRevision: 0,
      sections: [
        {
          title: "One",
          position: 1,
          questions: [{ bankQuestionId: questionId, position: 1, points: 5 }],
        },
      ],
    },
    randomUUID(),
  );
  const published = await catalog.publish(
    adminUser.raw,
    uuidv7(),
    draft.body.resourceId,
    1,
    randomUUID(),
  );
  return { examId: draft.body.resourceId, revision: published.body.revision };
}

async function versionOf(examId: string): Promise<string> {
  return text(`SELECT current_version_id::text AS value FROM catalog.exams WHERE id = $1`, [
    examId,
  ]);
}

async function seedDue(examId: string, deadlines: readonly string[]): Promise<string[]> {
  const versionId = await versionOf(examId);
  const ids: string[] = [];
  for (const deadline of deadlines) {
    const userId = randomUUID();
    const attemptId = randomUUID();
    await fixture.query(
      `
      INSERT INTO identity.users (id, email, password_hash, display_name)
      VALUES ($1, $2, 'fixture-not-a-real-password-hash', 'Sweep')
      `,
      [userId, `${userId}@example.test`],
    );
    await fixture.query(
      `
      INSERT INTO assessment.attempts (
        id, user_id, exam_id, version_id, status, started_at, deadline, revision
      )
      VALUES (
        $1, $2, $3, $4, 'IN_PROGRESS',
        clock_timestamp() - interval '2 hours',
        clock_timestamp() - $5::interval,
        1
      )
      `,
      [attemptId, userId, examId, versionId, deadline],
    );
    ids.push(attemptId);
  }
  return ids;
}

async function past(attemptId: string): Promise<void> {
  await fixture.query(
    `
    UPDATE assessment.attempts
    SET deadline = started_at + interval '1 millisecond'
    WHERE id = $1
    `,
    [attemptId],
  );
}

/** Test recovery without a wall-clock sleep: make persisted cooldown eligible by DB time. */
async function allowRetryNow(attemptId: string): Promise<void> {
  await fixture.query(
    `
    UPDATE assessment.attempts
    SET
      expiry_retry_after = clock_timestamp() - interval '1 second'
    WHERE
      id = $1
      AND status = 'IN_PROGRESS'
    `,
    [attemptId],
  );
}

async function outboxCount(attemptId?: string): Promise<number> {
  if (!attemptId) return scalar("SELECT count(*)::int AS n FROM platform.outbox");
  return scalar("SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1", [
    attemptId,
  ]);
}

async function attemptRow(attemptId: string) {
  const row = (
    await fixture.query<{
      status: string;
      expired: boolean;
      submission_kind: string | null;
      revision: number;
      version_id: string;
      deadline: Date;
      submission_id: string | null;
      submission_event_id: string | null;
      user_id: string;
    }>(
      `
      SELECT status, expired, submission_kind, revision, version_id, deadline,
             submission_id, submission_event_id, user_id
      FROM assessment.attempts WHERE id = $1
      `,
      [attemptId],
    )
  ).rows[0];
  if (!row) throw new Error("Attempt missing");
  return row;
}

async function eventPayload(attemptId: string) {
  const row = (
    await fixture.query<{
      payload: {
        payload: Record<string, unknown>;
        occurredAt: string;
        correlationId: string;
        causationId: string;
      };
    }>(`SELECT payload FROM platform.outbox WHERE aggregate_id = $1`, [attemptId])
  ).rows[0];
  if (!row) throw new Error("Outbox row missing");
  return row.payload;
}

function tick(): string {
  return randomUUID();
}

async function withHttp(use: (http: import("fastify").FastifyInstance) => Promise<void>) {
  const session = new HttpSession(identity, new PostgresSecurity(db, rateKey), origin, csrfKey);
  @Module({
    controllers: [AssessmentController, IdentityController],
    providers: [
      { provide: AssessmentService, useValue: assessment },
      {
        provide: CandidateResultsService,
        useValue: new CandidateResultsService(
          new PostgresCandidateResultsQuery(db),
          new HmacAssessmentCursor(csrfKey),
          new HttpQuestionPageSizer(),
        ),
      },
      { provide: IdentityService, useValue: identity },
      { provide: IDENTITY_ACCESS, useExisting: IdentityService },
      { provide: HTTP_SESSION, useValue: session },
      { provide: REQUEST_GUARD, useValue: session },
      ShutdownGate,
    ],
  })
  class ExpiryHttpModule {}
  const api = await createHttpApplication(ExpiryHttpModule);
  try {
    await use(api.app.getHttpAdapter().getInstance());
  } finally {
    await api.app.close();
  }
}

async function openSession(
  http: import("fastify").FastifyInstance,
  email: string,
): Promise<LiveSession> {
  const login = await identity.login(email, finalPassword);
  const csrf = await http.inject({
    method: "GET",
    url: "/v1/auth/csrf",
    headers: { cookie: `__Host-refresh=${login.refresh}` },
  });
  const cookie = csrf.cookies.find((item) => item.name === "__Host-csrf");
  if (!cookie) throw new Error("CSRF cookie missing");
  const body = csrf.json() as { data: { csrfToken: string } };
  return {
    origin,
    cookie: `__Host-access=${login.access}; __Host-refresh=${login.refresh}; __Host-csrf=${cookie.value}`,
    "x-csrf-token": body.data.csrfToken,
  };
}

function writeHeaders(session: LiveSession, key: string) {
  return {
    origin: session.origin,
    cookie: session.cookie,
    "x-csrf-token": session["x-csrf-token"],
    "idempotency-key": key,
  };
}

async function hold(
  attemptId: string,
): Promise<{ client: PoolClient; pid: number; release: () => Promise<void> }> {
  const client = await fixture.connect();
  await client.query("BEGIN");
  await client.query(`SELECT id FROM assessment.attempts WHERE id = $1 FOR UPDATE`, [attemptId]);
  const pid = Number(
    (await client.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]?.pid,
  );
  return {
    client,
    pid,
    release: async () => {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    },
  };
}

function workerEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    DATABASE_URL: expiryUrl.toString(),
    DB_POOL_MAX: "2",
    DB_MAX_WAITING: "4",
    DB_ACQUIRE_TIMEOUT_MS: "1000",
    DB_STATEMENT_TIMEOUT_MS: "2000",
    DB_LOCK_TIMEOUT_MS: "500",
    DB_IDLE_TRANSACTION_TIMEOUT_MS: "5000",
    DB_SSL: "false",
    EXPIRY_POLL_INTERVAL_MS: "5000",
    EXPIRY_BATCH_SIZE: "2",
    EXPIRY_JITTER_PERCENT: "0",
    EXPIRY_HEALTH_PORT: "0",
    ...extra,
  };
}

function spawnWorker(extra: Record<string, string> = {}): ChildProcess & { output: () => string } {
  if (!existsSync("dist/workers/scheduler/expiry.main.js")) {
    throw new Error("Compiled scheduler missing; build before this test");
  }
  const child = spawn(process.execPath, ["dist/workers/scheduler/expiry.main.js"], {
    env: workerEnv(extra),
    stdio: ["ignore", "pipe", "pipe"],
  }) as ChildProcess & { output: () => string };
  let buffer = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
  });
  child.output = () => buffer;
  return child;
}

async function readEvents(
  child: ChildProcess & { output: () => string },
  match: string,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const line = child
      .output()
      .split("\n")
      .find((item) => item.includes(match));
    if (line) return JSON.parse(line) as Record<string, unknown>;
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(child.output() || `Timed out waiting for ${match}`);
}

async function stopChild(child: ChildProcess): Promise<number> {
  if (child.exitCode !== null) return child.exitCode;
  child.kill("SIGTERM");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(1);
    }, 10_000);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
  });
}

beforeAll(async () => {
  const api = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validateSubmit = ajv.compile(api.components.schemas.SubmitReceiptEnvelope!);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const role of [owner, runtimeRole, operator, expiryRole]) {
    await admin.query(
      `CREATE ROLE ${role} LOGIN ${role === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
  }
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtimeRole}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await admin.query(`GRANT examination_expiry_worker TO ${expiryRole}`);
  await migrate(
    dbConfig(ddlUrl.toString(), "1"),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: url.toString(), max: 4 });
  ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
  db = new PostgresDatabase(dbConfig(runtimeUrl.toString()), (value) => observations.push(value));
  expiryDb = new PostgresDatabase(dbConfig(expiryUrl.toString()));
  expiryDb2 = new PostgresDatabase(dbConfig(expiryUrl.toString()));
  const repository = () => new PostgresAttemptRepository(expiryDb);
  sweep = new DeadlineSweep(repository(), new PostgresSubmissionOutbox(expiryDb), expiryDb, 50);
  sweep2 = new DeadlineSweep(
    new PostgresAttemptRepository(expiryDb2),
    new PostgresSubmissionOutbox(expiryDb2),
    expiryDb2,
    50,
  );
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "local-test",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const jwt = await JwtSessionTokens.create("urn:test:expiry", key, [key]);
  codec = new VerificationCodec("mail", { mail: randomBytes(32) });
  const passwords = new ArgonPasswords(2, 8);
  const dummy = await passwords.hash("dummy fixture credential");
  identity = new IdentityService(
    new PostgresIdentityRepository(db),
    db,
    passwords,
    jwt,
    codec,
    dummy,
    new PostgresSecurity(db, rateKey),
    new PostgresIdempotency(db),
    new PostgresIdentityQuery(db),
    new PostgresAuthenticatedWriteAdmission(db),
  );
  catalog = new CatalogService(
    identity,
    new PostgresCatalogRepository(db),
    new PostgresCatalogQuery(db),
    new PostgresIdempotency(db),
    new PostgresSecurity(db, rateKey),
    db,
    new HmacCatalogCursor(csrfKey),
  );
  assessment = new AssessmentService(
    identity,
    catalog,
    new PostgresAttemptRepository(db),
    new PostgresAttemptQuery(db),
    new PostgresIdempotency(db),
    new PostgresSubmissionOutbox(db),
    db,
    new HmacAssessmentCursor(csrfKey),
    new HttpQuestionPageSizer(),
  );
  const account = await registerAccount();
  await identity.confirm(account.token, finalPassword);
  await ops.query(
    "SELECT identity.operator_admin($1, 'expiry-test', 'expiry local admin', $2, true, true)",
    [account.id, randomUUID()],
  );
  await fixture.query(
    "DELETE FROM identity.user_roles WHERE user_id = $1 AND role_id = 'CANDIDATE'",
    [account.id],
  );
  adminUser = {
    id: account.id,
    email: account.email,
    raw: (await identity.login(account.email, finalPassword)).access,
  };
  candidateUser = await activated();
});

afterAll(async () => {
  await fixture
    ?.query("DROP TRIGGER IF EXISTS expiry_poison ON platform.outbox")
    .catch(() => undefined);
  await fixture
    ?.query("DROP TRIGGER IF EXISTS expiry_kill ON assessment.attempts")
    .catch(() => undefined);
  await db?.close();
  await expiryDb?.close();
  await expiryDb2?.close();
  await fixture?.end();
  await ops?.end();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const running = (
      await admin.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1",
        [name],
      )
    ).rows[0];
    if (running && Number(running.n) === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${operator}, ${expiryRole}`);
  await admin.end();
});

describe("deadline sweep on restricted PostgreSQL", () => {
  it("leaves a future attempt untouched and expires one whose deadline is already past", async () => {
    const exam = await publishExam();
    const future = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const [due] = await seedDue(exam.examId, ["1 minute"]);
    if (!due) throw new Error("Due attempt missing");
    const result = await sweep.runOnce(tick());
    expect(result.processed).toBe(1);
    expect((await attemptRow(future.body.id)).status).toBe("IN_PROGRESS");
    expect((await attemptRow(future.body.id)).submission_kind).toBeNull();
    const expired = await attemptRow(due);
    expect(expired).toMatchObject({
      status: "EXPIRED",
      expired: true,
      submission_kind: "DEADLINE",
      revision: 2,
    });
    expect(await outboxCount(due)).toBe(1);
    const payload = await eventPayload(due);
    expect(payload.payload).toMatchObject({
      submissionKind: "DEADLINE",
      expired: true,
      attemptId: due,
      publishedVersionId: expired.version_id,
    });
    const acceptedAt = await text(
      `SELECT to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS value FROM assessment.attempts WHERE id = $1`,
      [due],
    );
    expect(payload.occurredAt).toBe(acceptedAt);
    expect(String(payload.payload.deadline)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.correlationId).not.toBe(expired.user_id);
    expect(JSON.stringify(payload)).not.toContain(expired.user_id);
    const again = await sweep.runOnce(tick());
    expect(again.processed).toBe(0);
    expect(await outboxCount(due)).toBe(1);
    expect((await attemptRow(due)).revision).toBe(2);
  });

  it("accepts DEADLINE at the exact stored deadline through the shared core", async () => {
    const exam = await publishExam();
    const [id] = await seedDue(exam.examId, ["1 minute"]);
    if (!id) throw new Error("Attempt missing");
    const deadline = await text(
      `SELECT to_char(deadline AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS value FROM assessment.attempts WHERE id = $1`,
      [id],
    );
    const repo = new PostgresAttemptRepository(db);
    const accepted = await db.transaction(async () => {
      const locked = await repo.lockOwned(id, (await attemptRow(id)).user_id);
      if (!locked) throw new Error("Lock missing");
      return acceptAttemptSubmission(repo, new PostgresSubmissionOutbox(db), {
        locked: { ...locked, serverNow: deadline },
        kind: "DEADLINE",
        correlationId: randomUUID(),
        causationId: randomUUID(),
      });
    });
    expect(accepted.written).toBe(true);
    expect(accepted.receipt).toMatchObject({
      acceptanceState: "EXPIRED",
      expired: true,
      acceptedAt: deadline,
    });
    const row = await attemptRow(id);
    expect(row.submission_kind).toBe("DEADLINE");
    expect((await eventPayload(id)).occurredAt).toBe(deadline);
  });

  it("keeps an acknowledged save and rejects a save after the deadline", async () => {
    const exam = await publishExam();
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const question = (await assessment.questions(candidateUser.id, started.body.id, 20, null))
      .items[0];
    if (!question) throw new Error("Question missing");
    const saved = await assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
      {
        questionId: question.id,
        selectedOptionIds: [question.options[0]!.id],
        marked: true,
        expectedVersion: 0,
      },
    ]);
    expect(saved.httpStatus).toBe(200);
    const before = await scalar(
      "SELECT count(*)::int AS n FROM assessment.answer_selections WHERE attempt_id = $1",
      [started.body.id],
    );
    await past(started.body.id);
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        { questionId: question.id, selectedOptionIds: [], marked: false, expectedVersion: 1 },
      ]),
    ).rejects.toThrow("Attempt is closed");
    const swept = await sweep.runOnce(tick());
    expect(swept.processed).toBe(1);
    expect(
      await scalar(
        "SELECT count(*)::int AS n FROM assessment.answer_selections WHERE attempt_id = $1",
        [started.body.id],
      ),
    ).toBe(before);
    expect((await attemptRow(started.body.id)).submission_kind).toBe("DEADLINE");
  });

  it("sweeps an offline attempt and an attempt whose session family was revoked", async () => {
    const exam = await publishExam();
    const [offline] = await seedDue(exam.examId, ["2 minutes"]);
    if (!offline) throw new Error("Offline attempt missing");
    const live = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    await fixture.query(
      `UPDATE identity.session_families SET revoked_at = clock_timestamp() WHERE user_id = $1 AND revoked_at IS NULL`,
      [candidateUser.id],
    );
    await past(live.body.id);
    try {
      const result = await sweep.runOnce(tick());
      expect(result.processed).toBeGreaterThanOrEqual(2);
      expect((await attemptRow(offline)).status).toBe("EXPIRED");
      expect((await attemptRow(live.body.id)).status).toBe("EXPIRED");
      await expect(
        assessment.submit(candidateUser.raw, uuidv7(), live.body.id, randomUUID()),
      ).rejects.toThrow("Unauthenticated");
    } finally {
      candidateUser = await activated();
    }
  });

  it("lets a manual submit and the sweep keep one winner", async () => {
    const exam = await publishExam();
    const manual = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    await past(manual.body.id);
    const submitted = await assessment.submit(
      candidateUser.raw,
      uuidv7(),
      manual.body.id,
      randomUUID(),
    );
    expect(submitted.body).toMatchObject({ acceptanceState: "EXPIRED", expired: true });
    expect((await attemptRow(manual.body.id)).submission_kind).toBe("MANUAL");
    expect(await outboxCount(manual.body.id)).toBe(1);
    const afterManual = await sweep.runOnce(tick());
    expect(afterManual.processed).toBe(0);
    expect(await outboxCount(manual.body.id)).toBe(1);

    const swept = await assessment.start(candidateUser.raw, uuidv7(), (await publishExam()).examId);
    await past(swept.body.id);
    await sweep.runOnce(tick());
    const replay = await assessment.submit(
      candidateUser.raw,
      uuidv7(),
      swept.body.id,
      randomUUID(),
    );
    const sweptRow = await attemptRow(swept.body.id);
    const sweptAt = await text(
      `SELECT to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS value FROM assessment.attempts WHERE id = $1`,
      [swept.body.id],
    );
    expect(replay.body.submissionId).toBe(sweptRow.submission_id);
    expect(replay.body.acceptedAt).toBe(sweptAt);
    expect((await attemptRow(swept.body.id)).submission_kind).toBe("DEADLINE");
    expect(await outboxCount(swept.body.id)).toBe(1);
    expect(replay.httpStatus).toBe(202);
  });

  it("returns the sweep receipt unchanged over HTTP", async () => {
    const exam = await publishExam();
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    await past(started.body.id);
    await sweep.runOnce(tick());
    const row = await attemptRow(started.body.id);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const response = await http.inject({
        method: "POST",
        url: `/v1/attempts/${started.body.id}/submit`,
        headers: writeHeaders(session, uuidv7()),
      });
      expect(response.statusCode).toBe(202);
      expect(response.headers["retry-after"]).toBe("2");
      expect(response.headers["cache-control"]).toBe("no-store");
      const body = response.json();
      if (!validateSubmit(body)) throw new Error(JSON.stringify(validateSubmit.errors));
      expect(body.data).toEqual({
        attemptId: started.body.id,
        submissionId: row.submission_id,
        acceptedAt: body.data.acceptedAt,
        acceptanceState: "EXPIRED",
        expired: true,
      });
      expect(body.data.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
    expect(await outboxCount(started.body.id)).toBe(1);
    expect((await attemptRow(started.body.id)).submission_kind).toBe("DEADLINE");
  });

  it("skips a locked oldest row without waiting and still expires a younger one", async () => {
    const exam = await publishExam();
    const [oldest, younger] = await seedDue(exam.examId, ["10 minutes", "1 minute"]);
    if (!oldest || !younger) throw new Error("Pair missing");
    const held = await hold(oldest);
    try {
      let observed = false;
      const running = sweep.runOnce(tick());
      for (let attempt = 0; attempt < 50 && !observed; attempt += 1) {
        const youngerStatus = (await attemptRow(younger)).status;
        const locks = (
          await admin.query<{ waiting: number; held: number }>(
            `
            SELECT
              count(*) FILTER (WHERE NOT l.granted)::int AS waiting,
              count(*) FILTER (WHERE l.granted AND l.pid = $2)::int AS held
            FROM pg_locks l
            JOIN pg_stat_activity a ON a.pid = l.pid
            WHERE a.datname = $1
            `,
            [name, held.pid],
          )
        ).rows[0];
        if (youngerStatus === "EXPIRED" && locks && Number(locks.held) > 0) {
          expect(Number(locks.waiting)).toBe(0);
          observed = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      await running;
      expect(observed).toBe(true);
      expect((await attemptRow(oldest)).status).toBe("IN_PROGRESS");
    } finally {
      await held.release();
    }
    await sweep.runOnce(tick());
    expect((await attemptRow(oldest)).status).toBe("EXPIRED");
    expect(await outboxCount(oldest)).toBe(1);
    expect(await outboxCount(younger)).toBe(1);
  });

  it("observes a real lock wait when manual submit needs the held attempt", async () => {
    const exam = await publishExam();
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const held = await hold(started.body.id);
    let waiting = false;
    let pending: Promise<unknown> = Promise.resolve();
    try {
      pending = assessment.submit(candidateUser.raw, uuidv7(), started.body.id, randomUUID());
      waiting = await seenLock();
    } finally {
      await held.release();
    }
    expect(waiting).toBe(true);
    const submitted = (await pending) as { body: { submissionId: string } };
    expect(submitted.body.submissionId).toEqual(expect.any(String));
    expect((await attemptRow(started.body.id)).submission_kind).toBe("MANUAL");
  });

  it("limits a tick and does not starve a younger row behind a poison oldest row", async () => {
    const exam = await publishExam();
    const ids = await seedDue(exam.examId, [
      "5 minutes",
      "4 minutes",
      "3 minutes",
      "2 minutes",
      "1 minute",
    ]);
    const limited = new DeadlineSweep(
      new PostgresAttemptRepository(expiryDb),
      new PostgresSubmissionOutbox(expiryDb),
      expiryDb,
      2,
    );
    const first = await limited.runOnce(tick());
    expect(first.processed).toBe(2);
    expect(
      await scalar(
        "SELECT count(*)::int AS n FROM assessment.attempts WHERE id = ANY($1::uuid[]) AND status = 'EXPIRED'",
        [ids],
      ),
    ).toBe(2);
    expect((await attemptRow(ids[0]!)).status).toBe("EXPIRED");
    expect((await attemptRow(ids[4]!)).status).toBe("IN_PROGRESS");
    const oldest = ids[0]!;
    await fixture.query(`
      CREATE OR REPLACE FUNCTION public.expiry_poison() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        IF NEW.aggregate_id = '${ids[2]}'::uuid THEN
          RAISE EXCEPTION 'poison' USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
      END
      $fn$
    `);
    await fixture.query(`
      DROP TRIGGER IF EXISTS expiry_poison ON platform.outbox;
      CREATE TRIGGER expiry_poison BEFORE INSERT ON platform.outbox
      FOR EACH ROW EXECUTE FUNCTION public.expiry_poison()
    `);
    try {
      const poisoned = await limited.runOnce(tick());
      expect(poisoned.failed).toBeGreaterThanOrEqual(1);
      expect((await attemptRow(ids[2]!)).status).toBe("IN_PROGRESS");
      expect((await attemptRow(ids[3]!)).status).toBe("EXPIRED");
      expect(await outboxCount(ids[2]!)).toBe(0);
    } finally {
      await fixture.query("DROP TRIGGER IF EXISTS expiry_poison ON platform.outbox");
      await fixture.query("DROP FUNCTION IF EXISTS public.expiry_poison()");
    }
    await allowRetryNow(ids[2]!);
    await limited.runOnce(tick());
    expect((await attemptRow(ids[2]!)).status).toBe("EXPIRED");
    expect(await outboxCount(ids[2]!)).toBe(1);
    expect(await outboxCount(oldest)).toBe(1);
  });

  it("rolls back the attempt when the outbox insert fails", async () => {
    const exam = await publishExam();
    const [id] = await seedDue(exam.examId, ["1 minute"]);
    if (!id) throw new Error("Attempt missing");
    await fixture.query(`
      CREATE OR REPLACE FUNCTION public.expiry_block() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'blocked outbox' USING ERRCODE = 'P0001';
      END
      $fn$
    `);
    await fixture.query(`
      DROP TRIGGER IF EXISTS expiry_block ON platform.outbox;
      CREATE TRIGGER expiry_block BEFORE INSERT ON platform.outbox
      FOR EACH ROW EXECUTE FUNCTION public.expiry_block()
    `);
    try {
      const failed = await sweep.runOnce(tick());
      expect(failed.processed).toBe(0);
      expect(failed.failed).toBeGreaterThanOrEqual(1);
      expect((await attemptRow(id)).status).toBe("IN_PROGRESS");
      expect(await outboxCount(id)).toBe(0);
    } finally {
      await fixture.query("DROP TRIGGER IF EXISTS expiry_block ON platform.outbox");
      await fixture.query("DROP FUNCTION IF EXISTS public.expiry_block()");
    }
    await allowRetryNow(id);
    await sweep.runOnce(tick());
    expect((await attemptRow(id)).status).toBe("EXPIRED");
    expect(await outboxCount(id)).toBe(1);
  });

  it("rolls back when the worker connection dies inside the transaction and does not duplicate after commit", async () => {
    const exam = await publishExam();
    const [killed, committed] = await seedDue(exam.examId, ["2 minutes", "1 minute"]);
    if (!killed || !committed) throw new Error("Attempts missing");
    await fixture.query(`
      CREATE OR REPLACE FUNCTION public.expiry_kill() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        PERFORM pg_terminate_backend(pg_backend_pid());
        RETURN NEW;
      END
      $fn$
    `);
    await fixture.query(`
      DROP TRIGGER IF EXISTS expiry_kill ON assessment.attempts;
      CREATE TRIGGER expiry_kill BEFORE UPDATE ON assessment.attempts
      FOR EACH ROW EXECUTE FUNCTION public.expiry_kill()
    `);
    try {
      await sweep.runOnce(tick()).catch(() => undefined);
    } finally {
      await fixture.query("DROP TRIGGER IF EXISTS expiry_kill ON assessment.attempts");
      await fixture.query("DROP FUNCTION IF EXISTS public.expiry_kill()");
    }
    expect((await attemptRow(killed)).status).toBe("IN_PROGRESS");
    expect(await outboxCount(killed)).toBe(0);
    expect((await attemptRow(committed)).status).toBe("IN_PROGRESS");
    let thrown = false;
    const losing = new DeadlineSweep(
      new PostgresAttemptRepository(expiryDb),
      new PostgresSubmissionOutbox(expiryDb),
      {
        transaction: async (work) => {
          const result = await expiryDb.transaction(work);
          if (!thrown) {
            thrown = true;
            throw new Error("ack lost");
          }
          return result;
        },
      },
      10,
    );
    const lost = await losing.runOnce(tick());
    expect(lost.failed).toBeGreaterThanOrEqual(1);
    expect((await attemptRow(committed)).status).toBe("EXPIRED");
    const firstEvent = await outboxCount(committed);
    expect(firstEvent).toBe(1);
    await sweep.runOnce(tick());
    expect(await outboxCount(committed)).toBe(1);
    expect((await attemptRow(killed)).status).toBe("EXPIRED");
    expect(await outboxCount(killed)).toBe(1);
  });

  it("lets two workers expire a backlog once each", async () => {
    const exam = await publishExam();
    const ids = await seedDue(exam.examId, ["8 minutes", "7 minutes", "6 minutes", "5 minutes"]);
    await Promise.all([sweep.runOnce(tick()), sweep2.runOnce(tick())]);
    for (const id of ids) {
      expect((await attemptRow(id)).status).toBe("EXPIRED");
      expect(await outboxCount(id)).toBe(1);
    }
  });

  it("frees the active slot, keeps the quota, and preserves the frozen version across republish", async () => {
    const exam = await publishExam(1);
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const before = await attemptRow(started.body.id);
    const unpublished = await catalog.unpublish(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      exam.revision,
      randomUUID(),
    );
    await catalog.publish(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      unpublished.body.revision,
      randomUUID(),
    );
    const during = await attemptRow(started.body.id);
    expect(during.version_id).toBe(before.version_id);
    expect(during.deadline.toISOString()).toBe(before.deadline.toISOString());
    await past(started.body.id);
    await sweep.runOnce(tick());
    const after = await attemptRow(started.body.id);
    expect(after.version_id).toBe(before.version_id);
    expect((await eventPayload(started.body.id)).payload.publishedVersionId).toBe(
      before.version_id,
    );
    await expect(assessment.start(candidateUser.raw, uuidv7(), exam.examId)).rejects.toThrow(
      "Attempt limit reached",
    );
  });

  it("uses the deadline index and grants only the expiry role what the sweep needs", async () => {
    const client = await fixture.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL enable_seqscan = off");
      const plan = await client.query<{
        "QUERY PLAN": { Plan: { "Index Name"?: string; Plans?: unknown[] } }[];
      }>(`EXPLAIN (FORMAT JSON) ${claimDueSql}`, [[]]);
      await client.query("ROLLBACK");
      expect(JSON.stringify(plan.rows[0]?.["QUERY PLAN"])).toContain("attempts_deadline");
    } finally {
      client.release();
    }
    await expect(
      expiryDb.query("diagnostic", "SELECT ciphertext FROM identity.verification_challenges"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      expiryDb.query("diagnostic", "SELECT id FROM identity.sessions"),
    ).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      expiryDb.query("diagnostic", "SELECT question_id FROM catalog.published_answer_keys"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      expiryDb.query("diagnostic", "SELECT option_id FROM assessment.answer_selections"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      expiryDb.query("diagnostic", "UPDATE assessment.attempts SET deadline = deadline"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      expiryDb.query("diagnostic", "SELECT attempt_id FROM assessment.results"),
    ).rejects.toMatchObject({ code: "42501" });
    const visible = await expiryDb.query(
      "assessment.read",
      "SELECT count(*)::int AS n FROM assessment.attempts",
    );
    expect(Number(visible.rows[0]?.n)).toBeGreaterThan(0);
  });

  it("keeps the manual hot-path query ceilings", async () => {
    const exam = await publishExam();
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const count = async (run: () => Promise<import("fastify").LightMyRequestResponse>) => {
        observations.length = 0;
        const response = await run();
        return { response, queries: observations.filter((item) => item.kind === "query").length };
      };
      const started = await count(() =>
        http.inject({
          method: "POST",
          url: `/v1/exams/${exam.examId}/attempts`,
          headers: writeHeaders(session, uuidv7()),
        }),
      );
      expect(started.response.statusCode).toBe(201);
      const attemptId = started.response.json().data.id as string;
      const question = (await assessment.questions(candidateUser.id, attemptId, 20, null)).items[0];
      if (!question) throw new Error("Question missing");
      const questions = await count(() =>
        http.inject({
          method: "GET",
          url: `/v1/attempts/${attemptId}/questions?pageSize=20`,
          headers: { cookie: session.cookie },
        }),
      );
      const saved = await count(() =>
        http.inject({
          method: "PUT",
          url: `/v1/attempts/${attemptId}/answers`,
          headers: writeHeaders(session, uuidv7()),
          payload: {
            answers: [
              { questionId: question.id, selectedOptionIds: [], marked: false, expectedVersion: 0 },
            ],
          },
        }),
      );
      const answers = await count(() =>
        http.inject({
          method: "GET",
          url: `/v1/attempts/${attemptId}/answers?pageSize=20`,
          headers: { cookie: session.cookie },
        }),
      );
      const submitted = await count(() =>
        http.inject({
          method: "POST",
          url: `/v1/attempts/${attemptId}/submit`,
          headers: writeHeaders(session, uuidv7()),
        }),
      );
      const status = await count(() =>
        http.inject({
          method: "GET",
          url: `/v1/attempts/${attemptId}/status`,
          headers: { cookie: session.cookie },
        }),
      );
      expect(saved.response.statusCode).toBe(200);
      expect(submitted.response.statusCode).toBe(202);
      expect(questions.response.statusCode).toBe(200);
      expect(answers.response.statusCode).toBe(200);
      expect(status.response.statusCode).toBe(200);
      expect(started.queries).toBeLessThanOrEqual(12);
      expect(saved.queries).toBeLessThanOrEqual(11);
      expect(submitted.queries).toBeLessThanOrEqual(10);
      expect(questions.queries).toBeLessThanOrEqual(4);
      expect(answers.queries).toBeLessThanOrEqual(4);
      expect(status.queries).toBeLessThanOrEqual(3);
      await writeFile(
        "/tmp/att07-query-counts.json",
        JSON.stringify({
          start: started.queries,
          save: saved.queries,
          submit: submitted.queries,
          questions: questions.queries,
          answers: answers.queries,
          status: status.queries,
        }),
      );
    });
  });

  it("starts the compiled scheduler, stops on SIGTERM, and restarts without a duplicate event", async () => {
    const exam = await publishExam();
    const ids = await seedDue(exam.examId, ["6 minutes", "5 minutes", "4 minutes", "3 minutes"]);
    const first = spawnWorker();
    try {
      const started = await readEvents(first, "expiry.signals");
      expect(started.event).toBe("expiry.signals");
      const portLine = await readEvents(first, "expiry.started");
      const port = Number(portLine.port);
      const live = await fetch(`http://127.0.0.1:${port}/live`);
      const ready = await fetch(`http://127.0.0.1:${port}/ready`);
      expect(live.status).toBe(200);
      expect(await live.json()).toEqual({ status: "ok" });
      expect(ready.status).toBe(200);
      expect(ready.headers.get("cache-control")).toBe("no-store");
      const code = await stopChild(first);
      expect(code).toBe(0);
    } finally {
      if (first.exitCode === null) await stopChild(first);
    }
    const partial = await scalar(
      "SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = ANY($1::uuid[])",
      [ids],
    );
    const second = spawnWorker();
    try {
      await readEvents(second, "expiry.signals");
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const done = await scalar(
          "SELECT count(*)::int AS n FROM assessment.attempts WHERE id = ANY($1::uuid[]) AND status = 'EXPIRED'",
          [ids],
        );
        if (done === ids.length) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(
        await scalar(
          "SELECT count(*)::int AS n FROM assessment.attempts WHERE id = ANY($1::uuid[]) AND status = 'EXPIRED'",
          [ids],
        ),
      ).toBe(ids.length);
      expect(
        await scalar(
          "SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = ANY($1::uuid[])",
          [ids],
        ),
      ).toBe(ids.length);
      expect(partial).toBeLessThanOrEqual(ids.length);
      const code = await stopChild(second);
      expect(code).toBe(0);
    } finally {
      if (second.exitCode === null) await stopChild(second);
    }
    const broken = spawnWorker({ DATABASE_URL: "postgres://expiry:secret@127.0.0.1:1/none" });
    const failed = await new Promise<number>((resolve) => {
      broken.once("exit", (code) => resolve(code ?? 1));
    });
    expect(failed).toBe(1);
  });

  it("reports ready only while the database sweep can run", async () => {
    const handle = await startExpiryWorker(workerEnv({ EXPIRY_BATCH_SIZE: "1" }), () => undefined);
    try {
      const live = await fetch(`http://127.0.0.1:${handle.port}/live`);
      const ready = await fetch(`http://127.0.0.1:${handle.port}/ready`);
      const missing = await fetch(`http://127.0.0.1:${handle.port}/sweep`);
      expect(await live.json()).toEqual({ status: "ok" });
      expect(await ready.json()).toEqual({ status: "ok" });
      expect(missing.status).toBe(503);
      await handle.stop();
      const after = await fetch(`http://127.0.0.1:${handle.port}/live`).catch(() => undefined);
      expect(after).toBeUndefined();
    } finally {
      await handle.stop();
    }
  });
});
