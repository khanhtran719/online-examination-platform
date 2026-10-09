import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { HttpQuestionPageSizer } from "../../src/modules/assessment/infrastructure/http/http-question-page-sizer";
import { createHmac, createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
import { createHttpApplication } from "../../src/infrastructure/http/configure-http-application";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { ShutdownGate } from "../../src/infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { AssessmentService } from "../../src/modules/assessment/application/services/assessment.service";
import { HmacAssessmentCursor } from "../../src/modules/assessment/infrastructure/cursor/assessment-cursor";
import { PostgresAttemptQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.query";
import { PostgresAttemptRepository } from "../../src/modules/assessment/infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "../../src/modules/assessment/infrastructure/persistence/postgres-submission-outbox";
import { AssessmentController } from "../../src/modules/assessment/presentation/http/assessment.controller";
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
import { CandidateResultsService } from "../../src/modules/assessment/application/services/candidate-results.service";
import { PostgresCandidateResultsQuery } from "../../src/modules/assessment/infrastructure/persistence/postgres-candidate-results.query";
import {
  createGradingConsumer,
  createGradingRecovery,
} from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `assessment_test_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const owner = `assessment_ddl_${suffix}`;
const runtimeRole = `assessment_app_${suffix}`;
const operator = `assessment_ops_${suffix}`;
const graderRole = `assessment_grade_${suffix}`;
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
const rateKey = randomBytes(32);
const csrfKey = randomBytes(32);
const observations: DatabaseObservation[] = [];
const originalPassword = "initial candidate password";
const finalPassword = "email owner final password";
const explanationToken = "SECRET_EXPLANATION";
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const origin = "http://127.0.0.1:3000";

let fixture: Pool;
let ops: Pool;
let db: PostgresDatabase;
let db2: PostgresDatabase;
let graderDb: PostgresDatabase;
let identity: IdentityService;
let catalog: CatalogService;
let assessment: AssessmentService;
let assessment2: AssessmentService;
let codec: VerificationCodec;
let adminUser: Actor;
let candidateUser: Actor;
let foreignUser: Actor;
let httpUser: Actor;
let metricUser: Actor;
let validateAttempt: ValidateFunction;
let validateQuestions: ValidateFunction;
let validateAnswers: ValidateFunction;
let validateSave: ValidateFunction;
let validateSubmit: ValidateFunction;
let validateResult: ValidateFunction;
let validateReview: ValidateFunction;
let validateHistory: ValidateFunction;

interface Actor {
  id: string;
  email: string;
  raw: string;
}

interface PublishedExam {
  examId: string;
  revision: number;
}

interface LiveSession {
  origin: string;
  cookie: string;
  "x-csrf-token": string;
  access: string;
  refresh: string;
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

function choiceDraft(
  type: QuestionType,
  prompt: string,
  optionCount: number,
  correctOptionPositions: number[],
): QuestionDraft {
  return {
    type,
    prompt,
    options: Array.from({ length: optionCount }, (_, index) => ({
      position: index + 1,
      text: `Option ${index + 1}`,
    })),
    correctOptionPositions,
    points: 2,
    explanation: explanationToken,
  };
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const row = (
      await admin.query<{ n: number }>(
        `
        SELECT
          count(*)::int AS n
        FROM
          pg_stat_activity
        WHERE
          datname = $1
          AND wait_event_type = 'Lock'
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
      SELECT
        c.id,
        c.user_id,
        c.ciphertext
      FROM
        identity.verification_challenges c
        JOIN identity.users u ON u.id = c.user_id
      WHERE
        u.email = $1
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

async function publishExam(
  questions: readonly { bankQuestionId: string; points?: number }[],
  attemptLimit = 2,
  explanationPolicy: "NEVER" | "AFTER_COMPLETION" | "AFTER_EXAM_CLOSE" = "NEVER",
  splitSections = false,
): Promise<PublishedExam> {
  const draft = await catalog.createExam(
    adminUser.raw,
    uuidv7(),
    {
      title: "Assessment exam",
      category: "IT_CERTIFICATION",
      durationSeconds: 90,
      openAt: new Date(Date.now() - 60_000).toISOString(),
      closeAt: new Date(Date.now() + 3_600_000).toISOString(),
      displayTimezone: "Asia/Ho_Chi_Minh",
      attemptLimit,
      explanationPolicy,
      leaderboardEnabled: false,
      expectedRevision: 0,
      sections: splitSections
        ? [
            {
              title: "One",
              position: 1,
              questions: questions.slice(0, 2).map((question, index) => ({
                bankQuestionId: question.bankQuestionId,
                position: index + 1,
                points: question.points ?? 5,
              })),
            },
            {
              title: "Two",
              position: 2,
              questions: questions.slice(2).map((question, index) => ({
                bankQuestionId: question.bankQuestionId,
                position: index + 1,
                points: question.points ?? 5,
              })),
            },
          ]
        : [
            {
              title: "One",
              position: 1,
              questions: questions.map((question, index) => ({
                bankQuestionId: question.bankQuestionId,
                position: index + 1,
                points: question.points ?? 5,
              })),
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

async function importBank(prompts: readonly string[]): Promise<string[]> {
  const imported = await catalog.importQuestions(
    adminUser.raw,
    uuidv7(),
    {
      schemaVersion: 1,
      dryRun: false,
      questions: prompts.map((prompt, index) => ({
        type: "SINGLE_CHOICE" as const,
        prompt,
        options: [
          { position: 1, text: "A" },
          { position: 2, text: "B" },
        ],
        points: 2,
        explanation: explanationToken,
        clientRef: `q${index}`,
        correctOptionPositions: [1],
      })),
    },
    randomUUID(),
  );
  return imported.body.questions.map((question) => question.questionId);
}

async function blockOutbox(): Promise<void> {
  await fixture.query(`
    CREATE OR REPLACE FUNCTION public.assessment_outbox_fail() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      RAISE EXCEPTION 'blocked outbox' USING ERRCODE = 'P0001';
    END
    $fn$
  `);
  await fixture.query(`
    DROP TRIGGER IF EXISTS assessment_outbox_fail ON platform.outbox
  `);
  await fixture.query(`
    CREATE TRIGGER assessment_outbox_fail
    BEFORE INSERT ON platform.outbox
    FOR EACH ROW EXECUTE FUNCTION public.assessment_outbox_fail()
  `);
}

async function unblockOutbox(): Promise<void> {
  await fixture.query("DROP TRIGGER IF EXISTS assessment_outbox_fail ON platform.outbox");
  await fixture.query("DROP FUNCTION IF EXISTS public.assessment_outbox_fail()");
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
  class AssessmentHttpModule {}
  const api = await createHttpApplication(AssessmentHttpModule);
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
    access: login.access,
    refresh: login.refresh,
  };
}

function assertSchema(validate: ValidateFunction, value: unknown): void {
  if (!validate(value)) throw new Error(JSON.stringify(validate.errors));
}

function noStore(response: import("fastify").LightMyRequestResponse): void {
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.headers["x-correlation-id"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
}

beforeAll(async () => {
  const api = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validateAttempt = ajv.compile(api.components.schemas.AttemptEnvelope!);
  validateQuestions = ajv.compile(api.components.schemas.CandidateQuestionListEnvelope!);
  validateAnswers = ajv.compile(api.components.schemas.AnswerListEnvelope!);
  validateSave = ajv.compile(api.components.schemas.SaveReceiptEnvelope!);
  validateSubmit = ajv.compile(api.components.schemas.SubmitReceiptEnvelope!);
  validateResult = ajv.compile(api.components.schemas.ResultEnvelope!);
  validateReview = ajv.compile(api.components.schemas.ReviewQuestionListEnvelope!);
  validateHistory = ajv.compile(api.components.schemas.HistoryItemListEnvelope!);
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtimeRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${operator} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${graderRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtimeRole}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await admin.query(`GRANT examination_grading_worker TO ${graderRole}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: url.toString(), max: 2 });
  ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
  const runtimeConfig = databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() });
  db = new PostgresDatabase(runtimeConfig, (value) => observations.push(value));
  db2 = new PostgresDatabase(runtimeConfig);
  const gradingUrl = new URL(url);
  gradingUrl.username = graderRole;
  gradingUrl.password = password;
  graderDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: gradingUrl.toString() }),
  );
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "local-test",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const jwt = await JwtSessionTokens.create("urn:test:assessment", key, [key]);
  codec = new VerificationCodec("mail", { mail: randomBytes(32) });
  const passwords = new ArgonPasswords(2, 8);
  const dummy = await passwords.hash("dummy fixture credential");
  const makeIdentity = (database: PostgresDatabase) =>
    new IdentityService(
      new PostgresIdentityRepository(database),
      database,
      passwords,
      jwt,
      codec,
      dummy,
      new PostgresSecurity(database, rateKey),
      new PostgresIdempotency(database),
      new PostgresIdentityQuery(database),
      new PostgresAuthenticatedWriteAdmission(database),
    );
  identity = makeIdentity(db);
  const makeCatalog = (database: PostgresDatabase, access: IdentityService) =>
    new CatalogService(
      access,
      new PostgresCatalogRepository(database),
      new PostgresCatalogQuery(database),
      new PostgresIdempotency(database),
      new PostgresSecurity(database, rateKey),
      database,
      new HmacCatalogCursor(csrfKey),
    );
  catalog = makeCatalog(db, identity);
  const makeAssessment = (database: PostgresDatabase, catalogService: CatalogService) =>
    new AssessmentService(
      makeIdentity(database),
      catalogService,
      new PostgresAttemptRepository(database),
      new PostgresAttemptQuery(database),
      new PostgresIdempotency(database),
      new PostgresSubmissionOutbox(database),
      database,
      new HmacAssessmentCursor(csrfKey),
      new HttpQuestionPageSizer(),
    );
  assessment = makeAssessment(db, catalog);
  assessment2 = makeAssessment(db2, makeCatalog(db2, makeIdentity(db2)));
  const account = await registerAccount();
  await identity.confirm(account.token, finalPassword);
  await ops.query(
    "SELECT identity.operator_admin($1, 'assessment-test', 'assessment local admin', $2, true, true)",
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
  foreignUser = await activated();
  httpUser = await activated();
  metricUser = await activated();
});

afterAll(async () => {
  await unblockOutbox().catch(() => undefined);
  await db?.close();
  await db2?.close();
  await graderDb?.close();
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
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${operator}, ${graderRole}`);
  await admin.end();
});

describe("Assessment durability on restricted PostgreSQL", () => {
  it("starts once across concurrent keys and counts every terminal attempt", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "quota", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }], 1);
    const key = uuidv7();
    const created = await assessment.start(candidateUser.raw, key, exam.examId);
    expect(created.httpStatus).toBe(201);
    expect(created.replayed).toBe(false);
    expect(created.body.revision).toBe(1);
    expect(created.body.status).toBe("IN_PROGRESS");
    expect(created.body.canSave).toBe(true);
    expect(created.body.startedAt).toMatch(instant);
    expect(created.body.deadline).toMatch(instant);
    expect(created.body.serverNow).toMatch(instant);
    expect(Date.parse(created.body.deadline) - Date.parse(created.body.startedAt)).toBe(90_000);
    const replay = await assessment.start(candidateUser.raw, key, exam.examId);
    expect(replay).toEqual({ ...created, replayed: true });
    const again = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    expect(again.body.id).toBe(created.body.id);
    expect(again.body.startedAt).toBe(created.body.startedAt);
    expect(again.body.deadline).toBe(created.body.deadline);
    expect(again.replayed).toBe(false);
    const resumed = await assessment2.resume(candidateUser.id, created.body.id);
    expect(resumed.id).toBe(created.body.id);
    expect(resumed.publishedVersionId).toBe(created.body.publishedVersionId);
    expect(resumed.revision).toBe(1);
    await fixture.query(
      `
      UPDATE assessment.attempts
      SET
        deadline = started_at + interval '1 millisecond'
      WHERE
        id = $1
      `,
      [created.body.id],
    );
    const expired = await assessment.submit(
      candidateUser.raw,
      uuidv7(),
      created.body.id,
      randomUUID(),
    );
    expect(expired.httpStatus).toBe(202);
    expect(expired.body).toMatchObject({ acceptanceState: "EXPIRED", expired: true });
    await expect(assessment.start(candidateUser.raw, uuidv7(), exam.examId)).rejects.toThrow(
      "Attempt limit reached",
    );
    const republished = await catalog.publish(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      exam.revision,
      randomUUID(),
    );
    await expect(assessment.start(candidateUser.raw, uuidv7(), exam.examId)).rejects.toThrow(
      "Attempt limit reached",
    );
    expect(republished.body.revision).toBe(exam.revision + 1);
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.attempts WHERE exam_id = $1", [
        exam.examId,
      ]),
    ).toBe(1);

    const failedExam = await publishExam([{ bankQuestionId: questionId }], 1);
    const failedStart = await assessment.start(candidateUser.raw, uuidv7(), failedExam.examId);
    await fixture.query(
      `
      UPDATE assessment.attempts
      SET
        status = 'FAILED',
        submitted_at = started_at,
        submission_id = gen_random_uuid(),
        submission_event_id = gen_random_uuid(),
        expired = false,
        replay_pending = true,
        submission_kind = 'MANUAL'
      WHERE
        id = $1
      `,
      [failedStart.body.id],
    );
    await expect(assessment.start(candidateUser.raw, uuidv7(), failedExam.examId)).rejects.toThrow(
      "Attempt limit reached",
    );

    const raced = await publishExam([{ bankQuestionId: questionId }], 2);
    const racedKey = uuidv7();
    const sameKey = await Promise.all([
      assessment.start(candidateUser.raw, racedKey, raced.examId),
      assessment.start(candidateUser.raw, racedKey, raced.examId),
    ]);
    const firstRace = sameKey[0];
    const secondRace = sameKey[1];
    if (!firstRace || !secondRace) throw new Error("Concurrent start missing");
    expect(firstRace.body.id).toBe(secondRace.body.id);
    expect(sameKey.filter((item) => item.replayed)).toHaveLength(1);
    const distinct = await publishExam([{ bankQuestionId: questionId }], 2);
    const pair = await Promise.all([
      assessment.start(candidateUser.raw, uuidv7(), distinct.examId),
      assessment.start(candidateUser.raw, uuidv7(), distinct.examId),
    ]);
    const left = pair[0];
    const right = pair[1];
    if (!left || !right) throw new Error("Distinct start missing");
    expect(left.body.id).toBe(right.body.id);
    expect(left.body.deadline).toBe(right.body.deadline);
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.attempts WHERE exam_id = $1", [
        distinct.examId,
      ]),
    ).toBe(1);

    const before = await scalar("SELECT count(*)::int AS n FROM assessment.attempts");
    const receipts = await scalar("SELECT count(*)::int AS n FROM platform.idempotency_receipts");
    await expect(
      assessment.start(candidateUser.raw, uuidv7(Date.now() - 90_000_000), distinct.examId),
    ).rejects.toThrow("Idempotency key expired");
    await expect(
      assessment.start(candidateUser.raw, uuidv7(Date.now() + 600_000), distinct.examId),
    ).rejects.toThrow("Invalid request");
    expect(await scalar("SELECT count(*)::int AS n FROM assessment.attempts")).toBe(before);
    expect(await scalar("SELECT count(*)::int AS n FROM platform.idempotency_receipts")).toBe(
      receipts,
    );
  });

  it("observes publication locks and keeps an active attempt after unpublish", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "race", 2, [1]));
    const blocked = await publishExam([{ bankQuestionId: questionId }]);
    const held = await fixture.connect();
    let pendingStart: Promise<unknown> = Promise.resolve();
    let waiting = false;
    try {
      await held.query("BEGIN");
      await held.query("SELECT id FROM catalog.exams WHERE id = $1 FOR UPDATE", [blocked.examId]);
      pendingStart = assessment.start(candidateUser.raw, uuidv7(), blocked.examId);
      waiting = await seenLock();
      await held.query("UPDATE catalog.exams SET published = false WHERE id = $1", [
        blocked.examId,
      ]);
      await held.query("COMMIT");
    } finally {
      await held.query("ROLLBACK").catch(() => undefined);
      held.release();
    }
    expect(waiting).toBe(true);
    await expect(pendingStart).rejects.toThrow("Exam is not published");
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.attempts WHERE exam_id = $1", [
        blocked.examId,
      ]),
    ).toBe(0);

    const shared = await publishExam([{ bankQuestionId: questionId }]);
    const share = await fixture.connect();
    let pendingUnpublish: Promise<unknown> = Promise.resolve();
    let shareWaiting = false;
    try {
      await share.query("BEGIN");
      await share.query("SELECT id FROM catalog.exams WHERE id = $1 FOR SHARE", [shared.examId]);
      pendingUnpublish = catalog.unpublish(
        adminUser.raw,
        uuidv7(),
        shared.examId,
        shared.revision,
        randomUUID(),
      );
      shareWaiting = await seenLock();
      await share.query("COMMIT");
    } finally {
      await share.query("ROLLBACK").catch(() => undefined);
      share.release();
    }
    expect(shareWaiting).toBe(true);
    await expect(pendingUnpublish).resolves.toMatchObject({
      body: { revision: shared.revision + 1 },
    });

    const kept = await publishExam([{ bankQuestionId: questionId }]);
    const active = await assessment.start(candidateUser.raw, uuidv7(), kept.examId);
    await catalog.unpublish(adminUser.raw, uuidv7(), kept.examId, kept.revision, randomUUID());
    const returned = await assessment.start(candidateUser.raw, uuidv7(), kept.examId);
    expect(returned.body.id).toBe(active.body.id);
    expect(returned.body.startedAt).toBe(active.body.startedAt);
    expect(returned.body.deadline).toBe(active.body.deadline);
    expect(returned.body.publishedVersionId).toBe(active.body.publishedVersionId);

    const closed = await publishExam([{ bankQuestionId: questionId }]);
    await fixture.query(
      `
      UPDATE catalog.published_versions
      SET
        closes_at = clock_timestamp() - interval '1 second'
      WHERE
        id = (
          SELECT
            current_version_id
          FROM
            catalog.exams
          WHERE
            id = $1
        )
      `,
      [closed.examId],
    );
    await expect(assessment.start(candidateUser.raw, uuidv7(), closed.examId)).rejects.toThrow(
      "Exam is closed",
    );
    const scheduled = await publishExam([{ bankQuestionId: questionId }]);
    await fixture.query(
      `
      UPDATE catalog.published_versions
      SET
        opens_at = clock_timestamp() + interval '1 hour',
        closes_at = clock_timestamp() + interval '2 hours'
      WHERE
        id = (
          SELECT
            current_version_id
          FROM
            catalog.exams
          WHERE
            id = $1
        )
      `,
      [scheduled.examId],
    );
    await expect(assessment.start(candidateUser.raw, uuidv7(), scheduled.examId)).rejects.toThrow(
      "Exam is not open",
    );
  });

  it("freezes the started version across bank edits, republish and archive", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "TOKEN_V1", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }]);
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const page = await assessment.questions(candidateUser.id, started.body.id, 20, null);
    expect(page.items.map((item) => item.prompt)).toEqual(["TOKEN_V1"]);
    expect(JSON.stringify(page)).not.toContain(explanationToken);
    expect(page.items[0]?.points).toBe(5);
    await catalog.unpublish(adminUser.raw, uuidv7(), exam.examId, exam.revision, randomUUID());
    await catalog.replaceQuestion(
      adminUser.raw,
      uuidv7(),
      questionId,
      { ...choiceDraft("SINGLE_CHOICE", "TOKEN_V2", 2, [1]), expectedRevision: 1 },
      randomUUID(),
    );
    const republished = await catalog.publish(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      exam.revision + 1,
      randomUUID(),
    );
    const resumed = await assessment.resume(candidateUser.id, started.body.id);
    expect(resumed.publishedVersionId).toBe(started.body.publishedVersionId);
    const frozen = await assessment.questions(candidateUser.id, started.body.id, 20, null);
    expect(frozen.items.map((item) => item.prompt)).toEqual(["TOKEN_V1"]);
    expect(JSON.stringify(frozen)).not.toContain("TOKEN_V2");
    await catalog.archiveExam(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      republished.body.revision,
      randomUUID(),
    );
    const still = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    expect(still.body.id).toBe(started.body.id);
    expect(still.body.deadline).toBe(started.body.deadline);
    await expect(assessment.start(foreignUser.raw, uuidv7(), exam.examId)).rejects.toThrow(
      "Exam is archived",
    );
    await expect(assessment.resume(foreignUser.id, started.body.id)).rejects.toThrow("Not found");
  });

  it("saves a batch atomically, replays the receipt, and rejects stale or invalid selections", async () => {
    const single = await bankQuestion(choiceDraft("SINGLE_CHOICE", "single", 2, [1]));
    const multiple = await bankQuestion(choiceDraft("MULTIPLE_CHOICE", "multiple", 3, [1, 2]));
    const trueFalse = await bankQuestion(choiceDraft("TRUE_FALSE", "true false", 2, [1]));
    const exam = await publishExam([
      { bankQuestionId: single },
      { bankQuestionId: multiple },
      { bankQuestionId: trueFalse },
    ]);
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const page = await assessment.questions(candidateUser.id, started.body.id, 20, null);
    const [first, second, third] = page.items;
    if (!first || !second || !third) throw new Error("Frozen questions missing");
    expect(first.type).toBe("SINGLE_CHOICE");
    expect(second.type).toBe("MULTIPLE_CHOICE");
    expect(third.type).toBe("TRUE_FALSE");
    const option = (question: (typeof page.items)[number], position: number) => {
      const found = question.options.find((item) => item.position === position);
      if (!found) throw new Error("Option missing");
      return found.id;
    };
    const key = uuidv7();
    const saved = await assessment.save(candidateUser.raw, key, started.body.id, [
      {
        questionId: first.id,
        selectedOptionIds: [option(first, 1)],
        marked: false,
        expectedVersion: 0,
      },
    ]);
    expect(saved.httpStatus).toBe(200);
    expect(saved.body.answers).toEqual([{ questionId: first.id, version: 1 }]);
    expect(JSON.stringify(saved.body)).not.toContain(explanationToken);
    expect(JSON.stringify(saved.body)).not.toContain("Option 1");
    const replay = await assessment.save(candidateUser.raw, key, started.body.id, [
      {
        questionId: first.id,
        selectedOptionIds: [option(first, 1)],
        marked: false,
        expectedVersion: 0,
      },
    ]);
    expect(replay).toEqual({ ...saved, replayed: true });
    expect(
      await scalar(
        "SELECT count(*)::int AS n FROM assessment.answers WHERE attempt_id = $1 AND question_id = $2",
        [started.body.id, first.id],
      ),
    ).toBe(1);
    const repeated = await assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
      {
        questionId: first.id,
        selectedOptionIds: [option(first, 1)],
        marked: false,
        expectedVersion: 1,
      },
    ]);
    expect(repeated.body.answers[0]?.version).toBe(2);
    const cleared = await assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
      { questionId: first.id, selectedOptionIds: [], marked: true, expectedVersion: 2 },
    ]);
    expect(cleared.body.answers[0]?.version).toBe(3);
    const marked = await assessment.answers(candidateUser.id, started.body.id, 20, null);
    expect(marked.items).toEqual([
      expect.objectContaining({
        questionId: first.id,
        selectedOptionIds: [],
        marked: true,
        version: 3,
      }),
    ]);
    expect(marked.items[0]?.updatedAt).toMatch(instant);
    const forwardKey = uuidv7();
    const forward = [
      {
        questionId: second.id,
        selectedOptionIds: [option(second, 2), option(second, 1)],
        marked: false,
        expectedVersion: 0,
      },
      {
        questionId: third.id,
        selectedOptionIds: [option(third, 1)],
        marked: true,
        expectedVersion: 0,
      },
    ];
    await assessment.save(candidateUser.raw, forwardKey, started.body.id, forward);
    await expect(
      assessment.save(candidateUser.raw, forwardKey, started.body.id, [...forward].reverse()),
    ).rejects.toThrow("Idempotency key conflict");
    await assessment.save(
      candidateUser.raw,
      uuidv7(),
      started.body.id,
      [...forward].reverse().map((item) => ({
        ...item,
        expectedVersion: 1,
      })),
    );
    const ordered = await assessment.answers(candidateUser.id, started.body.id, 1, null);
    expect(ordered.items.map((item) => item.questionId)).toEqual([first.id]);
    expect(ordered.metadata.next).toBeTruthy();
    const next = await assessment.answers(
      candidateUser.id,
      started.body.id,
      1,
      ordered.metadata.next,
    );
    expect(next.items.map((item) => item.questionId)).toEqual([second.id]);
    expect(next.items[0]?.selectedOptionIds).toEqual([option(second, 1), option(second, 2)]);
    const revision = await scalar("SELECT revision AS n FROM assessment.attempts WHERE id = $1", [
      started.body.id,
    ]);
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: first.id,
          selectedOptionIds: [],
          marked: true,
          expectedVersion: 0,
        },
        {
          questionId: second.id,
          selectedOptionIds: [option(second, 1)],
          marked: false,
          expectedVersion: 2,
        },
      ]),
    ).rejects.toThrow("Revision conflict");
    expect(
      await scalar("SELECT revision AS n FROM assessment.attempts WHERE id = $1", [
        started.body.id,
      ]),
    ).toBe(revision);
    expect(
      await scalar(
        "SELECT version AS n FROM assessment.answers WHERE attempt_id = $1 AND question_id = $2",
        [started.body.id, second.id],
      ),
    ).toBe(2);
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: first.id,
          selectedOptionIds: [option(first, 1), option(first, 2)],
          marked: false,
          expectedVersion: 3,
        },
      ]),
    ).rejects.toThrow("Invalid request");
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: third.id,
          selectedOptionIds: [option(third, 1), option(third, 2)],
          marked: false,
          expectedVersion: 2,
        },
      ]),
    ).rejects.toThrow("Invalid request");
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: second.id,
          selectedOptionIds: [randomUUID()],
          marked: false,
          expectedVersion: 2,
        },
      ]),
    ).rejects.toThrow("Invalid request");
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: first.id,
          selectedOptionIds: [],
          marked: true,
          expectedVersion: 3,
        },
        {
          questionId: first.id,
          selectedOptionIds: [],
          marked: false,
          expectedVersion: 3,
        },
      ]),
    ).rejects.toThrow("Invalid request");
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.results WHERE attempt_id = $1", [
        started.body.id,
      ]),
    ).toBe(0);
    await expect(
      assessment.save(foreignUser.raw, uuidv7(), started.body.id, [
        {
          questionId: first.id,
          selectedOptionIds: [],
          marked: true,
          expectedVersion: 3,
        },
      ]),
    ).rejects.toThrow("Not found");

    const batchIds = await importBank(Array.from({ length: 20 }, (_, index) => `batch ${index}`));
    const batchExam = await publishExam(batchIds.map((bankQuestionId) => ({ bankQuestionId })));
    const batchAttempt = await assessment.start(candidateUser.raw, uuidv7(), batchExam.examId);
    const batchPage = await assessment.questions(candidateUser.id, batchAttempt.body.id, 100, null);
    expect(batchPage.items).toHaveLength(20);
    const batch = await assessment.save(
      candidateUser.raw,
      uuidv7(),
      batchAttempt.body.id,
      batchPage.items.map((item) => ({
        questionId: item.id,
        selectedOptionIds: [item.options[0]!.id],
        marked: false,
        expectedVersion: 0,
      })),
    );
    expect(batch.body.answers).toHaveLength(20);
    expect(new Set(batch.body.answers.map((item) => item.version))).toEqual(new Set([1]));
  });

  it("submits once, keeps the acceptance for every later key, and rolls back a failed outbox insert", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "submit", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }]);
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const page = await assessment.questions(candidateUser.id, started.body.id, 20, null);
    const question = page.items[0];
    if (!question?.options[0]) throw new Error("Submit question missing");
    const saveKey = uuidv7();
    const saved = await assessment.save(candidateUser.raw, saveKey, started.body.id, [
      {
        questionId: question.id,
        selectedOptionIds: [question.options[0].id],
        marked: false,
        expectedVersion: 0,
      },
    ]);
    const submitKey = uuidv7();
    const submitted = await assessment.submit(
      candidateUser.raw,
      submitKey,
      started.body.id,
      randomUUID(),
    );
    expect(submitted.httpStatus).toBe(202);
    expect(submitted.body.acceptanceState).toBe("SUBMITTED");
    expect(submitted.body.expired).toBe(false);
    expect(submitted.body.acceptedAt).toMatch(instant);
    const replay = await assessment.submit(
      candidateUser.raw,
      submitKey,
      started.body.id,
      randomUUID(),
    );
    expect(replay).toEqual({ ...submitted, replayed: true });
    const otherKey = uuidv7();
    const other = await assessment.submit(
      candidateUser.raw,
      otherKey,
      started.body.id,
      randomUUID(),
    );
    expect(other.replayed).toBe(false);
    expect(other.body).toEqual(submitted.body);
    const otherAgain = await assessment.submit(
      candidateUser.raw,
      otherKey,
      started.body.id,
      randomUUID(),
    );
    expect(otherAgain.body).toEqual(submitted.body);
    expect(
      await scalar("SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1", [
        started.body.id,
      ]),
    ).toBe(1);
    expect(
      await scalar(
        "SELECT count(*)::int AS n FROM platform.idempotency_receipts WHERE actor_id = $1 AND key = $2",
        [candidateUser.id, otherKey],
      ),
    ).toBe(0);
    const payload = await text(
      "SELECT payload::text AS value FROM platform.outbox WHERE aggregate_id = $1",
      [started.body.id],
    );
    expect(payload).not.toContain(explanationToken);
    expect(payload).not.toContain("selectedOptionIds");
    expect(payload).not.toContain(question.options[0].id);
    const event = JSON.parse(payload) as {
      eventType: string;
      aggregateId: string;
      payload: { submissionKind: string; expired: boolean; submissionId: string };
    };
    expect(event.eventType).toBe("attempt.submitted.v1");
    expect(event.aggregateId).toBe(started.body.id);
    expect(event.payload.submissionKind).toBe("MANUAL");
    expect(event.payload.submissionId).toBe(submitted.body.submissionId);
    const status = await assessment.resume(candidateUser.id, started.body.id);
    expect(status).toMatchObject({
      status: "SUBMITTED",
      expired: false,
      canSave: false,
      resultAvailable: false,
      pollAfterSeconds: 2,
      replayPending: false,
      submittedAt: submitted.body.acceptedAt,
    });
    const oldSave = await assessment.save(candidateUser.raw, saveKey, started.body.id, [
      {
        questionId: question.id,
        selectedOptionIds: [question.options[0].id],
        marked: false,
        expectedVersion: 0,
      },
    ]);
    expect(oldSave).toEqual({ ...saved, replayed: true });
    await expect(
      assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: question.id,
          selectedOptionIds: [],
          marked: true,
          expectedVersion: 1,
        },
      ]),
    ).rejects.toThrow("Attempt is closed");
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.results WHERE attempt_id = $1", [
        started.body.id,
      ]),
    ).toBe(0);

    const failing = await assessment.start(
      candidateUser.raw,
      uuidv7(),
      (await publishExam([{ bankQuestionId: questionId }])).examId,
    );
    await blockOutbox();
    try {
      await expect(
        assessment.submit(candidateUser.raw, uuidv7(), failing.body.id, randomUUID()),
      ).rejects.toThrow("Database operation failed");
    } finally {
      await unblockOutbox();
    }
    expect(
      await text("SELECT status AS value FROM assessment.attempts WHERE id = $1", [
        failing.body.id,
      ]),
    ).toBe("IN_PROGRESS");
    expect(
      await scalar("SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1", [
        failing.body.id,
      ]),
    ).toBe(0);
    expect(
      await scalar(
        "SELECT count(*)::int AS n FROM platform.idempotency_receipts WHERE resource_id = $1 AND operation = 'assessment.attempt.submit'",
        [failing.body.id],
      ),
    ).toBe(0);
    const recovered = await assessment.submit(
      candidateUser.raw,
      uuidv7(),
      failing.body.id,
      randomUUID(),
    );
    expect(recovered.body.acceptanceState).toBe("SUBMITTED");
    expect(
      await scalar("SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1", [
        failing.body.id,
      ]),
    ).toBe(1);
  });

  it("reads the clock after an observed attempt lock when the deadline moves", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "deadline", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }]);
    const started = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const page = await assessment.questions(candidateUser.id, started.body.id, 20, null);
    const question = page.items[0];
    if (!question?.options[0]) throw new Error("Deadline question missing");
    const held = await fixture.connect();
    let pendingSave: Promise<unknown> = Promise.resolve();
    let waiting = false;
    try {
      await held.query("BEGIN");
      await held.query("SELECT id FROM assessment.attempts WHERE id = $1 FOR UPDATE", [
        started.body.id,
      ]);
      pendingSave = assessment.save(candidateUser.raw, uuidv7(), started.body.id, [
        {
          questionId: question.id,
          selectedOptionIds: [question.options[0].id],
          marked: false,
          expectedVersion: 0,
        },
      ]);
      waiting = await seenLock();
      await held.query(
        `
        UPDATE assessment.attempts
        SET
          deadline = started_at + interval '1 millisecond'
        WHERE
          id = $1
        `,
        [started.body.id],
      );
      await held.query("COMMIT");
    } finally {
      await held.query("ROLLBACK").catch(() => undefined);
      held.release();
    }
    expect(waiting).toBe(true);
    await expect(pendingSave).rejects.toThrow("Attempt is closed");
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.answers WHERE attempt_id = $1", [
        started.body.id,
      ]),
    ).toBe(0);

    const submitExam = await publishExam([{ bankQuestionId: questionId }]);
    const submitStart = await assessment.start(candidateUser.raw, uuidv7(), submitExam.examId);
    const submitHold = await fixture.connect();
    let pendingSubmit: Promise<Awaited<ReturnType<AssessmentService["submit"]>>> | undefined;
    let submitWaiting = false;
    try {
      await submitHold.query("BEGIN");
      await submitHold.query("SELECT id FROM assessment.attempts WHERE id = $1 FOR UPDATE", [
        submitStart.body.id,
      ]);
      pendingSubmit = assessment.submit(
        candidateUser.raw,
        uuidv7(),
        submitStart.body.id,
        randomUUID(),
      );
      submitWaiting = await seenLock();
      await submitHold.query(
        `
        UPDATE assessment.attempts
        SET
          deadline = started_at + interval '1 millisecond'
        WHERE
          id = $1
        `,
        [submitStart.body.id],
      );
      await submitHold.query("COMMIT");
    } finally {
      await submitHold.query("ROLLBACK").catch(() => undefined);
      submitHold.release();
    }
    expect(submitWaiting).toBe(true);
    if (!pendingSubmit) throw new Error("Pending deadline submission missing");
    const expired = await pendingSubmit;
    expect(expired.body).toMatchObject({ acceptanceState: "EXPIRED", expired: true });
    const stored = await text(
      "SELECT payload::text AS value FROM platform.outbox WHERE aggregate_id = $1",
      [submitStart.body.id],
    );
    expect(JSON.parse(stored).payload.expired).toBe(true);
  });

  it("rejects a revoked family after the request is observed waiting on the account lock", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "revoke", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }]);
    const victim = await activated();
    const held = await fixture.connect();
    let pending: Promise<unknown> = Promise.resolve();
    let waiting = false;
    try {
      await held.query("BEGIN");
      await held.query("SELECT id FROM identity.users WHERE id = $1 FOR UPDATE", [victim.id]);
      pending = assessment.start(victim.raw, uuidv7(), exam.examId);
      waiting = await seenLock();
      await held.query(
        `
        UPDATE identity.session_families
        SET
          revoked_at = clock_timestamp()
        WHERE
          user_id = $1
          AND revoked_at IS NULL
        `,
        [victim.id],
      );
      await held.query("COMMIT");
    } finally {
      await held.query("ROLLBACK").catch(() => undefined);
      held.release();
    }
    expect(waiting).toBe(true);
    await expect(pending).rejects.toThrow("Unauthenticated");
    expect(
      await scalar("SELECT count(*)::int AS n FROM assessment.attempts WHERE exam_id = $1", [
        exam.examId,
      ]),
    ).toBe(0);
  });

  it("cuts a question page on the byte cap without skipping the next item", async () => {
    const ids = await importBank(Array.from({ length: 11 }, () => "漢".repeat(8000)));
    const exam = await publishExam(ids.map((bankQuestionId) => ({ bankQuestionId })));
    const started = await assessment.start(foreignUser.raw, uuidv7(), exam.examId);
    const oracle = (
      await fixture.query<{ id: string }>(
        `
        SELECT
          q.id
        FROM
          catalog.published_questions q
          JOIN catalog.published_sections s
            ON s.version_id = q.version_id
            AND s.id = q.section_id
        WHERE
          q.version_id = $1
        ORDER BY
          s.position,
          q.position,
          q.id
        `,
        [started.body.publishedVersionId],
      )
    ).rows.map((row) => row.id);
    const seen: string[] = [];
    let cursor: string | null = null;
    let firstLength = 0;
    for (let page = 0; page < 5; page += 1) {
      const result = await assessment.questions(foreignUser.id, started.body.id, 20, cursor);
      if (page === 0) firstLength = result.items.length;
      expect(JSON.stringify(result)).not.toContain(explanationToken);
      expect(result.items.some((item) => item.prompt.includes("漢"))).toBe(true);
      seen.push(...result.items.map((item) => item.id));
      cursor = result.metadata.next;
      if (!cursor) break;
    }
    expect(firstLength).toBeGreaterThan(0);
    expect(firstLength).toBeLessThan(oracle.length);
    expect(seen).toEqual(oracle);
  });

  it("matches the declared HTTP envelopes and redacts a failed submission", async () => {
    const questionId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "漢😀", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: questionId }]);
    const redactionExam = await publishExam([{ bankQuestionId: questionId }]);
    await withHttp(async (http) => {
      const session = await openSession(http, httpUser.email);
      const write = (key = uuidv7()) => ({
        origin: session.origin,
        cookie: session.cookie,
        "x-csrf-token": session["x-csrf-token"],
        "idempotency-key": key,
      });
      const missingOrigin = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: {
          cookie: session.cookie,
          "x-csrf-token": session["x-csrf-token"],
          "idempotency-key": uuidv7(),
        },
      });
      expect(missingOrigin.statusCode).toBe(403);
      expect(missingOrigin.json()).toEqual({
        data: null,
        errorCode: "Permission denied",
        message: "Permission denied",
        status: false,
      });
      noStore(missingOrigin);
      const anonymous = await http.inject({ method: "GET", url: "/v1/auth/csrf" });
      const anonCookie = anonymous.cookies.find((item) => item.name === "__Host-csrf");
      const anonBody = anonymous.json() as { data: { csrfToken: string } };
      if (!anonCookie) throw new Error("Anonymous CSRF missing");
      const noAccess = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: {
          origin,
          cookie: `__Host-csrf=${anonCookie.value}`,
          "x-csrf-token": anonBody.data.csrfToken,
          "idempotency-key": uuidv7(),
        },
      });
      expect(noAccess.statusCode).toBe(401);
      expect(noAccess.json()).toMatchObject({ errorCode: "Unauthenticated", status: false });

      const started = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: write(),
      });
      expect(started.statusCode).toBe(201);
      noStore(started);
      expect(started.headers["idempotency-replayed"]).toBeUndefined();
      assertSchema(validateAttempt, started.json());
      const attemptId = (started.json() as { data: { id: string } }).data.id;
      const replayKey = uuidv7();
      const first = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: write(replayKey),
      });
      const replayed = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: write(replayKey),
      });
      expect(replayed.statusCode).toBe(201);
      expect(replayed.headers["idempotency-replayed"]).toBe("true");
      expect(replayed.json()).toEqual(first.json());

      const questions = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}/questions?pageSize=20`,
        headers: { cookie: session.cookie },
      });
      expect(questions.statusCode).toBe(200);
      noStore(questions);
      assertSchema(validateQuestions, questions.json());
      const questionBody = questions.json() as {
        data: { id: string; prompt: string; options: { id: string }[] }[];
      };
      expect(JSON.stringify(questionBody)).toContain("漢");
      expect(JSON.stringify(questionBody)).toContain("😀");
      expect(JSON.stringify(questionBody)).not.toContain(explanationToken);
      const question = questionBody.data[0];
      if (!question?.options[0]) throw new Error("HTTP question missing");
      expect(
        (
          await http.inject({
            method: "GET",
            url: `/v1/attempts/${attemptId}/questions?pageSize=0`,
            headers: { cookie: session.cookie },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await http.inject({
            method: "GET",
            url: `/v1/attempts/${attemptId}/questions?pageSize=101`,
            headers: { cookie: session.cookie },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await http.inject({
            method: "GET",
            url: `/v1/attempts/${attemptId}/questions?cursor=not-a-cursor`,
            headers: { cookie: session.cookie },
          })
        ).statusCode,
      ).toBe(400);

      const saveKey = uuidv7();
      const savePayload = {
        answers: [
          {
            questionId: question.id,
            selectedOptionIds: [question.options[0].id],
            marked: false,
            expectedVersion: 0,
          },
        ],
      };
      const saved = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attemptId}/answers`,
        headers: write(saveKey),
        payload: savePayload,
      });
      expect(saved.statusCode).toBe(200);
      noStore(saved);
      assertSchema(validateSave, saved.json());
      const saveReplay = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attemptId}/answers`,
        headers: write(saveKey),
        payload: savePayload,
      });
      expect(saveReplay.headers["idempotency-replayed"]).toBe("true");
      expect(saveReplay.json()).toEqual(saved.json());
      const tooMany = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attemptId}/answers`,
        headers: write(),
        payload: {
          answers: Array.from({ length: 21 }, () => ({
            questionId: question.id,
            selectedOptionIds: [] as string[],
            marked: false,
            expectedVersion: 1,
          })),
        },
      });
      expect(tooMany.statusCode).toBe(400);
      expect(tooMany.json()).toMatchObject({ errorCode: "Invalid request", status: false });
      const oversized = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attemptId}/answers`,
        headers: { ...write(), "content-type": "application/json" },
        payload: JSON.stringify({ pad: "x".repeat(20_000) }),
      });
      expect(oversized.statusCode).toBe(400);
      const answers = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}/answers`,
        headers: { cookie: session.cookie },
      });
      expect(answers.statusCode).toBe(200);
      assertSchema(validateAnswers, answers.json());

      const submitKey = uuidv7();
      const submitted = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attemptId}/submit`,
        headers: write(submitKey),
        payload: {},
      });
      expect(submitted.statusCode).toBe(202);
      expect(submitted.headers["retry-after"]).toBe("2");
      noStore(submitted);
      assertSchema(validateSubmit, submitted.json());
      const submitReplay = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attemptId}/submit`,
        headers: write(submitKey),
        payload: {},
      });
      expect(submitReplay.statusCode).toBe(202);
      expect(submitReplay.headers["idempotency-replayed"]).toBe("true");
      expect(submitReplay.headers["retry-after"]).toBe("2");
      expect(submitReplay.json()).toEqual(submitted.json());
      const rejectedBody = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attemptId}/submit`,
        headers: write(),
        payload: { answers: [] },
      });
      expect(rejectedBody.statusCode).toBe(400);
      const status = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}/status`,
        headers: { cookie: session.cookie },
      });
      expect(status.statusCode).toBe(200);
      assertSchema(validateAttempt, status.json());
      expect((status.json() as { data: { status: string } }).data.status).toBe("SUBMITTED");

      const redactedStart = await http.inject({
        method: "POST",
        url: `/v1/exams/${redactionExam.examId}/attempts`,
        headers: write(),
      });
      expect(redactedStart.statusCode).toBe(201);
      const redactedId = (redactedStart.json() as { data: { id: string } }).data.id;
      await blockOutbox();
      const logged: string[] = [];
      const originalWrite = process.stderr.write.bind(process.stderr);
      process.stderr.write = ((chunk: string | Uint8Array) => {
        logged.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      }) as typeof process.stderr.write;
      try {
        const failed = await http.inject({
          method: "POST",
          url: `/v1/attempts/${redactedId}/submit`,
          headers: write(),
          payload: {},
        });
        expect(failed.statusCode).toBe(503);
        expect(failed.json()).toEqual({
          data: null,
          errorCode: "Service unavailable",
          message: "Service unavailable",
          status: false,
        });
        expect(JSON.stringify(failed.json())).not.toContain(explanationToken);
        expect(logged.join("")).not.toContain(explanationToken);
        expect(logged.join("")).not.toContain("SELECT");
        expect(logged.join("")).not.toContain(question.options[0].id);
      } finally {
        process.stderr.write = originalWrite;
        await unblockOutbox();
      }
      expect(
        await text("SELECT status AS value FROM assessment.attempts WHERE id = $1", [redactedId]),
      ).toBe("IN_PROGRESS");

      const foreign = await openSession(http, foreignUser.email);
      const hidden = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}`,
        headers: { cookie: foreign.cookie },
      });
      expect(hidden.statusCode).toBe(404);
      expect(hidden.json()).toEqual({
        data: null,
        errorCode: "Not found",
        message: "Not found",
        status: false,
      });
      noStore(hidden);
      const admin = await openSession(http, adminUser.email);
      const denied = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: {
          origin: admin.origin,
          cookie: admin.cookie,
          "x-csrf-token": admin["x-csrf-token"],
          "idempotency-key": uuidv7(),
        },
      });
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({ errorCode: "Permission denied" });
      await identity.logout(session.refresh);
      const revoked = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}/status`,
        headers: { cookie: session.cookie },
      });
      expect(revoked.statusCode).toBe(401);
      expect(revoked.json()).toMatchObject({ errorCode: "Unauthenticated", status: false });
    });
  });

  it("records auth-inclusive adapter diagnostics without calling them capacity", async () => {
    const sampleCount = diagnosticSampleCount();
    const bankIds = await importBank(
      Array.from({ length: 100 }, (_, index) => `Diagnostic question ${index + 1}`),
    );
    const exam = await publishExam(bankIds.map((bankQuestionId) => ({ bankQuestionId })));
    // Actors and sessions are fixture setup, outside measured HTTP operations.
    const actors: Actor[] = [];
    for (let index = 0; index < sampleCount; index += 1) actors.push(await activated());
    const durations: Record<string, number[]> = {
      start: [],
      questions: [],
      answers: [],
      save: [],
      submit: [],
      status: [],
    };
    const counts: Record<string, Tally> = {};
    const requests: Record<string, DiagnosticRequest[]> = {};
    const captured = new Map<
      string,
      { label: string; operation: DatabaseOperation; sql: string; parameters: unknown[] }
    >();
    const original = db.query.bind(db);
    let label = "";
    db.query = <T extends QueryResultRow>(
      operation: DatabaseOperation,
      sql: string,
      parameters: unknown[] = [],
    ) => {
      const textSql = sql.trim();
      if (label && textSql !== "BEGIN" && textSql !== "COMMIT" && textSql !== "ROLLBACK") {
        const sha256 = createHash("sha256").update(sql).digest("hex");
        const id = `${label}:${operation}:${sha256}`;
        if (!captured.has(id)) captured.set(id, { label, operation, sql, parameters });
      }
      return original<T>(operation, sql, parameters);
    };
    try {
      await withHttp(async (http) => {
        const sessions: LiveSession[] = [];
        for (const actor of actors) sessions.push(await openSession(http, actor.email));
        const measure = async (
          operation: string,
          run: () => Promise<import("fastify").LightMyRequestResponse>,
        ) => {
          label = operation;
          const mark = observations.length;
          const cpu = process.cpuUsage();
          const rssBeforeBytes = process.memoryUsage().rss;
          const clock = performance.now();
          const response = await run();
          const durationMs = performance.now() - clock;
          const cpuDelta = process.cpuUsage(cpu);
          const sample = observations.slice(mark);
          const request = {
            durationMs,
            cpuUserMicros: cpuDelta.user,
            cpuSystemMicros: cpuDelta.system,
            rssBeforeBytes,
            rssAfterBytes: process.memoryUsage().rss,
            payloadBytes: Buffer.byteLength(response.body, "utf8"),
            queries: tally(sample),
            observations: sample,
          };
          durations[operation]?.push(durationMs);
          (requests[operation] ??= []).push(request);
          if (!counts[operation]) counts[operation] = request.queries;
          label = "";
          return response;
        };
        for (const session of sessions) {
          const headers = (key: string) => writeHeaders(session, key);
          const started = await measure("start", () =>
            http.inject({
              method: "POST",
              url: `/v1/exams/${exam.examId}/attempts`,
              headers: headers(uuidv7()),
            }),
          );
          expect(started.statusCode).toBe(201);
          const attemptId = (started.json() as { data: { id: string } }).data.id;
          const questions = await measure("questions", () =>
            http.inject({
              method: "GET",
              url: `/v1/attempts/${attemptId}/questions?pageSize=100`,
              headers: { cookie: session.cookie },
            }),
          );
          expect(questions.statusCode).toBe(200);
          const page = questions.json() as { data: { id: string; options: { id: string }[] }[] };
          expect(page.data).toHaveLength(100);
          const frozen = page.data[0];
          if (!frozen?.options[0]) throw new Error("Metric question missing");
          const saved = await measure("save", () =>
            http.inject({
              method: "PUT",
              url: `/v1/attempts/${attemptId}/answers`,
              headers: headers(uuidv7()),
              payload: {
                answers: [
                  {
                    questionId: frozen.id,
                    selectedOptionIds: [frozen.options[0]!.id],
                    marked: false,
                    expectedVersion: 0,
                  },
                ],
              },
            }),
          );
          expect(saved.statusCode).toBe(200);
          const answers = await measure("answers", () =>
            http.inject({
              method: "GET",
              url: `/v1/attempts/${attemptId}/answers?pageSize=100`,
              headers: { cookie: session.cookie },
            }),
          );
          expect(answers.statusCode).toBe(200);
          expect(answers.json().data).toHaveLength(1);
          const submitted = await measure("submit", () =>
            http.inject({
              method: "POST",
              url: `/v1/attempts/${attemptId}/submit`,
              headers: headers(uuidv7()),
              payload: {},
            }),
          );
          expect(submitted.statusCode).toBe(202);
          const status = await measure("status", () =>
            http.inject({
              method: "GET",
              url: `/v1/attempts/${attemptId}/status`,
              headers: { cookie: session.cookie },
            }),
          );
          expect(status.statusCode).toBe(200);
          expect(status.json().data.status).toBe("SUBMITTED");
        }
      });
    } finally {
      db.query = original;
    }
    const explainPool = new Pool({ connectionString: runtimeUrl.toString(), max: 1 });
    const plans: {
      label: string;
      operation: string;
      sha256: string;
      analyzed: boolean;
      plan: ReturnType<typeof stripPlan>;
    }[] = [];
    try {
      for (const entry of captured.values()) {
        const analyzed = !/\b(insert|update|delete)\b/i.test(entry.sql);
        const client = await explainPool.connect();
        try {
          await client.query("BEGIN");
          const explained = await client.query<{
            "QUERY PLAN": { Plan: Record<string, unknown> }[];
          }>(
            `EXPLAIN (${analyzed ? "ANALYZE, BUFFERS, " : ""}FORMAT JSON) ${entry.sql}`,
            entry.parameters,
          );
          await client.query("ROLLBACK");
          const plan = explained.rows[0]?.["QUERY PLAN"][0]?.Plan;
          if (!plan) throw new Error(`Explain returned no plan for ${entry.operation}`);
          plans.push({
            label: entry.label,
            operation: entry.operation,
            sha256: createHash("sha256").update(entry.sql).digest("hex"),
            analyzed,
            plan: stripPlan(plan),
          });
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          const code =
            error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
          throw new Error(`Explain failed for ${entry.operation} (${code})`);
        } finally {
          client.release();
        }
      }
    } finally {
      await explainPool.end();
    }
    const budgets = [
      ["start", 12],
      ["questions", 4],
      ["answers", 4],
      ["save", 11],
      ["submit", 10],
      ["status", 3],
    ] as const;
    const budget = budgets.map(([operation, ceiling]) => {
      const values = requests[operation]?.map((request) => request.queries.queryCount) ?? [];
      const actual = values.length > 0 ? Math.max(...values) : null;
      return {
        operation,
        ceiling,
        actual,
        exceeded: actual !== null && actual > ceiling,
      };
    });
    const evidence = {
      schemaVersion: 2,
      runId: randomUUID(),
      recordedAt: new Date().toISOString(),
      scope:
        "local restricted PostgreSQL HTTP diagnostic; one independent attempt per actor, sequential; includes CSRF, authenticate, admission and the unit of work",
      notCapacityEvidence: true,
      sampleCount,
      workload: {
        questionsPerExam: 100,
        attemptsPerActor: 1,
        saveBatchSize: 1,
        answerVersion: 0,
        questionPageSize: 100,
        operationOrder: ["start", "questions", "save", "answers", "submit", "status"],
      },
      offeredConcurrency: 1,
      achievedConcurrency: 1,
      poolMax: 10,
      statementTimeoutMs: 2000,
      lockTimeoutMs: 500,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      postgres: (await fixture.query<{ version: string }>("SELECT version() AS version")).rows[0]
        ?.version,
      samples: Object.fromEntries(
        Object.entries(durations).map(([operation, values]) => [operation, summarize(values)]),
      ),
      durationSamplesMs: durations,
      requests,
      payloadBytes: Object.fromEntries(
        Object.entries(requests).map(([operation, values]) => [
          operation,
          summarize(values.map((request) => request.payloadBytes)),
        ]),
      ),
      queries: counts,
      queryCounts: Object.fromEntries(
        Object.entries(requests).map(([operation, values]) => [
          operation,
          summarize(values.map((request) => request.queries.queryCount)),
        ]),
      ),
      observationMetrics: Object.fromEntries(
        Object.entries(requests).map(([operation, values]) => {
          const sample = values.flatMap((request) => request.observations);
          return [
            operation,
            {
              queryDurationMs: summarize(
                sample.filter((item) => item.kind === "query").map((item) => item.durationMs),
              ),
              acquisitionMs: summarize(
                sample.filter((item) => item.kind === "acquire").map((item) => item.durationMs),
              ),
              transactionMs: summarize(
                sample.filter((item) => item.kind === "transaction").map((item) => item.durationMs),
              ),
              lockMs: summarize(
                sample.filter((item) => item.kind === "lock").map((item) => item.durationMs),
              ),
              poolTotalMax: Math.max(0, ...sample.map((item) => item.total)),
              poolWaitingMax: Math.max(0, ...sample.map((item) => item.waiting)),
            },
          ];
        }),
      ),
      budget,
      reliabilityReason:
        "Auth-inclusive HTTP writes preserve CSRF, current account/session permissions, actor/attempt serialization, post-lock database time, receipts and transactional outbox. Captured operation counts explain the current adapter cost; unchanged ceilings are evaluated across all samples. No control is waived by this diagnostic.",
      plans,
      migrations: await migrationHashes(),
      source: await sourceHashes("apps/api/src"),
      contracts: await sourceHashes("docs/contracts"),
      configurationSha256: createHash("sha256")
        .update(
          JSON.stringify({
            sampleCount,
            questionsPerExam: 100,
            poolMax: 10,
            statementTimeoutMs: 2000,
            lockTimeoutMs: 500,
            offeredConcurrency: 1,
            operationOrder: ["start", "questions", "save", "answers", "submit", "status"],
          }),
        )
        .digest("hex"),
      testSourceSha256: createHash("sha256")
        .update(await readFile("apps/api/tests/integration/assessment.spec.ts"))
        .digest("hex"),
    };
    expect(evidence.notCapacityEvidence).toBe(true);
    expect(Object.values(durations).every((values) => values.length === sampleCount)).toBe(true);
    expect(
      Object.values(requests).every((values) =>
        values.every((request) => request.queries.errorCount === 0),
      ),
    ).toBe(true);
    expect(budget.every((item) => item.actual !== null && item.actual > 0)).toBe(true);
    expect(Object.values(counts).every((item) => item.errorCount === 0)).toBe(true);
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain(explanationToken);
    expect(serialized).not.toContain(metricUser.id);
    for (const actor of actors) {
      expect(serialized).not.toContain(actor.id);
      expect(serialized).not.toContain(actor.email);
      expect(serialized).not.toContain(actor.raw);
    }
    expect(serialized).not.toContain(exam.examId);
    expect(serialized).not.toContain("SELECT");
    expect(serialized).not.toContain("WHERE");
    const directory = process.env.ASSESSMENT_EVIDENCE_DIR ?? ".local/assessment-diagnostics";
    await mkdir(directory, { recursive: true });
    const rawPath = join(directory, `${evidence.runId}.json`);
    await writeFile(rawPath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
    const raw = JSON.parse(await readFile(rawPath, "utf8")) as typeof evidence;
    await writeFile(join(directory, `${evidence.runId}.summary.md`), renderSummary(raw), {
      flag: "wx",
    });
  }, 120000);
});

interface DiagnosticRequest {
  durationMs: number;
  cpuUserMicros: number;
  cpuSystemMicros: number;
  rssBeforeBytes: number;
  rssAfterBytes: number;
  payloadBytes: number;
  queries: Tally;
  observations: DatabaseObservation[];
}

function diagnosticSampleCount(): number {
  const raw = process.env.ASSESSMENT_DIAGNOSTIC_SAMPLES ?? "25";
  if (!/^\d+$/.test(raw) || Number(raw) < 25 || Number(raw) > 100) {
    throw new Error("ASSESSMENT_DIAGNOSTIC_SAMPLES must be an integer from 25 to 100");
  }
  return Number(raw);
}

interface Tally {
  queryCount: number;
  errorCount: number;
  byOperation: Record<string, number>;
}

function tally(sample: DatabaseObservation[]): Tally {
  const queries = sample.filter((item) => item.kind === "query");
  const byOperation: Record<string, number> = {};
  for (const item of queries) {
    const key = item.operation ?? "unknown";
    byOperation[key] = (byOperation[key] ?? 0) + 1;
  }
  return {
    queryCount: queries.length,
    errorCount: sample.filter((item) => item.code).length,
    byOperation,
  };
}

function summarize(values: number[]) {
  if (values.length === 0) return { n: 0, min: null, p50: null, p95: null, p99: null, max: null };
  const sorted = [...values].sort((left, right) => left - right);
  const at = (percent: number) =>
    sorted[
      Math.min(sorted.length - 1, Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1))
    ] ?? null;
  return {
    n: sorted.length,
    min: sorted[0] ?? null,
    p50: at(50),
    p95: at(95),
    p99: at(99),
    max: sorted.at(-1) ?? null,
  };
}

function stripPlan(node: Record<string, unknown>): Record<string, unknown> {
  const plans = Array.isArray(node.Plans)
    ? node.Plans.map((child) => stripPlan(child as Record<string, unknown>))
    : undefined;
  return {
    nodeType: node["Node Type"],
    relation: node["Relation Name"] ?? null,
    actualRows: node["Actual Rows"] ?? null,
    actualTotalTime: node["Actual Total Time"] ?? null,
    sharedHitBlocks: node["Shared Hit Blocks"] ?? null,
    ...(plans ? { plans } : {}),
  };
}

function renderSummary(raw: {
  runId: string;
  recordedAt: string;
  notCapacityEvidence: boolean;
  offeredConcurrency: number;
  achievedConcurrency: number;
  samples: Record<
    string,
    {
      n: number;
      min: number | null;
      p50: number | null;
      p95: number | null;
      p99: number | null;
      max: number | null;
    }
  >;
  budget: { operation: string; ceiling: number; actual: number | null; exceeded: boolean }[];
  reliabilityReason: string;
  postgres?: string;
}): string {
  const rows = raw.budget
    .map(
      (item) =>
        `| ${item.operation} | ${item.ceiling} | ${item.actual ?? "null"} | ${item.exceeded} |`,
    )
    .join("\n");
  const samples = Object.entries(raw.samples)
    .map(
      ([operation, sample]) =>
        `| ${operation} | ${sample.n} | ${sample.min ?? "null"} | ${sample.p50 ?? "null"} | ${sample.p95 ?? "null"} | ${sample.p99 ?? "null"} | ${sample.max ?? "null"} |`,
    )
    .join("\n");
  return [
    "# Assessment local diagnostic",
    "",
    `Generated from raw run \`${raw.runId}\` recorded at ${raw.recordedAt}.`,
    "",
    "This run is sequential local evidence. It does not establish capacity, an SLO, or an AWS saving.",
    "",
    `- notCapacityEvidence: ${raw.notCapacityEvidence}`,
    `- offeredConcurrency: ${raw.offeredConcurrency}`,
    `- achievedConcurrency: ${raw.achievedConcurrency}`,
    `- postgres: ${raw.postgres ?? "null"}`,
    "",
    "## Query budget",
    "",
    "| Operation | Ceiling | Actual | Exceeded |",
    "| --- | ---: | ---: | --- |",
    rows,
    "",
    raw.reliabilityReason,
    "",
    "## Samples",
    "",
    "Raw per-request durations, query/pool/lock observations and process CPU/RSS samples are retained. CPU/RSS include same-process HTTP/test overhead; they do not isolate application allocation. Missing percentiles are null.",
    "",
    "| Operation | n | min | p50 | p95 | p99 | max |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    samples,
    "",
  ].join("\n");
}

async function migrationHashes(): Promise<{ file: string; bytes: number; sha256: string }[]> {
  const directory = "apps/api/src/infrastructure/database/migrations";
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  return Promise.all(
    files.map(async (file) => {
      const bytes = await readFile(join(directory, file));
      return {
        file,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
}

async function sourceHashes(directory: string): Promise<{ path: string; sha256: string }[]> {
  const results: { path: string; sha256: string }[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await sourceHashes(path)));
    else if (entry.isFile() && /\.(ts|sql|yaml|json)$/.test(entry.name)) {
      results.push({
        path: path.replaceAll("\\", "/"),
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      });
    }
  }
  return results.sort((left, right) => left.path.localeCompare(right.path));
}

// The second Assessment service uses Identity bound to its own transaction context.
function writeHeaders(session: LiveSession, key: string) {
  return {
    origin: session.origin,
    cookie: session.cookie,
    "x-csrf-token": session["x-csrf-token"],
    "idempotency-key": key,
  };
}

async function publishedVersion(examId: string): Promise<string> {
  return text(
    `
  SELECT
    current_version_id::text AS value
  FROM
    catalog.exams
  WHERE
    id = $1
  `,
    [examId],
  );
}

async function draftExam(questionId: string) {
  return catalog.createExam(
    adminUser.raw,
    uuidv7(),
    {
      title: "Publication boundary review",
      category: "IT_CERTIFICATION",
      durationSeconds: 90,
      openAt: new Date(Date.now() - 60_000).toISOString(),
      closeAt: new Date(Date.now() + 3_600_000).toISOString(),
      displayTimezone: "Asia/Ho_Chi_Minh",
      attemptLimit: 2,
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
}

async function publicationRace(firstPublication: boolean) {
  const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Boundary fixture", 2, [1]));
  const exam = firstPublication
    ? await draftExam(bankId).then((v) => ({
        examId: v.body.resourceId,
        revision: v.body.revision,
      }))
    : await publishExam([{ bankQuestionId: bankId }]);
  let enter!: () => void;
  let release!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const gatedRepo = new PostgresCatalogRepository(db);
  const publish = gatedRepo.publish.bind(gatedRepo);
  gatedRepo.publish = async (...args) => {
    const result = await publish(...args);
    enter();
    await released;
    return result;
  };
  const gatedCatalog = new CatalogService(
    identity,
    gatedRepo,
    new PostgresCatalogQuery(db),
    new PostgresIdempotency(db),
    new PostgresSecurity(db, rateKey),
    db,
    new HmacCatalogCursor(csrfKey),
  );
  let output:
    | {
        waiting: boolean;
        status: number;
        error: string | null;
        matchesCurrentVersion: boolean;
        attempts: number;
      }
    | undefined;
  await withHttp(async (http) => {
    const session = await openSession(http, candidateUser.email);
    const pendingPublish = gatedCatalog.publish(
      adminUser.raw,
      uuidv7(),
      exam.examId,
      exam.revision,
      randomUUID(),
    );
    try {
      await entered;
      const pendingStart = http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: writeHeaders(session, uuidv7()),
      });
      const waiting = await seenLock();
      release();
      await pendingPublish;
      const response = await pendingStart;
      const body = response.json() as {
        errorCode: string | null;
        data: { publishedVersionId: string } | null;
      };
      output = {
        waiting,
        status: response.statusCode,
        error: body.errorCode,
        matchesCurrentVersion:
          body.data?.publishedVersionId === (await publishedVersion(exam.examId)),
        attempts: await scalar(
          `
          SELECT
            count(*)::int AS n
          FROM
            assessment.attempts
          WHERE
            exam_id = $1
          `,
          [exam.examId],
        ),
      };
    } finally {
      release();
      await pendingPublish.catch(() => undefined);
    }
  });
  if (!output) throw new Error("Race output missing");
  return output;
}

describe("Assessment review regressions on restricted PostgreSQL", () => {
  it("AR-01 replays semantically identical selected-option sets", async () => {
    const bankId = await bankQuestion(choiceDraft("MULTIPLE_CHOICE", "Set semantics", 3, [1, 2]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const question = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null))
      .items[0]!;
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const key = uuidv7();
      const answer = {
        questionId: question.id,
        selectedOptionIds: question.options.slice(0, 2).map((o) => o.id),
        marked: false,
        expectedVersion: 0,
      };
      const first = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, key),
        payload: { answers: [answer] },
      });
      const second = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, key),
        payload: {
          answers: [{ ...answer, selectedOptionIds: [...answer.selectedOptionIds].reverse() }],
        },
      });
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(second.headers["idempotency-replayed"]).toBe("true");
      expect(second.json()).toEqual(first.json());
      const changed = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, key),
        payload: { answers: [{ ...answer, selectedOptionIds: [] }] },
      });
      expect(changed.statusCode).toBe(409);
      const newer = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, uuidv7()),
        payload: {
          answers: [{ ...answer, selectedOptionIds: [], marked: true, expectedVersion: 1 }],
        },
      });
      expect(newer.statusCode).toBe(200);
      const oldRetry = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, key),
        payload: {
          answers: [{ ...answer, selectedOptionIds: [...answer.selectedOptionIds].reverse() }],
        },
      });
      expect(oldRetry.statusCode).toBe(200);
      expect(oldRetry.headers["idempotency-replayed"]).toBe("true");
      expect(oldRetry.json()).toEqual(first.json());
      const stored = await assessment.answers(candidateUser.id, attempt.body.id, 20, null);
      expect(stored.items).toEqual([
        expect.objectContaining({
          questionId: question.id,
          selectedOptionIds: [],
          marked: true,
          version: 2,
        }),
      ]);
    });
  });

  it("AR-02 bounds the whole decoded HTTP question page", async () => {
    const placeholder = "00000000-0000-4000-8000-000000000001";
    const projected = (
      position: number,
      prompt: string,
      optionCount: number,
      optionText: string,
    ) => ({
      id: placeholder,
      sectionId: placeholder,
      position,
      type: "MULTIPLE_CHOICE",
      prompt,
      points: 5,
      options: Array.from({ length: optionCount }, (_, i) => ({
        id: placeholder,
        position: i + 1,
        text: optionText,
      })),
    });
    const large = Array.from({ length: 9 }, (_, i) =>
      projected(i + 1, "a".repeat(8000), 10, "b".repeat(2000)),
    );
    const tailSize =
      262144 -
      32 -
      Buffer.byteLength(JSON.stringify([...large, projected(10, "", 2, "x")]), "utf8");
    expect(tailSize).toBeGreaterThan(0);
    expect(tailSize).toBeLessThanOrEqual(8000);
    const bankIds = [];
    for (let i = 0; i < 9; i++) {
      const q = choiceDraft("MULTIPLE_CHOICE", "a".repeat(8000), 10, [1, 2]);
      q.options = q.options.map((o) => ({ ...o, text: "b".repeat(2000) }));
      bankIds.push(await bankQuestion(q));
    }
    const tail = choiceDraft("MULTIPLE_CHOICE", "c".repeat(tailSize), 2, [1, 2]);
    tail.options = tail.options.map((o) => ({ ...o, text: "x" }));
    bankIds.push(await bankQuestion(tail));
    bankIds.push(await bankQuestion(choiceDraft("MULTIPLE_CHOICE", "Last", 2, [1, 2])));
    const exam = await publishExam(bankIds.map((bankQuestionId) => ({ bankQuestionId })));
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attempt.body.id}/questions?pageSize=20`,
        headers: { cookie: session.cookie },
      });
      const body = response.json() as {
        data: { id: string; position: number }[];
        metadata: { next: string | null };
      };
      const bytes = Buffer.byteLength(response.body, "utf8");
      const cursor = body.metadata.next;
      const next = cursor
        ? await http.inject({
            method: "GET",
            url: `/v1/attempts/${attempt.body.id}/questions?pageSize=20&cursor=${encodeURIComponent(cursor)}`,
            headers: { cookie: session.cookie },
          })
        : null;
      const allIds = [...body.data, ...(next ? next.json().data : [])].map(
        (q: { id: string }) => q.id,
      );
      expect(response.statusCode).toBe(200);
      assertSchema(validateQuestions, response.json());
      if (next) {
        expect(next.statusCode).toBe(200);
        assertSchema(validateQuestions, next.json());
        expect(Buffer.byteLength(next.body, "utf8")).toBeLessThanOrEqual(262144);
        expect(next.json().metadata.next).toBeNull();
      }
      expect(allIds.length).toBe(11);
      expect(new Set(allIds).size).toBe(11);
      expect(
        [...body.data, ...(next ? next.json().data : [])].map(
          (question: { position: number }) => question.position,
        ),
      ).toEqual(Array.from({ length: 11 }, (_, index) => index + 1));
      expect(bytes).toBeLessThanOrEqual(262144);
    });
  });

  it("AR-03 starts with the version committed by an observed first-publication lock", async () => {
    const result = await publicationRace(true);
    expect(result.waiting).toBe(true);
    expect(result.status).toBe(201);
    expect(result.matchesCurrentVersion).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it("AR-03 starts with the version committed by an observed republish lock", async () => {
    const result = await publicationRace(false);
    expect(result.waiting).toBe(true);
    expect(result.status).toBe(201);
    expect(result.matchesCurrentVersion).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it("AR-04 accepts the UUID spelling allowed by the HTTP validator", async () => {
    const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "UUID spelling", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const q = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null)).items[0]!;
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const key = uuidv7();
      const response = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id.toUpperCase()}/answers`,
        headers: writeHeaders(session, key),
        payload: {
          answers: [
            {
              questionId: q.id.toUpperCase(),
              selectedOptionIds: [q.options[0]!.id.toUpperCase()],
              marked: false,
              expectedVersion: 0,
            },
          ],
        },
      });
      expect(response.statusCode).toBe(200);
      const retry = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id.toUpperCase()}/answers`,
        headers: writeHeaders(session, key),
        payload: {
          answers: [
            {
              questionId: q.id,
              selectedOptionIds: [q.options[0]!.id],
              marked: false,
              expectedVersion: 0,
            },
          ],
        },
      });
      expect(retry.statusCode).toBe(200);
      expect(retry.headers["idempotency-replayed"]).toBe("true");
      expect(retry.json()).toEqual(response.json());
      const resumed = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attempt.body.id.toUpperCase()}`,
        headers: { cookie: session.cookie },
      });
      expect(resumed.statusCode).toBe(200);
      expect(resumed.json().data.id).toBe(attempt.body.id);
    });
  });

  it("AR-04 rejects duplicate semantic UUIDs before storing a batch", async () => {
    const bankId = await bankQuestion(choiceDraft("MULTIPLE_CHOICE", "Duplicate UUIDs", 3, [1, 2]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const q = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null)).items[0]!;
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const commands = [
        {
          questionId: q.id,
          selectedOptionIds: [q.options[0]!.id, q.options[0]!.id.toUpperCase()],
          marked: false,
          expectedVersion: 0,
        },
      ];
      const duplicateOptions = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, uuidv7()),
        payload: { answers: commands },
      });
      expect(duplicateOptions.statusCode).toBe(400);
      const answer = { questionId: q.id, selectedOptionIds: [], marked: false, expectedVersion: 0 };
      const duplicateQuestions = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, uuidv7()),
        payload: { answers: [answer, { ...answer, questionId: q.id.toUpperCase() }] },
      });
      expect(duplicateQuestions.statusCode).toBe(400);
      const stored = await assessment.answers(candidateUser.id, attempt.body.id, 20, null);
      expect(stored.items).toEqual([]);
      expect((await assessment.resume(candidateUser.id, attempt.body.id)).revision).toBe(1);
    });
  });

  it("AR-04 canonicalizes UUID paths for start replay, question cursors and submit replay", async () => {
    const bankIds = await importBank(["UUID path one", "UUID path two"]);
    const exam = await publishExam(bankIds.map((bankQuestionId) => ({ bankQuestionId })));
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const key = uuidv7();
      const first = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId.toUpperCase()}/attempts`,
        headers: writeHeaders(session, key),
      });
      expect(first.statusCode).toBe(201);
      const replay = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: writeHeaders(session, key),
      });
      expect(replay.statusCode).toBe(201);
      expect(replay.headers["idempotency-replayed"]).toBe("true");
      expect(replay.json()).toEqual(first.json());
      const attemptId = first.json().data.id as string;
      const page = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId.toUpperCase()}/questions?pageSize=1`,
        headers: { cookie: session.cookie },
      });
      expect(page.statusCode).toBe(200);
      const cursor = page.json().metadata.next as string;
      expect(cursor).toBeTruthy();
      const next = await http.inject({
        method: "GET",
        url: `/v1/attempts/${attemptId}/questions?pageSize=1&cursor=${encodeURIComponent(cursor)}`,
        headers: { cookie: session.cookie },
      });
      expect(next.statusCode).toBe(200);
      expect(next.json().data[0].id).not.toBe(page.json().data[0].id);
      const submitKey = uuidv7();
      const submitted = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attemptId.toUpperCase()}/submit`,
        headers: writeHeaders(session, submitKey),
      });
      expect(submitted.statusCode).toBe(202);
      const submitReplay = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attemptId}/submit`,
        headers: writeHeaders(session, submitKey),
      });
      expect(submitReplay.statusCode).toBe(202);
      expect(submitReplay.headers["idempotency-replayed"]).toBe("true");
      expect(submitReplay.json()).toEqual(submitted.json());
    });
  });

  it("AR-02 measures escaped and UTF-8 text on every page including the final page", async () => {
    const questionIds = [];
    for (let i = 0; i < 5; i += 1) {
      const draft = choiceDraft("MULTIPLE_CHOICE", "\u0001".repeat(8000), 10, [1, 2]);
      draft.options = draft.options.map((option) => ({ ...option, text: "😀".repeat(2000) }));
      questionIds.push(await bankQuestion(draft));
    }
    const exam = await publishExam(questionIds.map((bankQuestionId) => ({ bankQuestionId })));
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const ids: string[] = [];
      let cursor: string | null = null;
      let pageCount = 0;
      do {
        const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
        const response = await http.inject({
          method: "GET",
          url: `/v1/attempts/${attempt.body.id}/questions?pageSize=100${suffix}`,
          headers: { cookie: session.cookie },
        });
        expect(response.statusCode).toBe(200);
        assertSchema(validateQuestions, response.json());
        expect(Buffer.byteLength(response.body, "utf8")).toBeLessThanOrEqual(262144);
        const body = response.json() as {
          data: { id: string }[];
          metadata: { next: string | null };
        };
        expect(body.data.length).toBeGreaterThan(0);
        ids.push(...body.data.map((question) => question.id));
        cursor = body.metadata.next;
        pageCount += 1;
        expect(pageCount).toBeLessThanOrEqual(5);
      } while (cursor);
      expect(pageCount).toBeGreaterThan(1);
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5);
    });
  });

  it("control serializes two save writers on separate UnitOfWork instances", async () => {
    const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Concurrent saves", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const q = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null)).items[0]!;
    const commands = [
      {
        questionId: q.id,
        selectedOptionIds: [q.options[0]!.id],
        marked: false,
        expectedVersion: 0,
      },
    ];
    const outcomes = await Promise.allSettled([
      assessment.save(candidateUser.raw, uuidv7(), attempt.body.id, commands),
      assessment2.save(candidateUser.raw, uuidv7(), attempt.body.id, [
        { ...commands[0]!, selectedOptionIds: [], marked: true },
      ]),
    ]);
    const rejected = outcomes.find((o) => o.status === "rejected") as
      PromiseRejectedResult | undefined;
    const view = await assessment.resume(candidateUser.id, attempt.body.id);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(rejected?.reason.message).toBe("Revision conflict");
    expect(view.revision).toBe(2);
    const stored = await assessment.answers(candidateUser.id, attempt.body.id, 20, null);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0]?.version).toBe(1);
  });

  it("control keeps duplicate submit identity without requiring a second receipt", async () => {
    const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Duplicate submit", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const submitted = await assessment.submit(
      candidateUser.raw,
      uuidv7(),
      attempt.body.id,
      randomUUID(),
    );
    const duplicateKey = uuidv7();
    const duplicate = await assessment2.submit(
      candidateUser.raw,
      duplicateKey,
      attempt.body.id,
      randomUUID(),
    );
    expect(duplicate.body).toEqual(submitted.body);
    expect(
      await scalar(
        `
        SELECT
          count(*)::int AS n
        FROM
          platform.outbox
        WHERE
          aggregate_id = $1
        `,
        [attempt.body.id],
      ),
    ).toBe(1);
  });

  it("control preserves every acknowledged save in an observed save/submit race", async () => {
    for (let round = 0; round < 4; round += 1) {
      const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Save submit race", 2, [1]));
      const exam = await publishExam([{ bankQuestionId: bankId }]);
      const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
      const question = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null))
        .items[0]!;
      const commands = [
        {
          questionId: question.id,
          selectedOptionIds: [question.options[0]!.id],
          marked: false,
          expectedVersion: 0,
        },
      ];
      const held = await fixture.connect();
      let save!: Promise<PromiseSettledResult<unknown>>;
      let submit!: Promise<PromiseSettledResult<unknown>>;
      let waiting = false;
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
          [attempt.body.id],
        );
        const saveFirst = round % 2 === 0;
        const startSave = () =>
          Promise.allSettled([
            assessment.save(candidateUser.raw, uuidv7(), attempt.body.id, commands),
          ]).then((r) => r[0]!);
        const startSubmit = () =>
          Promise.allSettled([
            assessment2.submit(candidateUser.raw, uuidv7(), attempt.body.id, randomUUID()),
          ]).then((r) => r[0]!);
        if (saveFirst) {
          save = startSave();
          waiting = await seenLock();
          submit = startSubmit();
        } else {
          submit = startSubmit();
          waiting = await seenLock();
          save = startSave();
        }
        await held.query("COMMIT");
      } finally {
        await held.query("ROLLBACK").catch(() => undefined);
        held.release();
      }
      const [saved, submitted] = await Promise.all([save, submit]);
      const answerRows = await scalar(
        `
        SELECT
          count(*)::int AS n
        FROM
          assessment.answers
        WHERE
          attempt_id = $1
        `,
        [attempt.body.id],
      );
      const outboxRows = await scalar(
        `
        SELECT
          count(*)::int AS n
        FROM
          platform.outbox
        WHERE
          aggregate_id = $1
        `,
        [attempt.body.id],
      );
      const current = await assessment.resume(candidateUser.id, attempt.body.id);
      expect(waiting).toBe(true);
      expect(submitted.status).toBe("fulfilled");
      expect(answerRows).toBe(saved.status === "fulfilled" ? 1 : 0);
      if (saved.status === "rejected") expect(saved.reason.message).toBe("Attempt is closed");
      expect(outboxRows).toBe(1);
      expect(current.status).toBe("SUBMITTED");
    }
  });

  it("keeps CSRF family fallback, credential checks, permissions and the shared actor throttle", async () => {
    const bank = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Admission controls", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bank }]);
    const actor = await activated();
    const otherActor = await activated();
    await withHttp(async (http) => {
      const session = await openSession(http, actor.email);
      const other = await openSession(http, otherActor.email);
      const start = (headers: Record<string, string>) =>
        http.inject({ method: "POST", url: `/v1/exams/${exam.examId}/attempts`, headers });
      const initial = await start(writeHeaders(session, uuidv7()));
      expect(initial.statusCode).toBe(201);
      const attemptId = initial.json().data.id;
      for (const headers of [
        { ...writeHeaders(session, uuidv7()), origin: "http://untrusted.invalid" },
        { ...writeHeaders(session, uuidv7()), "x-csrf-token": "tampered" },
        {
          ...writeHeaders(session, uuidv7()),
          cookie: session.cookie.replace(
            /__Host-csrf=[^;]+/,
            `__Host-csrf=${other["x-csrf-token"]}`,
          ),
          "x-csrf-token": other["x-csrf-token"],
        },
      ])
        expect((await start(headers)).statusCode).toBe(403);
      for (const data of [
        null,
        { family: "anonymous", expires: Date.now() - 1 },
        { family: "anonymous", expires: Date.now() + 700_000 },
      ]) {
        const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
        const token = `${encoded}.${createHmac("sha256", csrfKey).update(encoded).digest("base64url")}`;
        expect(
          (
            await start({
              ...writeHeaders(session, uuidv7()),
              cookie: session.cookie.replace(/__Host-csrf=[^;]+/, `__Host-csrf=${token}`),
              "x-csrf-token": token,
            })
          ).statusCode,
        ).toBe(403);
      }
      const invalidAccess = await start({
        ...writeHeaders(session, uuidv7()),
        cookie: session.cookie.replace(/__Host-access=[^;]+/, "__Host-access=invalid"),
      });
      expect(invalidAccess.statusCode).toBe(401);
      for (const cookie of [
        session.cookie.replace(/;?\s*__Host-refresh=[^;]+/, ""),
        session.cookie.replace(/__Host-refresh=[^;]+/, "__Host-refresh=invalid"),
      ]) {
        const fallback = await start({ ...writeHeaders(session, uuidv7()), cookie });
        expect(fallback.statusCode).toBe(201);
        expect(fallback.json().data.id).toBe(attemptId);
      }
      // A consumed refresh can still bind CSRF while the rotated access is current.
      const rotated = await identity.refresh(session.refresh);
      const rotatedCookie = session.cookie.replace(
        /__Host-access=[^;]+/,
        `__Host-access=${rotated.access}`,
      );
      const consumedRefresh = await start({
        ...writeHeaders(session, uuidv7()),
        cookie: rotatedCookie,
      });
      expect(consumedRefresh.statusCode).toBe(201);
      expect(consumedRefresh.json().data.id).toBe(attemptId);
      const revokedAccess = await start(writeHeaders(session, uuidv7()));
      expect(revokedAccess.statusCode).toBe(401);
      const admin = await openSession(http, adminUser.email);
      expect((await start(writeHeaders(admin, uuidv7()))).statusCode).toBe(403);
      const security = new PostgresSecurity(db, rateKey);
      const subject = security.rateSubject("actor.write", actor.id);
      await fixture.query(
        `
        INSERT INTO
          platform.request_limits (scope, subject_hash, theoretical_at, expires_at)
        VALUES
          ('actor.write', $1, clock_timestamp() + interval '1 minute', clock_timestamp() + interval '1 hour')
        ON CONFLICT (scope, subject_hash) DO UPDATE
        SET
          theoretical_at = EXCLUDED.theoretical_at,
          expires_at = EXCLUDED.expires_at
      `,
        [subject],
      );
      try {
        const limited = await start({ ...writeHeaders(session, uuidv7()), cookie: rotatedCookie });
        expect(limited.statusCode).toBe(429);
        await expect(
          new HttpSession(identity, security, origin, csrfKey).admit(
            { ip: "127.0.0.1" } as never,
            "write",
            actor.id,
          ),
        ).rejects.toThrow("Too many requests");
      } finally {
        await fixture.query(
          `
          DELETE FROM platform.request_limits
          WHERE
            scope = 'actor.write'
            AND subject_hash = $1
        `,
          [subject],
        );
      }
      expect(
        await scalar(
          "SELECT count(*)::int AS n FROM assessment.attempts WHERE user_id = $1 AND exam_id = $2",
          [actor.id, exam.examId],
        ),
      ).toBe(1);
    });
  });

  it("AR-05 respects the existing auth-inclusive write query ceilings", async () => {
    const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "Query budgets", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    await withHttp(async (http) => {
      const session = await openSession(http, metricUser.email);
      observations.length = 0;
      const started = await http.inject({
        method: "POST",
        url: `/v1/exams/${exam.examId}/attempts`,
        headers: writeHeaders(session, uuidv7()),
      });
      const startCount = observations.filter((o) => o.kind === "query").length;
      expect(started.statusCode).toBe(201);
      const attempt = started.json().data;
      const q = (await assessment.questions(metricUser.id, attempt.id, 20, null)).items[0]!;
      observations.length = 0;
      const saved = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.id}/answers`,
        headers: writeHeaders(session, uuidv7()),
        payload: {
          answers: [{ questionId: q.id, selectedOptionIds: [], marked: false, expectedVersion: 0 }],
        },
      });
      const saveCount = observations.filter((o) => o.kind === "query").length;
      observations.length = 0;
      const submitted = await http.inject({
        method: "POST",
        url: `/v1/attempts/${attempt.id}/submit`,
        headers: writeHeaders(session, uuidv7()),
      });
      const submitCount = observations.filter((o) => o.kind === "query").length;
      expect(saved.statusCode).toBe(200);
      expect(submitted.statusCode).toBe(202);
      expect(startCount).toBeLessThanOrEqual(12);
      expect(saveCount).toBeLessThanOrEqual(11);
      expect(submitCount).toBeLessThanOrEqual(10);
    });
  });
});
async function submittedForReview(
  policy: "NEVER" | "AFTER_COMPLETION" | "AFTER_EXAM_CLOSE",
  long = false,
  actor = candidateUser,
  splitSections = false,
) {
  const bankIds = [];
  for (let i = 0; i < (long ? 5 : 3); i++) {
    const draft = choiceDraft(
      "SINGLE_CHOICE",
      long ? "\u0001".repeat(8000) : `Review ${i}`,
      long ? 10 : 2,
      [1],
    );
    if (long) {
      draft.explanation = "\u0001".repeat(8000);
      draft.options = draft.options.map((o) => ({ ...o, text: "\u0001".repeat(2000) }));
    }
    bankIds.push(await bankQuestion(draft));
  }
  const exam = await publishExam(
    bankIds.map((bankQuestionId) => ({ bankQuestionId })),
    2,
    policy,
    splitSections,
  );
  const a = await assessment.start(actor.raw, uuidv7(), exam.examId);
  const qs: import("../../src/modules/assessment/application/dto/assessment.dto").CandidateQuestionView[] =
    [];
  let questionCursor: string | null = null;
  do {
    const page = await assessment.questions(actor.id, a.body.id, 100, questionCursor);
    qs.push(...page.items);
    questionCursor = page.metadata.next;
  } while (questionCursor);
  await assessment.save(
    actor.raw,
    uuidv7(),
    a.body.id,
    qs.slice(0, 2).map((q) => ({
      questionId: q.id,
      selectedOptionIds: [q.options[0]!.id],
      marked: false,
      expectedVersion: 0,
    })),
  );
  await assessment.submit(actor.raw, uuidv7(), a.body.id, randomUUID());
  const raw = JSON.stringify(
    (
      await fixture.query("SELECT payload FROM platform.outbox WHERE aggregate_id = $1", [
        a.body.id,
      ])
    ).rows[0].payload,
  );
  return { attempt: a.body.id, exam: exam.examId, qs, raw };
}
async function gradeReview(raw: string) {
  expect(
    (await createGradingConsumer(graderDb, createScoringCatalog(graderDb)).consume(raw)).outcome,
  ).toBe("completed");
}
describe("Candidate read results on restricted PostgreSQL/HTTP", () => {
  it("returns pending and FAILED durable status without score or internal failure information", async () => {
    const f = await submittedForReview("AFTER_COMPLETION");
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const headers = { cookie: session.cookie };
      let response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers,
      });
      expect(response.statusCode).toBe(202);
      noStore(response);
      assertSchema(validateAttempt, response.json());
      expect(response.headers["retry-after"]).toBe("2");
      expect(response.json().data).toMatchObject({
        status: "SUBMITTED",
        resultAvailable: false,
        pollAfterSeconds: 2,
      });
      await createGradingRecovery(graderDb).consume(f.raw);
      response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers,
      });
      expect(response.statusCode).toBe(202);
      assertSchema(validateAttempt, response.json());
      expect(response.json().data).toMatchObject({
        status: "FAILED",
        replayPending: false,
        pollAfterSeconds: 0,
      });
      expect(response.body).not.toMatch(
        /RETRY_EXHAUSTED|earned|possible|SCORING_INVALID|grading_generation/,
      );
      await ops.query(
        "SELECT * FROM assessment.operator_replay_grading($1, $2, 'read-fixture', 'verify durable pending status', $3)",
        [f.attempt, response.json().data.revision, randomUUID()],
      );
      for (const action of ["result", "status"]) {
        const replay = await http.inject({
          method: "GET",
          url: `/v1/attempts/${f.attempt}/${action}`,
          headers,
        });
        expect(replay.statusCode).toBe(action === "result" ? 202 : 200);
        assertSchema(validateAttempt, replay.json());
        expect(replay.json().data).toMatchObject({
          status: "FAILED",
          replayPending: true,
          resultAvailable: false,
          pollAfterSeconds: 2,
          canSave: false,
        });
      }
      const denied = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers,
      });
      expect(denied.statusCode).toBe(403);
      expect(denied.body).not.toContain(explanationToken);
    });
  });
  it("returns immutable scores but NEVER releases review, and hides foreign ownership", async () => {
    const f = await submittedForReview("NEVER");
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email),
        other = await openSession(http, foreignUser.email);
      const response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt.toUpperCase()}/result`,
        headers: { cookie: session.cookie },
      });
      expect(response.statusCode).toBe(200);
      noStore(response);
      assertSchema(validateResult, response.json());
      expect(response.json().data).toMatchObject({
        attemptId: f.attempt,
        earned: 10,
        possible: 15,
        correct: 2,
        total: 3,
        percentageBasisPoints: 6666,
        review: null,
      });
      expect(response.json().data.sections).toEqual([
        expect.objectContaining({ earned: 10, possible: 15, correct: 2, total: 3 }),
      ]);
      expect(response.body).not.toMatch(/correctOptionIds|explanation|failureCode|userId|email/);
      for (const action of ["result", "review"]) {
        const foreign = await http.inject({
          method: "GET",
          url: `/v1/attempts/${f.attempt}/${action}`,
          headers: { cookie: other.cookie },
        });
        expect(foreign.statusCode).toBe(404);
        noStore(foreign);
      }
      const review = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers: { cookie: session.cookie },
      });
      expect(review.statusCode).toBe(403);
      expect(review.body).not.toContain(explanationToken);
    });
  });
  it("releases AFTER_COMPLETION as bounded review and exposes only the owner's history", async () => {
    const f = await submittedForReview("AFTER_COMPLETION");
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const result = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers: { cookie: session.cookie },
      });
      expect(result.statusCode).toBe(200);
      expect(result.json().data.review).toEqual({ href: `/v1/attempts/${f.attempt}/review` });
      const response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review?pageSize=2`,
        headers: { cookie: session.cookie },
      });
      expect(response.statusCode).toBe(200);
      noStore(response);
      expect(response.json().data).toHaveLength(2);
      assertSchema(validateReview, response.json());
      expect(response.json().data[0]).toMatchObject({
        correct: true,
        explanation: explanationToken,
        selectedOptionIds: [f.qs[0]!.options[0]!.id],
        correctOptionIds: [f.qs[0]!.options[0]!.id],
      });
      expect(response.json().metadata.next).not.toBeNull();
      const history = await http.inject({
        method: "GET",
        url: "/v1/me/attempts?pageSize=100",
        headers: { cookie: session.cookie },
      });
      expect(history.statusCode).toBe(200);
      noStore(history);
      assertSchema(validateHistory, history.json());
      expect(
        history.json().data.find((v: { attemptId: string }) => v.attemptId === f.attempt),
      ).toMatchObject({ status: "COMPLETED", earned: 10, possible: 15 });
    });
  });
});

describe("Candidate read policy/pagination regressions", () => {
  it("uses frozen close/policy after republish and keeps completed result/history after unpublish", async () => {
    const f = await submittedForReview("AFTER_EXAM_CLOSE");
    await gradeReview(f.raw);
    // A real snapshot close-time test uses a future started attempt, then wall-clock release.
    // Version fields are immutable: only fixture administrator may remove the guard below.
    const v = (
      await fixture.query("SELECT version_id FROM assessment.attempts WHERE id = $1", [f.attempt])
    ).rows[0].version_id;
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email),
        headers = { cookie: session.cookie };
      const before = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers,
      });
      expect(before.statusCode).toBe(403);
      expect(before.body).not.toContain(explanationToken);
      const metadata = await catalog.adminExam(f.exam);
      const next = {
        title: metadata.title,
        category: metadata.category,
        durationSeconds: metadata.durationSeconds,
        openAt: metadata.openAt,
        closeAt: metadata.closeAt,
        displayTimezone: metadata.displayTimezone,
        attemptLimit: metadata.attemptLimit,
        explanationPolicy: "AFTER_COMPLETION" as const,
        leaderboardEnabled: metadata.leaderboardEnabled,
        expectedRevision: metadata.revision,
        sections: metadata.sections,
      };
      await catalog.replaceExam(adminUser.raw, uuidv7(), f.exam, next, randomUUID());
      await catalog.publish(adminUser.raw, uuidv7(), f.exam, metadata.revision + 1, randomUUID());
      const still = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers,
      });
      expect(still.statusCode).toBe(403);
      // Exercise the exact SQL release boundary without sleeping or modifying accepted source code.
      await fixture.query("ALTER TABLE catalog.published_versions DISABLE TRIGGER USER");
      try {
        await fixture.query(
          `
          UPDATE catalog.published_versions
          SET
            closes_at = statement_timestamp()
          WHERE
            id = $1
        `,
          [v],
        );
      } finally {
        await fixture.query("ALTER TABLE catalog.published_versions ENABLE TRIGGER USER");
      }
      const released = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers,
      });
      expect(released.statusCode).toBe(200);
      assertSchema(validateReview, released.json());
      const updated = await catalog.adminExam(f.exam);
      await catalog.unpublish(adminUser.raw, uuidv7(), f.exam, updated.revision, randomUUID());
      const result = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers,
      });
      expect(result.statusCode).toBe(200);
      assertSchema(validateResult, result.json());
      expect(result.json().data.publishedVersionId).toBe(v);
    });
  });
  it("traverses escaped review without skips and rejects cross-scope/expired/tampered cursors", async () => {
    const f = await submittedForReview("AFTER_COMPLETION", true);
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email),
        headers = { cookie: session.cookie };
      const ids: string[] = [];
      let cursor: string | null = null;
      let first: string | null = null;
      do {
        const response = await http.inject({
          method: "GET",
          url: `/v1/attempts/${f.attempt}/review?pageSize=100${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
          headers,
        });
        expect(response.statusCode).toBe(200);
        assertSchema(validateReview, response.json());
        noStore(response);
        expect(Buffer.byteLength(response.body, "utf8")).toBeLessThanOrEqual(262144);
        expect(response.json().data.length).toBeGreaterThan(0);
        ids.push(...response.json().data.map((r: { question: { id: string } }) => r.question.id));
        cursor = response.json().metadata.next;
        if (!first) first = cursor;
        expect(ids.length).toBeLessThanOrEqual(5);
      } while (cursor);
      expect(ids).toEqual(f.qs.map((q) => q.id));
      expect(new Set(ids).size).toBe(5);
      expect(first).not.toBeNull();
      const other = await openSession(http, foreignUser.email);
      for (const [url, cookie] of [
        [
          `/v1/attempts/${f.attempt}/review?pageSize=20&cursor=${encodeURIComponent(first!)}`,
          session.cookie,
        ],
        [
          `/v1/attempts/${f.attempt}/review?pageSize=100&cursor=${encodeURIComponent(first!)}`,
          other.cookie,
        ],
        [`/v1/me/attempts?pageSize=100&cursor=${encodeURIComponent(first!)}`, session.cookie],
        [
          `/v1/attempts/${f.attempt}/review?pageSize=100&cursor=x${encodeURIComponent(first!)}`,
          session.cookie,
        ],
      ]) {
        const denied = await http.inject({
          method: "GET",
          url: url!,
          headers: { cookie: cookie! },
        });
        expect(denied.statusCode).toBe(400);
        expect(denied.json().errorCode).toBe("Invalid request");
      }
      const expired = new HmacAssessmentCursor(csrfKey).sign(
        { kind: "attempt.review", actorId: candidateUser.id, pageSize: 100, filter: f.attempt },
        JSON.parse(f.raw).payload.publishedVersionId,
        ["1", "1", f.qs[0]!.id],
        0,
      );
      const denied = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review?pageSize=100&cursor=${encodeURIComponent(expired)}`,
        headers,
      });
      expect(denied.statusCode).toBe(400);
    });
  });
  it("enforces current read permission/session and bounded input; denied result reads do not query keys", async () => {
    const f = await submittedForReview("AFTER_COMPLETION");
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email),
        headers = { cookie: session.cookie };
      for (const url of [
        `/v1/attempts/${f.attempt}/result`,
        `/v1/attempts/${f.attempt}/review`,
        "/v1/me/attempts",
      ]) {
        const unauth = await http.inject({ method: "GET", url });
        expect(unauth.statusCode).toBe(401);
      }
      await fixture.query(
        "DELETE FROM identity.role_permissions WHERE role_id = 'CANDIDATE' AND permission_id = 'assessment.result.read'",
      );
      try {
        const response = await http.inject({
          method: "GET",
          url: `/v1/attempts/${f.attempt}/result`,
          headers,
        });
        expect(response.statusCode).toBe(403);
        expect(response.body).not.toContain(explanationToken);
        const history = await http.inject({ method: "GET", url: "/v1/me/attempts", headers });
        expect(history.statusCode).toBe(200);
      } finally {
        await fixture.query(
          "INSERT INTO identity.role_permissions (role_id, permission_id) VALUES ('CANDIDATE', 'assessment.result.read')",
        );
      }
      for (const suffix of [
        "pageSize=0",
        "pageSize=101",
        "pageSize=1.5",
        "actorId=" + foreignUser.id,
        "cursor=",
      ]) {
        const response = await http.inject({
          method: "GET",
          url: "/v1/me/attempts?" + suffix,
          headers,
        });
        expect(response.statusCode).toBe(400);
      }
      await identity.logout(session.refresh);
      const revoked = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers,
      });
      expect(revoked.statusCode).toBe(401);
    });
  });
});

describe("Candidate history and query budgets", () => {
  it("keeps deterministic cursor history through new attempts, terminal null scores and empty owners", async () => {
    const actor = await activated();
    const service = new CandidateResultsService(
      new PostgresCandidateResultsQuery(db),
      new HmacAssessmentCursor(csrfKey),
      new HttpQuestionPageSizer(),
    );
    const empty = await service.history(actor.id, 20, null);
    expect(empty.items).toEqual([]);
    expect(empty.metadata.next).toBeNull();
    const f = await submittedForReview("NEVER", false, actor);
    const version = JSON.parse(f.raw).payload.publishedVersionId;
    const seedIds = Array.from({ length: 5 }, () => randomUUID())
      .sort()
      .reverse();
    const at = "2026-10-08T00:00:00.000Z";
    for (const id of seedIds)
      await fixture.query(
        `
      INSERT INTO assessment.attempts (
        id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
        submission_id, submission_event_id, submission_kind, expired, failure_code, revision
      )
      VALUES (
        $1, $2, $3, $4, 'FAILED', $5, $5::timestamptz + interval '90 seconds',
        $5::timestamptz + interval '30 seconds', gen_random_uuid(), gen_random_uuid(),
        'MANUAL', false, 'SYNTHETIC_FAILURE', 1
      )
    `,
        [id, actor.id, f.exam, version, at],
      );
    let page = await service.history(actor.id, 2, null);
    expect(page.items[0]!.attemptId).toBe(f.attempt);
    const first = page.metadata.next!;
    const late = await submittedForReview("NEVER", false, actor);
    await gradeReview(late.raw);
    const collected = page.items.map((v) => v.attemptId);
    while (page.metadata.next) {
      page = await service.history(actor.id, 2, page.metadata.next);
      collected.push(...page.items.map((v) => v.attemptId));
    }
    expect(collected).toEqual([f.attempt, ...seedIds]);
    expect(new Set(collected).size).toBe(6);
    expect(page.items.every((v) => v.earned === null && v.possible === null)).toBe(true);
    expect((await service.history(actor.id, 2, null)).items[0]!.attemptId).toBe(late.attempt);
    await expect(service.history(foreignUser.id, 2, first)).rejects.toThrow("Invalid request");
    await expect(service.history(actor.id, 20, first)).rejects.toThrow("Invalid request");
  });
  it("retains three auth-inclusive queries per result/review/history and records a bounded local diagnostic", async () => {
    const actor = await activated(),
      f = await submittedForReview("AFTER_COMPLETION", false, actor);
    const pending = await submittedForReview("NEVER", false, actor);
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, actor.email);
      const output: Record<string, unknown> = {
        environment:
          "local PG17/Node24 ARM64, synthetic 3-question attempts, sequential HTTP injection",
        scope:
          "short correctness/query/latency diagnostic only; no sustainable RPS/SLO/AWS/cost/allocation inference",
      };
      for (const [name, url, status] of [
        ["result", `/v1/attempts/${f.attempt}/result`, 200],
        ["pending", `/v1/attempts/${pending.attempt}/result`, 202],
        ["review", `/v1/attempts/${f.attempt}/review`, 200],
        ["history", "/v1/me/attempts", 200],
      ] as const) {
        // Each measured series fits the configured burst; reset only synthetic fixtures between series.
        await fixture.query("TRUNCATE platform.request_limits");
        const samples = [];
        const cpu = process.cpuUsage(),
          rss = process.memoryUsage().rss;
        for (let i = 0; i < 20; i++) {
          observations.length = 0;
          const start = performance.now();
          const response = await http.inject({
            method: "GET",
            url,
            headers: { cookie: session.cookie },
          });
          const elapsedMs = performance.now() - start;
          expect(response.statusCode).toBe(status);
          noStore(response);
          const sample = {
            elapsedMs,
            queries: observations.filter((o) => o.kind === "query").length,
            bytes: Buffer.byteLength(response.body, "utf8"),
          };
          expect(sample.queries).toBe(3);
          samples.push(sample);
        }
        const sorted = samples.map((v) => v.elapsedMs).sort((a, b) => a - b);
        const used = process.cpuUsage(cpu);
        output[name] = {
          samples,
          p50: sorted[Math.ceil(20 * 0.5) - 1],
          p95: sorted[Math.ceil(20 * 0.95) - 1],
          p99: sorted[19],
          observedRequestsPerSecond: 20000 / samples.reduce((a, s) => a + s.elapsedMs, 0),
          cpuMicrosPerRequest: (used.user + used.system) / 20,
          rssDeltaBytes: process.memoryUsage().rss - rss,
          note: "CPU/RSS include test/HTTP injection overhead; RSS delta is not allocated bytes/request; read bucket reset between series, not per request",
        };
      }
      if (process.env.RESULTS_EVIDENCE_FILE)
        await writeFile(process.env.RESULTS_EVIDENCE_FILE, JSON.stringify(output, null, 2));
    });
  });
});

describe("Candidate projection query plans", () => {
  it("uses the history index naturally on 100k attempts and never executes key lookup before release", async () => {
    const actor = await activated(),
      f = await submittedForReview("NEVER", false, actor);
    const version = JSON.parse(f.raw).payload.publishedVersionId;
    await fixture.query(
      `
      INSERT INTO assessment.attempts (
        id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
        submission_id, submission_event_id, submission_kind, expired, failure_code, revision
      )
      SELECT
        gen_random_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'FAILED',
        '2025-01-01'::timestamptz + g * interval '1 second',
        '2025-01-01'::timestamptz + g * interval '1 second' + interval '90 seconds',
        '2025-01-01'::timestamptz + g * interval '1 second' + interval '30 seconds',
        gen_random_uuid(),
        gen_random_uuid(),
        'MANUAL',
        false,
        'DIAGNOSTIC_FIXTURE',
        1
      FROM
        generate_series(1,100000) g
    `,
      [actor.id, f.exam, version],
    );
    await fixture.query("ANALYZE assessment.attempts");
    let captured: { sql: string; parameters: unknown[] } | null = null;
    const traced = new Proxy(db, {
      get(target, key) {
        if (key === "query")
          return async (operation: DatabaseOperation, sql: string, parameters: unknown[]) => {
            if (operation === "assessment.read") captured = { sql, parameters };
            return target.query(operation, sql, parameters);
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const query = new PostgresCandidateResultsQuery(traced);
    const explain = async () => {
      if (!captured) throw new Error("Missing production query");
      return (
        await db.query(
          "diagnostic",
          "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + captured.sql,
          captured.parameters,
        )
      ).rows[0]!["QUERY PLAN"];
    };
    const head = await query.history({
      userId: actor.id,
      watermark: null,
      at: null,
      id: null,
      limit: 21,
    });
    expect(head.rows).toHaveLength(21);
    const firstPlan = await explain();
    await query.history({
      userId: actor.id,
      watermark: head.watermark,
      at: "2025-01-01T00:10:00.000Z",
      id: randomUUID(),
      limit: 21,
    });
    const deepPlan = await explain();
    const nodes = (value: unknown): Record<string, unknown>[] => {
      if (!value || typeof value !== "object") return [];
      if (Array.isArray(value)) return value.flatMap(nodes);
      return [value as Record<string, unknown>, ...Object.values(value).flatMap(nodes)];
    };
    for (const plan of [firstPlan, deepPlan]) {
      expect(nodes(plan).some((n) => n["Index Name"] === "attempts_history")).toBe(true);
      const access = nodes(plan).filter((n) => n["Relation Name"] === "attempts");
      expect(access.some((n) => n["Node Type"] === "Seq Scan")).toBe(false);
    }
    await gradeReview(f.raw);
    const denied = await query.review({
      attemptId: f.attempt,
      userId: actor.id,
      position: null,
      limit: 21,
    });
    expect(denied.allowed).toBe(false);
    expect(denied.rows).toEqual([]);
    const deniedPlan = await explain();
    const keyNodes = nodes(deniedPlan).filter(
      (n) => n["Relation Name"] === "published_answer_keys",
    );
    expect(keyNodes.length).toBeGreaterThan(0);
    expect(keyNodes.every((n) => n["Actual Loops"] === 0)).toBe(true);
    if (process.env.RESULTS_EVIDENCE_FILE)
      await writeFile(
        process.env.RESULTS_EVIDENCE_FILE.replace("read-local.json", "plans-local.json"),
        JSON.stringify(
          {
            scope:
              "local natural plans, synthetic 100000 FAILED history rows; immutable key gate; not DB saturation",
            firstPlan,
            deepPlan,
            deniedPlan,
          },
          null,
          2,
        ),
      );
  }, 30000);
});

describe("Candidate section projections", () => {
  it("returns deterministic section totals/correct counts including unanswered questions", async () => {
    const f = await submittedForReview("AFTER_COMPLETION", false, candidateUser, true);
    await gradeReview(f.raw);
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const response = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/result`,
        headers: { cookie: session.cookie },
      });
      expect(response.statusCode).toBe(200);
      assertSchema(validateResult, response.json());
      expect(response.json().data.sections).toEqual([
        { sectionId: f.qs[0]!.sectionId, earned: 10, possible: 10, correct: 2, total: 2 },
        { sectionId: f.qs[2]!.sectionId, earned: 0, possible: 5, correct: 0, total: 1 },
      ]);
      const review = await http.inject({
        method: "GET",
        url: `/v1/attempts/${f.attempt}/review`,
        headers: { cookie: session.cookie },
      });
      expect(review.statusCode).toBe(200);
      assertSchema(validateReview, review.json());
      expect(review.json().data[2]).toMatchObject({
        question: { id: f.qs[2]!.id },
        selectedOptionIds: [],
        correct: false,
      });
    });
  });
});
