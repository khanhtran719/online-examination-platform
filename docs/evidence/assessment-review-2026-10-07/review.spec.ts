import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Module } from "@nestjs/common";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Pool, type QueryResultRow } from "pg";
import { databaseConfig } from "../../../apps/api/src/config/database.config";
import {
  loadMigrations,
  migrate,
} from "../../../apps/api/src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  type DatabaseObservation,
  type DatabaseOperation,
} from "../../../apps/api/src/infrastructure/database/transaction/postgres-database";
import { createHttpApplication } from "../../../apps/api/src/infrastructure/http/configure-http-application";
import { PostgresIdempotency } from "../../../apps/api/src/infrastructure/idempotency/postgres-idempotency";
import { ShutdownGate } from "../../../apps/api/src/infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresSecurity } from "../../../apps/api/src/infrastructure/security/authorization/postgres-security";
import { AssessmentService } from "../../../apps/api/src/modules/assessment/application/services/assessment.service";
import { HmacAssessmentCursor } from "../../../apps/api/src/modules/assessment/infrastructure/cursor/assessment-cursor";
import { PostgresAttemptQuery } from "../../../apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.query";
import { PostgresAttemptRepository } from "../../../apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "../../../apps/api/src/modules/assessment/infrastructure/persistence/postgres-submission-outbox";
import { AssessmentController } from "../../../apps/api/src/modules/assessment/presentation/http/assessment.controller";
import { CatalogService } from "../../../apps/api/src/modules/catalog/application/services/catalog.service";
import {
  type QuestionDraft,
  type QuestionType,
} from "../../../apps/api/src/modules/catalog/domain/catalog-policy";
import { HmacCatalogCursor } from "../../../apps/api/src/modules/catalog/infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "../../../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "../../../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.repository";
import {
  IDENTITY_ACCESS,
  REQUEST_GUARD,
} from "../../../apps/api/src/modules/identity/application/facades/identity.facade";
import { IdentityService } from "../../../apps/api/src/modules/identity/application/services/identity.service";
import { HttpSession } from "../../../apps/api/src/modules/identity/infrastructure/http/http-session";
import { PostgresIdentityQuery } from "../../../apps/api/src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";
import { PostgresIdentityRepository } from "../../../apps/api/src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../../apps/api/src/modules/identity/infrastructure/security/identity-crypto";
import { IdentityController } from "../../../apps/api/src/modules/identity/presentation/http/identity.controller";
import { HTTP_SESSION } from "../../../apps/api/src/modules/identity/presentation/http/http-session.port";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `assessment_test_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const owner = `assessment_ddl_${suffix}`;
const runtimeRole = `assessment_app_${suffix}`;
const operator = `assessment_ops_${suffix}`;
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
      explanationPolicy: "NEVER",
      leaderboardEnabled: false,
      expectedRevision: 0,
      sections: [
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
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtimeRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${operator} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtimeRole}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: url.toString(), max: 2 });
  ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
  const runtimeConfig = databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() });
  db = new PostgresDatabase(runtimeConfig, (value) => observations.push(value));
  db2 = new PostgresDatabase(runtimeConfig);
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

const probes: Record<string, unknown> = {};

afterAll(async () => {
  await writeFile(
    "docs/evidence/assessment-review-2026-10-07/probes.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        scope: "independent real PostgreSQL and HTTP review",
        probes,
      },
      null,
      2,
    ) + "\n",
  );
  await unblockOutbox().catch(() => undefined);
  await db?.close();
  await db2?.close();
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
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${operator}`);
  await admin.end();
});

// Independent assertions. Setup above reuses the existing restricted-PG fixture,
// but the second Assessment instance uses Identity bound to its own UnitOfWork.
function writeHeaders(session: LiveSession, key: string) {
  return {
    origin: session.origin,
    cookie: session.cookie,
    "x-csrf-token": session["x-csrf-token"],
    "idempotency-key": key,
  };
}

async function publishedVersion(examId: string): Promise<string> {
  return text("SELECT current_version_id::text AS value FROM catalog.exams WHERE id = $1", [
    examId,
  ]);
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
          "SELECT count(*)::int AS n FROM assessment.attempts WHERE exam_id = $1",
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

describe("Independent Assessment API review", () => {
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
      probes.optionSetRetry = {
        firstStatus: first.statusCode,
        retryStatus: second.statusCode,
        replayed: second.headers["idempotency-replayed"] === "true",
        error: second.json().errorCode,
        receipts: await scalar(
          "SELECT count(*)::int AS n FROM platform.idempotency_receipts WHERE actor_id = $1 AND key = $2",
          [candidateUser.id, key],
        ),
        storedAnswerVersion: await scalar(
          "SELECT version AS n FROM assessment.answers WHERE attempt_id = $1",
          [attempt.body.id],
        ),
      };
      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(second.headers["idempotency-replayed"]).toBe("true");
      expect(second.json()).toEqual(first.json());
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
      const body = response.json() as { data: { id: string }[]; metadata: { next: string | null } };
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
      probes.questionBytes = {
        status: response.statusCode,
        decodedBytes: bytes,
        cap: 262144,
        itemsBytes: Buffer.byteLength(JSON.stringify(body.data), "utf8"),
        firstItems: body.data.length,
        nextItems: next?.json().data.length ?? 0,
        noSkippedOrRepeatedItems: allIds.length === 11 && new Set(allIds).size === 11,
        nextCursorPresent: cursor !== null,
      };
      expect(response.statusCode).toBe(200);
      expect(allIds.length).toBe(11);
      expect(new Set(allIds).size).toBe(11);
      expect(bytes).toBeLessThanOrEqual(262144);
    });
  });

  it("AR-03 starts with the version committed by an observed first-publication lock", async () => {
    const result = await publicationRace(true);
    probes.firstPublicationRace = result;
    expect(result.waiting).toBe(true);
    expect(result.status).toBe(201);
    expect(result.matchesCurrentVersion).toBe(true);
  });

  it("AR-03 starts with the version committed by an observed republish lock", async () => {
    const result = await publicationRace(false);
    probes.republicationRace = result;
    expect(result.waiting).toBe(true);
    expect(result.status).toBe(201);
    expect(result.matchesCurrentVersion).toBe(true);
  });

  it("AR-04 accepts the UUID spelling allowed by the HTTP validator", async () => {
    const bankId = await bankQuestion(choiceDraft("SINGLE_CHOICE", "UUID spelling", 2, [1]));
    const exam = await publishExam([{ bankQuestionId: bankId }]);
    const attempt = await assessment.start(candidateUser.raw, uuidv7(), exam.examId);
    const q = (await assessment.questions(candidateUser.id, attempt.body.id, 20, null)).items[0]!;
    await withHttp(async (http) => {
      const session = await openSession(http, candidateUser.email);
      const response = await http.inject({
        method: "PUT",
        url: `/v1/attempts/${attempt.body.id}/answers`,
        headers: writeHeaders(session, uuidv7()),
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
      probes.uuidSpelling = {
        status: response.statusCode,
        error: response.json().errorCode,
        acceptedByUuidRegex: /^[0-9a-f-]+$/i.test(q.id.toUpperCase()),
        storedAnswers: await scalar(
          "SELECT count(*)::int AS n FROM assessment.answers WHERE attempt_id = $1",
          [attempt.body.id],
        ),
      };
      expect(response.statusCode).toBe(200);
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
    probes.concurrentSaves = {
      accepted: outcomes.filter((o) => o.status === "fulfilled").length,
      rejected: outcomes.filter((o) => o.status === "rejected").length,
      rejection: rejected?.reason.message ?? null,
      attemptRevision: view.revision,
      answerVersion: await scalar(
        "SELECT version AS n FROM assessment.answers WHERE attempt_id = $1",
        [attempt.body.id],
      ),
    };
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(rejected?.reason.message).toBe("Revision conflict");
    expect(view.revision).toBe(2);
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
    probes.duplicateSubmit = {
      sameAcceptance: JSON.stringify(duplicate.body) === JSON.stringify(submitted.body),
      outboxRows: await scalar(
        "SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1",
        [attempt.body.id],
      ),
      duplicateKeyReceipts: await scalar(
        "SELECT count(*)::int AS n FROM platform.idempotency_receipts WHERE actor_id = $1 AND key = $2",
        [candidateUser.id, duplicateKey],
      ),
    };
    expect(duplicate.body).toEqual(submitted.body);
    expect(
      await scalar("SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1", [
        attempt.body.id,
      ]),
    ).toBe(1);
  });

  it("control preserves every acknowledged save in an observed save/submit race", async () => {
    const results = [];
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
        await held.query("SELECT id FROM assessment.attempts WHERE id = $1 FOR UPDATE", [
          attempt.body.id,
        ]);
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
        "SELECT count(*)::int AS n FROM assessment.answers WHERE attempt_id = $1",
        [attempt.body.id],
      );
      const outboxRows = await scalar(
        "SELECT count(*)::int AS n FROM platform.outbox WHERE aggregate_id = $1",
        [attempt.body.id],
      );
      const current = await assessment.resume(candidateUser.id, attempt.body.id);
      results.push({
        waiting,
        saveAccepted: saved.status === "fulfilled",
        submitAccepted: submitted.status === "fulfilled",
        answerRows,
        outboxRows,
        status: current.status,
      });
      expect(waiting).toBe(true);
      expect(submitted.status).toBe("fulfilled");
      expect(answerRows).toBe(saved.status === "fulfilled" ? 1 : 0);
      if (saved.status === "rejected") expect(saved.reason.message).toBe("Attempt is closed");
      expect(outboxRows).toBe(1);
      expect(current.status).toBe("SUBMITTED");
    }
    probes.saveSubmitRaces = results;
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
      probes.queryBudgets = {
        start: { actual: startCount, ceiling: 12 },
        save: { actual: saveCount, ceiling: 11 },
        submit: { actual: submitCount, ceiling: 10 },
        saveStatus: saved.statusCode,
        submitStatus: submitted.statusCode,
      };
      expect(saved.statusCode).toBe(200);
      expect(submitted.statusCode).toBe(202);
      expect(startCount).toBeLessThanOrEqual(12);
      expect(saveCount).toBeLessThanOrEqual(11);
      expect(submitCount).toBeLessThanOrEqual(10);
    });
  });
});
