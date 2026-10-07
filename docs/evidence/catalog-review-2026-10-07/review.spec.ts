import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { databaseConfig } from "../../../apps/api/src/config/database.config";
import { PostgresDatabase } from "../../../apps/api/src/infrastructure/database/transaction/postgres-database";
import {
  loadMigrations,
  migrate,
} from "../../../apps/api/src/infrastructure/database/migration-runner";
import { createHttpApplication } from "../../../apps/api/src/infrastructure/http/configure-http-application";
import { ShutdownGate } from "../../../apps/api/src/infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresIdempotency } from "../../../apps/api/src/infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../../apps/api/src/infrastructure/security/authorization/postgres-security";
import { CatalogService } from "../../../apps/api/src/modules/catalog/application/services/catalog.service";
import { ExamDraft } from "../../../apps/api/src/modules/catalog/domain/catalog-policy";
import { HmacCatalogCursor } from "../../../apps/api/src/modules/catalog/infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "../../../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "../../../apps/api/src/modules/catalog/infrastructure/persistence/postgres-catalog.repository";
import { CatalogController } from "../../../apps/api/src/modules/catalog/presentation/http/catalog.controller";
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

async function scalar(sql: string, params: unknown[] = []): Promise<number> {
  const row = (await fixture.query(sql, params)).rows[0] as { n: number };
  return Number(row.n);
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

const reviewResults: object[] = [];
afterAll(async () => {
  await writeFile(
    "docs/evidence/catalog-review-2026-10-07/probes.json",
    JSON.stringify(reviewResults, null, 2) + "\n",
  );
});

async function withHttp(use: (http: ReturnType<typeof apiHttp>) => Promise<void>) {
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
function apiHttp() {
  return {} as import("fastify").FastifyInstance;
}

async function headers(http: import("fastify").FastifyInstance) {
  const login = await identity.login(adminUser.email, finalPassword);
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

describe("Independent Catalog review on restricted PostgreSQL", () => {
  it("does not publish a draft that closes while waiting for its lock", async () => {
    const q = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("lock-time probe"),
      randomUUID(),
    );
    const body = { ...examBody(q.body.resourceId), ...schedule(250) };
    const draft = await catalog.createExam(adminUser.raw, uuidv7(), body, randomUUID());
    const holder = await fixture.connect();
    await holder.query("BEGIN");
    await holder.query(
      `
      SELECT
        id
      FROM
        catalog.exams
      WHERE
        id = $1
      FOR UPDATE
      `,
      [draft.body.resourceId],
    );
    const outcome = catalog
      .publish(adminUser.raw, uuidv7(), draft.body.resourceId, 1, randomUUID())
      .then(
        (value) => ({ value, error: null }),
        (error) => ({ value: null, error: String(error) }),
      );
    try {
      let blocked = false;
      for (let i = 0; i < 200; i++) {
        blocked = (
          await fixture.query(
            `
          SELECT
            EXISTS(
              SELECT
                1
              FROM
                pg_stat_activity
              WHERE
                datname = $1
                AND usename = $2
                AND wait_event_type = 'Lock'
            ) AS blocked
          `,
            [name, runtime],
          )
        ).rows[0].blocked;
        if (blocked) break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      expect(blocked).toBe(true);
      for (let i = 0; i < 300; i++) {
        const expired = (
          await fixture.query("SELECT clock_timestamp()>=$1::timestamptz AS expired", [
            body.closeAt,
          ])
        ).rows[0].expired;
        if (expired) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await holder.query("COMMIT");
      const result = await outcome;
      const late = await scalar(
        `
        SELECT
          count(*)::int n
        FROM
          catalog.published_versions
        WHERE
          exam_id = $1
          AND published_at >= closes_at
        `,
        [draft.body.resourceId],
      );
      reviewResults.push({
        case: "R01 post-lock publish clock",
        expected: "Exam is closed / no version",
        actualError: result.error,
        committedLateVersions: late,
      });
      expect(result).toMatchObject({ error: expect.stringContaining("Exam is closed") });
      expect(late).toBe(0);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
      await outcome;
    }
  });

  it("accepts a question body within every declared field limit", async () => {
    await withHttp(async (http) => {
      const body = {
        ...questionBody("P".repeat(8000)),
        explanation: "E".repeat(8000),
        options: Array.from({ length: 10 }, (_, index) => ({
          position: index + 1,
          text: "O".repeat(2000),
        })),
      };
      const response = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers: await headers(http),
        payload: body,
      });
      reviewResults.push({
        case: "R02 valid large question",
        bodyBytes: Buffer.byteLength(JSON.stringify(body)),
        expectedStatus: 201,
        actualStatus: response.statusCode,
        errorCode: response.json().errorCode,
      });
      expect(response.statusCode).toBe(201);
    });
  });

  it("accepts a complete 500-question draft through its declared HTTP contract", async () => {
    const ids: string[] = [];
    for (let batch = 0; batch < 5; batch++) {
      const imported = await catalog.importQuestions(
        adminUser.raw,
        uuidv7(),
        {
          schemaVersion: 1,
          dryRun: false,
          questions: Array.from({ length: 100 }, (_, i) =>
            importEntry(`bounded ${batch}-${i}`, `q${i}`),
          ),
        },
        randomUUID(),
      );
      ids.push(...imported.body.questions.map((q) => q.questionId));
    }
    await withHttp(async (http) => {
      const body = {
        ...examBody(ids[0]!),
        sections: [
          {
            title: "All 500",
            position: 1,
            questions: ids.map((bankQuestionId, index) => ({
              bankQuestionId,
              position: index + 1,
              points: 1,
            })),
          },
        ],
      };
      const response = await http.inject({
        method: "POST",
        url: "/v1/admin/exams",
        headers: await headers(http),
        payload: body,
      });
      reviewResults.push({
        case: "R03 valid 500-question draft",
        bodyBytes: Buffer.byteLength(JSON.stringify(body)),
        questionCount: ids.length,
        expectedStatus: 201,
        actualStatus: response.statusCode,
        errorCode: response.json().errorCode,
      });
      expect(response.statusCode).toBe(201);
    });
  });

  it("returns only the Exam fields allowed by the detail response schema", async () => {
    const q = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("detail schema"),
      randomUUID(),
    );
    const e = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(q.body.resourceId),
      randomUUID(),
    );
    await catalog.publish(adminUser.raw, uuidv7(), e.body.resourceId, 1, randomUUID());
    await withHttp(async (http) => {
      const response = await http.inject({
        method: "GET",
        url: `/v1/exams/${e.body.resourceId}`,
        headers: { cookie: `__Host-access=${candidateUser.raw}` },
      });
      const data = response.json().data;
      const allowed = [
        "id",
        "title",
        "category",
        "publishedVersionId",
        "version",
        "durationSeconds",
        "openAt",
        "closeAt",
        "displayTimezone",
        "attemptLimit",
        "questionCount",
        "scoringPolicy",
        "explanationPolicy",
        "leaderboardEnabled",
        "sections",
      ];
      const extras = Object.keys(data).filter((key) => !allowed.includes(key));
      reviewResults.push({
        case: "R04 detail additionalProperties",
        actualStatus: response.statusCode,
        extraFields: extras,
      });
      expect(response.statusCode).toBe(200);
      expect(extras).toEqual([]);
    });
  });

  it("rejects impossible calendar dates instead of normalizing a draft schedule", async () => {
    const q = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("date shape"),
      randomUUID(),
    );
    await withHttp(async (http) => {
      const body = {
        ...examBody(q.body.resourceId),
        openAt: "2027-02-30T10:00:00.000Z",
        closeAt: "2027-03-10T10:00:00.000Z",
      };
      const response = await http.inject({
        method: "POST",
        url: "/v1/admin/exams",
        headers: await headers(http),
        payload: body,
      });
      const stored =
        response.statusCode === 201
          ? (await catalog.adminExam(response.json().data.resourceId)).openAt
          : null;
      reviewResults.push({
        case: "R05 invalid calendar date",
        expectedStatus: 400,
        actualStatus: response.statusCode,
        inputOpenAt: body.openAt,
        storedOpenAt: stored,
      });
      expect(response.statusCode).toBe(400);
    });
  });

  it("retains all bank rows through keyset pagination of bulk imports", async () => {
    const total = await scalar(
      `
      SELECT
        count(*)::int n
      FROM
        catalog.questions
      WHERE
        archived_at IS NULL
      `,
    );
    const ids = new Set<string>();
    let cursor: string | undefined;
    for (let i = 0; i < 100; i++) {
      const page = await catalog.questions(
        adminUser.raw,
        adminUser.id,
        { pageSize: 20, cursor },
        randomUUID(),
      );
      for (const q of page.items) ids.add(q.id);
      if (!page.metadata.next) break;
      cursor = page.metadata.next;
    }
    reviewResults.push({
      case: "C01 bank timestamp precision control",
      expectedRows: total,
      seenRows: ids.size,
    });
    expect(ids.size).toBe(total);
  });
});
