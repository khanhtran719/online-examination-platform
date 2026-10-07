import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv, { AnySchema, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { PostgresDatabase } from "../../src/infrastructure/database/transaction/postgres-database";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import { createHttpApplication } from "../../src/infrastructure/http/configure-http-application";
import { ShutdownGate } from "../../src/infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { CatalogService } from "../../src/modules/catalog/application/services/catalog.service";
import { ExamDraft } from "../../src/modules/catalog/domain/catalog-policy";
import { HmacCatalogCursor } from "../../src/modules/catalog/infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.repository";
import { CatalogController } from "../../src/modules/catalog/presentation/http/catalog.controller";
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

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `catalog_test_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const owner = `catalog_ddl_${suffix}`;
const runtime = `catalog_app_${suffix}`;
const operator = `catalog_ops_${suffix}`;
const url = new URL(adminUrl);
url.pathname = `/${name}`;
const runtimeUrl = new URL(url);
runtimeUrl.username = runtime;
runtimeUrl.password = password;
const ddlUrl = new URL(url);
ddlUrl.username = owner;
ddlUrl.password = password;
const opsUrl = new URL(url);
opsUrl.username = operator;
opsUrl.password = password;
const rateKey = randomBytes(32);
const csrfKey = randomBytes(32);
const originalPassword = "initial candidate password";
const finalPassword = "email owner final password";
const promptToken = "catalog-bank-prompt-token";

let fixture: Pool;
let ops: Pool;
let db: PostgresDatabase;
let identity: IdentityService;
let catalog: CatalogService;
let codec: VerificationCodec;
let adminUser: Actor;
let candidateUser: Actor;

interface Actor {
  id: string;
  email: string;
  raw: string;
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

function schedule(closeInMs = 3_600_000) {
  return {
    openAt: new Date(Date.now() - 60_000).toISOString(),
    closeAt: new Date(Date.now() + closeInMs).toISOString(),
  };
}

function importEntry(prompt: string, clientRef: string, correctOptionPositions = [1]) {
  const question = questionBody(prompt);
  return {
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    points: question.points,
    explanation: question.explanation,
    clientRef,
    correctOptionPositions,
  };
}

function questionBody(prompt = promptToken, points = 2, expectedRevision = 0) {
  return {
    type: "SINGLE_CHOICE" as const,
    prompt,
    options: [
      { position: 1, text: "A" },
      { position: 2, text: "B" },
    ],
    correctOptionPositions: [1],
    points,
    explanation: "kept as text",
    expectedRevision,
  };
}

function examBody(bankQuestionId: string, expectedRevision = 0, points = 5): ExamDraft {
  return {
    title: "Catalog draft",
    category: "IT_CERTIFICATION",
    durationSeconds: 90,
    ...schedule(),
    displayTimezone: "Asia/Ho_Chi_Minh",
    attemptLimit: 2,
    explanationPolicy: "NEVER",
    leaderboardEnabled: false,
    sections: [
      {
        title: "One",
        position: 1,
        questions: [{ bankQuestionId, position: 1, points }],
      },
    ],
    expectedRevision,
  };
}

async function registerAccount() {
  const email = `${randomUUID()}@example.test`;
  await identity.register({ email, displayName: "Candidate", password: originalPassword });
  const row = (
    await fixture.query(
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
  ).rows[0] as { id: string; user_id: string; ciphertext: string };
  return { email, id: row.user_id, token: await codec.open(row.ciphertext, row.id) };
}

async function activated() {
  const account = await registerAccount();
  await identity.confirm(account.token, finalPassword);
  return account;
}

async function promote(first: boolean): Promise<Actor> {
  const account = await activated();
  await ops.query(
    "SELECT identity.operator_admin($1, 'catalog-test', 'catalog local admin', $2, $3, true)",
    [account.id, randomUUID(), first],
  );
  const session = await identity.login(account.email, finalPassword);
  return { id: account.id, email: account.email, raw: session.access };
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtime} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${operator} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtime}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: url.toString(), max: 2 });
  ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
  const runtimeConfig = databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() });
  db = new PostgresDatabase(runtimeConfig);
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "local-test",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const jwt = await JwtSessionTokens.create("urn:test:catalog", key, [key]);
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
  adminUser = await promote(true);
  const candidate = await activated();
  candidateUser = {
    id: candidate.id,
    email: candidate.email,
    raw: (await identity.login(candidate.email, finalPassword)).access,
  };
});

afterAll(async () => {
  await db?.close();
  await fixture?.end();
  await ops?.end();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const running = (
      await admin.query(
        `
      SELECT
        count(*)::int n
      FROM
        pg_stat_activity
      WHERE
        datname = $1
      `,
        [name],
      )
    ).rows[0] as { n: number };
    if (Number(running.n) === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtime}, ${operator}`);
  await admin.end();
});

async function withHttp(use: (http: import("fastify").FastifyInstance) => Promise<void>) {
  const origin = "http://127.0.0.1:3000";
  const session = new HttpSession(identity, new PostgresSecurity(db, rateKey), origin, csrfKey);
  @Module({
    controllers: [CatalogController, IdentityController],
    providers: [
      { provide: CatalogService, useValue: catalog },
      { provide: IdentityService, useValue: identity },
      { provide: IDENTITY_ACCESS, useExisting: IdentityService },
      { provide: HTTP_SESSION, useValue: session },
      { provide: REQUEST_GUARD, useValue: session },
      ShutdownGate,
    ],
  })
  class ReviewHttpModule {}
  const api = await createHttpApplication(ReviewHttpModule);
  try {
    await use(api.app.getHttpAdapter().getInstance());
  } finally {
    await api.app.close();
  }
}
async function headers(http: import("fastify").FastifyInstance, email = adminUser.email) {
  const login = await identity.login(email, finalPassword);
  const csrf = await http.inject({
    method: "GET",
    url: "/v1/auth/csrf",
    headers: { cookie: `__Host-refresh=${login.refresh}` },
  });
  const cookie = csrf.cookies.find((c) => c.name === "__Host-csrf")!;
  return {
    origin: "http://127.0.0.1:3000",
    cookie: `__Host-access=${login.access}; __Host-refresh=${login.refresh}; __Host-csrf=${cookie.value}`,
    "x-csrf-token": csrf.json().data.csrfToken,
    "idempotency-key": uuidv7(),
  };
}

const bankIds: string[] = [];
let validateDetail: ValidateFunction;
let validateBrowse: ValidateFunction;
beforeAll(async () => {
  const api = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validateDetail = ajv.compile(api.components.schemas.ExamEnvelope!);
  validateBrowse = ajv.compile(api.components.schemas.ExamListEnvelope!);
  for (let batch = 0; batch < 5; batch += 1) {
    const imported = await catalog.importQuestions(
      adminUser.raw,
      uuidv7(),
      {
        schemaVersion: 1,
        dryRun: false,
        questions: Array.from({ length: 100 }, (_, i) =>
          importEntry(`HTTP boundary ${batch}-${i}`, `q${i}`),
        ),
      },
      randomUUID(),
    );
    bankIds.push(...imported.body.questions.map((q) => q.questionId));
  }
});

function fullQuestion(character = "漢") {
  return {
    ...questionBody(character.repeat(8000)),
    explanation: character.repeat(8000),
    options: Array.from({ length: 10 }, (_, index) => ({
      position: index + 1,
      text: character.repeat(2000),
    })),
  };
}
function escapedJson(value: unknown) {
  return JSON.stringify(value).replaceAll("漢", "\\u6f22").replaceAll("😀", "\\ud83d\\ude00");
}

describe("Catalog HTTP declared boundaries on restricted PostgreSQL", () => {
  it.each(["漢", "😀"])(
    "creates and replaces maximum-length %s question text in UTF-8 and escaped JSON",
    async (character) => {
      await withHttp(async (http) => {
        const body = fullQuestion(character);
        const payload = escapedJson(body);
        expect(Buffer.byteLength(payload)).toBeGreaterThan(200_000);
        const created = await http.inject({
          method: "POST",
          url: "/v1/admin/questions",
          headers: { ...(await headers(http)), "content-type": "application/json" },
          payload,
        });
        expect(created.statusCode).toBe(201);
        const id = created.json().data.resourceId;
        const replaced = await http.inject({
          method: "PUT",
          url: `/v1/admin/questions/${id}`,
          headers: { ...(await headers(http)), "content-type": "application/json" },
          payload: { ...body, expectedRevision: 1 },
        });
        expect(replaced.statusCode).toBe(200);
        expect(replaced.json().data.revision).toBe(2);
        const stored = await catalog.question(adminUser.raw, id, randomUUID());
        expect(stored.prompt).toBe(body.prompt);
        expect(stored.explanation).toBe(body.explanation);
        expect(stored.options.map((option) => option.text)).toEqual(
          body.options.map((option) => option.text),
        );
      });
    },
  );

  it.each(["漢", "😀"])(
    "creates and replaces all 500 memberships across 20 sections with full %s titles",
    async (character) => {
      await withHttp(async (http) => {
        const body = {
          ...examBody(bankIds[0]!),
          title: character.repeat(200),
          sections: Array.from({ length: 20 }, (_, index) => ({
            title: character.repeat(200),
            position: index + 1,
            questions: bankIds
              .slice(index * 25, (index + 1) * 25)
              .map((bankQuestionId, position) => ({
                bankQuestionId,
                position: position + 1,
                points: 1000,
              })),
          })),
        };
        const payload = escapedJson(body);
        expect(Buffer.byteLength(payload)).toBeGreaterThan(60_000);
        const created = await http.inject({
          method: "POST",
          url: "/v1/admin/exams",
          headers: { ...(await headers(http)), "content-type": "application/json" },
          payload,
        });
        expect(created.statusCode).toBe(201);
        const id = created.json().data.resourceId;
        const replaced = await http.inject({
          method: "PUT",
          url: `/v1/admin/exams/${id}`,
          headers: { ...(await headers(http)), "content-type": "application/json" },
          payload: escapedJson({
            ...body,
            sections: [...body.sections].reverse(),
            expectedRevision: 1,
          }),
        });
        expect(replaced.statusCode).toBe(200);
        const stored = await catalog.adminExam(id);
        expect(stored.revision).toBe(2);
        expect(stored.sections.map((section) => section.position)).toEqual(
          Array.from({ length: 20 }, (_, index) => index + 1),
        );
        expect(stored.sections.flatMap((section) => section.questions)).toHaveLength(500);
      });
    },
  );

  it.each([
    { method: "POST" as const, url: "/v1/admin/questions", limit: 512 * 1024 },
    { method: "PUT" as const, url: `/v1/admin/questions/${randomUUID()}`, limit: 512 * 1024 },
    { method: "POST" as const, url: "/v1/admin/exams", limit: 128 * 1024 },
    { method: "PUT" as const, url: `/v1/admin/exams/${randomUUID()}`, limit: 128 * 1024 },
    { method: "POST" as const, url: "/v1/admin/question-imports", limit: 1024 * 1024 },
    { method: "POST" as const, url: "/v1/auth/register", limit: 16384 },
  ])("rejects $method $url above its bounded byte limit", async ({ method, url, limit }) => {
    await withHttp(async (http) => {
      const response = await http.inject({
        method,
        url,
        headers: { ...(await headers(http)), "content-type": "application/json" },
        payload: `{${" ".repeat(limit)}}`,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        data: null,
        errorCode: "Invalid request",
        message: "Invalid request",
        status: false,
      });
    });
  });

  it("returns browse and detail envelopes accepted by the exact OpenAPI schemas", async () => {
    const exam = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(bankIds[0]!),
      randomUUID(),
    );
    await catalog.publish(adminUser.raw, uuidv7(), exam.body.resourceId, 1, randomUUID());
    await withHttp(async (http) => {
      const detail = await http.inject({
        method: "GET",
        url: `/v1/exams/${exam.body.resourceId}`,
        headers: { cookie: `__Host-access=${candidateUser.raw}` },
      });
      expect(detail.statusCode).toBe(200);
      expect(validateDetail(detail.json())).toBe(true);
      const browse = await http.inject({
        method: "GET",
        url: "/v1/exams?pageSize=20",
        headers: { cookie: `__Host-access=${candidateUser.raw}` },
      });
      expect(browse.statusCode).toBe(200);
      expect(validateBrowse(browse.json())).toBe(true);
      expect(JSON.stringify(detail.json())).not.toContain("correctOption");
    });
  });

  it("rejects impossible calendar dates on create and replace without changing the stored draft", async () => {
    const body = examBody(bankIds[0]!);
    const created = await catalog.createExam(adminUser.raw, uuidv7(), body, randomUUID());
    const before = await catalog.adminExam(created.body.resourceId);
    await withHttp(async (http) => {
      for (const method of ["POST", "PUT"] as const) {
        const response = await http.inject({
          method,
          url: method === "POST" ? "/v1/admin/exams" : `/v1/admin/exams/${created.body.resourceId}`,
          headers: await headers(http),
          payload: {
            ...body,
            openAt: "2027-02-30T10:00:00.000Z",
            closeAt: "2027-03-10T10:00:00.000Z",
            expectedRevision: method === "POST" ? 0 : 1,
          },
        });
        expect(response.statusCode).toBe(400);
      }
    });
    expect(await catalog.adminExam(created.body.resourceId)).toEqual(before);
  });

  it("keeps authentication, permissions and CSRF mandatory for enlarged bodies", async () => {
    await withHttp(async (http) => {
      const body = fullQuestion();
      const denied = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers: await headers(http, candidateUser.email),
        payload: body,
      });
      expect(denied.statusCode).toBe(403);
      const withoutCsrf = { ...(await headers(http)) };
      Reflect.deleteProperty(withoutCsrf, "x-csrf-token");
      const csrfDenied = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers: withoutCsrf,
        payload: body,
      });
      expect(csrfDenied.statusCode).toBe(403);
      const publicCsrf = await http.inject({ method: "GET", url: "/v1/auth/csrf" });
      const csrfCookie = publicCsrf.cookies.find((cookie) => cookie.name === "__Host-csrf")!;
      const unauthenticated = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers: {
          origin: "http://127.0.0.1:3000",
          cookie: `__Host-csrf=${csrfCookie.value}`,
          "x-csrf-token": publicCsrf.json().data.csrfToken,
        },
        payload: body,
      });
      expect(unauthenticated.statusCode).toBe(401);
    });
  });
});
