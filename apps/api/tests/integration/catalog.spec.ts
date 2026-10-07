import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { Module } from "@nestjs/common";
import { Pool, QueryResultRow } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import {
  PostgresDatabase,
  DatabaseObservation,
  DatabaseOperation,
} from "../../src/infrastructure/database/transaction/postgres-database";
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
  RequestGuard,
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
const observations: DatabaseObservation[] = [];
const originalPassword = "initial candidate password";
const finalPassword = "email owner final password";
const promptToken = "catalog-bank-prompt-token";
const markup = "<script>alert(1)</script>";

let fixture: Pool;
let ops: Pool;
let db: PostgresDatabase;
let db2: PostgresDatabase;
let identity: IdentityService;
let secondIdentity: IdentityService;
let catalog: CatalogService;
let other: CatalogService;
let repo: PostgresCatalogRepository;
let codec: VerificationCodec;
let adminUser: Actor;
let otherUser: Actor;
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
  db = new PostgresDatabase(runtimeConfig, (value) => observations.push(value));
  db2 = new PostgresDatabase(runtimeConfig);
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
  secondIdentity = makeIdentity(db2);
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
  repo = new PostgresCatalogRepository(db);
  catalog = makeCatalog(db, identity);
  other = makeCatalog(db2, secondIdentity);
  adminUser = await promote(true);
  otherUser = await promote(false);
  const candidate = await activated();
  candidateUser = {
    id: candidate.id,
    email: candidate.email,
    raw: (await identity.login(candidate.email, finalPassword)).access,
  };
});

afterAll(async () => {
  await db?.close();
  await db2?.close();
  await fixture?.end();
  await ops?.end();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const running = (
      await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname = $1", [name])
    ).rows[0] as { n: number };
    if (Number(running.n) === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtime}, ${operator}`);
  await admin.end();
});

describe("Catalog on real restricted PostgreSQL", () => {
  it("creates and replays questions without losing an acknowledgement or overwriting a conflict", async () => {
    const key = uuidv7();
    const created = await catalog.createQuestion(adminUser.raw, key, questionBody(), randomUUID());
    expect(created.httpStatus).toBe(201);
    expect(created.body.revision).toBe(1);
    const replay = await catalog.createQuestion(adminUser.raw, key, questionBody(), randomUUID());
    expect(replay).toEqual({ ...created, replayed: true });
    expect(
      await scalar("SELECT count(*)::int n FROM catalog.questions WHERE id = $1", [
        created.body.resourceId,
      ]),
    ).toBe(1);
    expect(
      await scalar(
        "SELECT count(*)::int n FROM platform.idempotency_receipts WHERE actor_id = $1 AND key = $2",
        [adminUser.id, key],
      ),
    ).toBe(1);
    await expect(
      catalog.createQuestion(adminUser.raw, key, questionBody("other prompt"), randomUUID()),
    ).rejects.toThrow("Idempotency key conflict");
    const raced = uuidv7();
    const pair = await Promise.all([
      catalog.createQuestion(adminUser.raw, raced, questionBody("race"), randomUUID()),
      catalog.createQuestion(adminUser.raw, raced, questionBody("race"), randomUUID()),
    ]);
    expect(pair[0].body.resourceId).toBe(pair[1].body.resourceId);
    expect(
      await scalar("SELECT count(*)::int n FROM catalog.questions WHERE id = $1", [
        pair[0].body.resourceId,
      ]),
    ).toBe(1);
    await expect(
      catalog.replaceQuestion(
        adminUser.raw,
        uuidv7(),
        created.body.resourceId,
        questionBody(promptToken, 2, 0),
        randomUUID(),
      ),
    ).rejects.toThrow("Invalid request");
    const replaced = await catalog.replaceQuestion(
      adminUser.raw,
      uuidv7(),
      created.body.resourceId,
      questionBody("replaced prompt", 3, 1),
      randomUUID(),
    );
    expect(replaced.body.revision).toBe(2);
    const staleKey = uuidv7();
    const stale = await catalog.replaceQuestion(
      adminUser.raw,
      staleKey,
      created.body.resourceId,
      questionBody("stale retry", 4, 2),
      randomUUID(),
    );
    const lostAck = await catalog.replaceQuestion(
      adminUser.raw,
      staleKey,
      created.body.resourceId,
      questionBody("stale retry", 4, 2),
      randomUUID(),
    );
    expect(lostAck.body).toEqual(stale.body);
    expect(lostAck.replayed).toBe(true);
    await expect(
      catalog.replaceQuestion(
        adminUser.raw,
        uuidv7(),
        created.body.resourceId,
        questionBody("conflict", 4, 2),
        randomUUID(),
      ),
    ).rejects.toThrow("Revision conflict");
    expect(
      await scalar("SELECT revision::int n FROM catalog.questions WHERE id = $1", [
        created.body.resourceId,
      ]),
    ).toBe(3);
  });

  it("rolls back the question when the audit write fails", async () => {
    await fixture.query(`
      CREATE FUNCTION platform.fail_catalog_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'catalog.question.create' THEN
          RAISE EXCEPTION 'audit failed';
        END IF;
        RETURN NEW;
      END $$
    `);
    await fixture.query(
      "CREATE TRIGGER fixture_catalog_audit BEFORE INSERT ON platform.audit_logs FOR EACH ROW EXECUTE FUNCTION platform.fail_catalog_audit()",
    );
    const before = await scalar("SELECT count(*)::int n FROM catalog.questions");
    try {
      await expect(
        catalog.createQuestion(
          adminUser.raw,
          uuidv7(),
          questionBody("audit rollback"),
          randomUUID(),
        ),
      ).rejects.toThrow();
      expect(await scalar("SELECT count(*)::int n FROM catalog.questions")).toBe(before);
      expect(
        await scalar(
          "SELECT count(*)::int n FROM catalog.questions WHERE prompt = 'audit rollback'",
        ),
      ).toBe(0);
      expect(
        await scalar(
          "SELECT count(*)::int n FROM platform.idempotency_receipts WHERE operation = 'catalog.question.create' AND resource_id IS NULL",
        ),
      ).toBe(0);
    } finally {
      await fixture.query("DROP TRIGGER fixture_catalog_audit ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.fail_catalog_audit()");
    }
  });

  it("archives questions without removing references and rejects a later draft attachment", async () => {
    const created = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("archive me"),
      randomUUID(),
    );
    const exam = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(created.body.resourceId),
      randomUUID(),
    );
    const archived = await catalog.archiveQuestion(
      adminUser.raw,
      uuidv7(),
      created.body.resourceId,
      1,
      randomUUID(),
    );
    expect(archived.body.revision).toBe(2);
    expect(
      await scalar(
        "SELECT count(*)::int n FROM catalog.questions WHERE id = $1 AND archived_at IS NOT NULL",
        [created.body.resourceId],
      ),
    ).toBe(1);
    expect(
      await scalar("SELECT count(*)::int n FROM catalog.exam_questions WHERE question_id = $1", [
        created.body.resourceId,
      ]),
    ).toBe(1);
    await expect(
      catalog.createExam(adminUser.raw, uuidv7(), examBody(created.body.resourceId), randomUUID()),
    ).rejects.toThrow("Question is archived");
    const stored = await catalog.adminExam(exam.body.resourceId);
    expect(stored.sections[0]?.questions[0]?.bankQuestionId).toBe(created.body.resourceId);
    await expect(
      catalog.archiveQuestion(adminUser.raw, uuidv7(), created.body.resourceId, 2, randomUUID()),
    ).rejects.toThrow("Question is archived");
  });

  it("publishes an immutable version and keeps it across bank edits, unpublish and republish", async () => {
    const created = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody(promptToken, 2),
      randomUUID(),
    );
    const draft = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(created.body.resourceId),
      randomUUID(),
    );
    await expect(
      catalog.publish(adminUser.raw, uuidv7(), draft.body.resourceId, 1, randomUUID()),
    ).resolves.toMatchObject({
      body: { revision: 2 },
    });
    const policy = await catalog.getPublishedPolicy(draft.body.resourceId);
    expect(policy?.version).toBe(1);
    expect(policy?.questionCount).toBe(1);
    expect(policy?.sections[0]?.possible).toBe(5);
    expect(JSON.stringify(policy)).not.toContain(promptToken);
    const frozen = await catalog.getFrozenQuestionPage(policy!.publishedVersionId, null, 20);
    expect(frozen.items[0]?.prompt).toBe(promptToken);
    expect(JSON.stringify(frozen)).not.toContain("correctOption");
    const scoring = await catalog.getScoringSnapshot(policy!.publishedVersionId);
    expect(scoring[0]?.correctOptionIds).toHaveLength(1);
    expect(JSON.stringify(scoring)).not.toContain(promptToken);
    await catalog.replaceQuestion(
      adminUser.raw,
      uuidv7(),
      created.body.resourceId,
      questionBody("edited after publish", 9, 1),
      randomUUID(),
    );
    const still = await catalog.getFrozenQuestionPage(policy!.publishedVersionId, null, 20);
    expect(still.items[0]?.prompt).toBe(promptToken);
    expect(still.items[0]?.points).toBe(5);
    await catalog.unpublish(adminUser.raw, uuidv7(), draft.body.resourceId, 2, randomUUID());
    expect(await catalog.getPublishedPolicy(draft.body.resourceId)).toBeNull();
    expect(
      (await catalog.getFrozenQuestionPage(policy!.publishedVersionId, null, 20)).items,
    ).toHaveLength(1);
    await expect(
      catalog.unpublish(adminUser.raw, uuidv7(), draft.body.resourceId, 3, randomUUID()),
    ).rejects.toThrow("Exam is not published");
    const again = await catalog.publish(
      adminUser.raw,
      uuidv7(),
      draft.body.resourceId,
      3,
      randomUUID(),
    );
    const next = await catalog.getPublishedPolicy(draft.body.resourceId);
    expect(again.body.revision).toBe(4);
    expect(next?.version).toBe(2);
    expect(next?.publishedVersionId).not.toBe(policy?.publishedVersionId);
    expect(
      (await catalog.getFrozenQuestionPage(next!.publishedVersionId, null, 20)).items[0]?.prompt,
    ).toBe("edited after publish");
    expect(
      (await catalog.getFrozenQuestionPage(policy!.publishedVersionId, null, 20)).items[0]?.prompt,
    ).toBe(promptToken);
    await catalog.archiveExam(adminUser.raw, uuidv7(), draft.body.resourceId, 4, randomUUID());
    expect(await catalog.getPublishedPolicy(draft.body.resourceId)).toBeNull();
    expect(
      await scalar("SELECT count(*)::int n FROM catalog.published_versions WHERE id = $1", [
        policy!.publishedVersionId,
      ]),
    ).toBe(1);
  });

  it("rejects an incomplete or closed publication and hides an uncommitted version from another connection", async () => {
    const created = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("visibility"),
      randomUUID(),
    );
    const empty = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      { ...examBody(created.body.resourceId), sections: [] },
      randomUUID(),
    );
    await expect(
      catalog.publish(adminUser.raw, uuidv7(), empty.body.resourceId, 1, randomUUID()),
    ).rejects.toThrow("Publication incomplete");
    const closed = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      {
        ...examBody(created.body.resourceId),
        ...schedule(-60_000),
        openAt: new Date(Date.now() - 120_000).toISOString(),
      },
      randomUUID(),
    );
    await expect(
      catalog.publish(adminUser.raw, uuidv7(), closed.body.resourceId, 1, randomUUID()),
    ).rejects.toThrow("Exam is closed");
    const draft = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(created.body.resourceId),
      randomUUID(),
    );
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let ready: () => void = () => undefined;
    const opened = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const writing = db.transaction(async () => {
      const sealed = await repo.publish(draft.body.resourceId, adminUser.id, 1);
      ready();
      await hold;
      return sealed;
    });
    await opened;
    const hidden = new PostgresCatalogQuery(db2);
    expect(await hidden.publishedExam(draft.body.resourceId)).toBeNull();
    expect(
      await scalar("SELECT count(*)::int n FROM catalog.published_versions WHERE exam_id = $1", [
        draft.body.resourceId,
      ]),
    ).toBe(0);
    release();
    await writing;
    const visible = await hidden.publishedExam(draft.body.resourceId);
    expect(visible?.version).toBe(1);
    expect(await hidden.scoring(visible!.publishedVersionId)).toHaveLength(1);
    expect(
      await scalar(
        "SELECT count(*)::int n FROM catalog.published_answer_keys k JOIN catalog.published_questions q ON q.id = k.question_id WHERE q.version_id = $1",
        [visible!.publishedVersionId],
      ),
    ).toBe(1);
  });

  it("serializes publish and draft replacement without losing either revision", async () => {
    const created = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("concurrent"),
      randomUUID(),
    );
    const draft = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(created.body.resourceId),
      randomUUID(),
    );
    const replacement = {
      ...examBody(created.body.resourceId, 1),
      title: "Replaced while publishing",
    };
    const results = await Promise.allSettled([
      catalog.publish(adminUser.raw, uuidv7(), draft.body.resourceId, 1, randomUUID()),
      other.replaceExam(otherUser.raw, uuidv7(), draft.body.resourceId, replacement, randomUUID()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === "rejected",
    ) as PromiseRejectedResult;
    expect(String(rejected.reason)).toContain("Revision conflict");
    expect(
      await scalar("SELECT revision::int n FROM catalog.exams WHERE id = $1", [
        draft.body.resourceId,
      ]),
    ).toBe(2);
  });

  it("stores safe import reports and commits a valid batch once", async () => {
    const before = await scalar("SELECT count(*)::int n FROM catalog.questions");
    const reports = await scalar("SELECT count(*)::int n FROM platform.import_reports");
    await expect(
      catalog.importQuestions(
        adminUser.raw,
        uuidv7(),
        { schemaVersion: 2, dryRun: false, questions: [] } as never,
        randomUUID(),
      ),
    ).rejects.toThrow();
    const semantic = await catalog.importQuestions(
      adminUser.raw,
      uuidv7(),
      {
        schemaVersion: 1,
        dryRun: false,
        questions: [importEntry(markup, "bad", [9]), importEntry("good", "bad")],
      },
      randomUUID(),
    );
    expect(semantic.body).toMatchObject({ valid: false, committed: false, questions: [] });
    expect(JSON.stringify(semantic.body)).not.toContain(markup);
    expect(await scalar("SELECT count(*)::int n FROM catalog.questions")).toBe(before);
    const dry = await catalog.importQuestions(
      adminUser.raw,
      uuidv7(),
      { schemaVersion: 1, dryRun: true, questions: [importEntry("dry", "dry-1")] },
      randomUUID(),
    );
    expect(dry.body).toMatchObject({ valid: true, committed: false, questions: [] });
    expect(await scalar("SELECT count(*)::int n FROM catalog.questions")).toBe(before);
    const key = uuidv7();
    const imported = await catalog.importQuestions(
      adminUser.raw,
      key,
      {
        schemaVersion: 1,
        dryRun: false,
        questions: [importEntry(markup, "html"), importEntry("second import", "second")],
      },
      randomUUID(),
    );
    expect(imported.body.committed).toBe(true);
    expect(imported.body.questions).toHaveLength(2);
    const replay = await catalog.importQuestions(
      adminUser.raw,
      key,
      {
        schemaVersion: 1,
        dryRun: false,
        questions: [importEntry(markup, "html"), importEntry("second import", "second")],
      },
      randomUUID(),
    );
    expect(replay.body).toEqual(imported.body);
    expect(replay.replayed).toBe(true);
    expect(await scalar("SELECT count(*)::int n FROM catalog.questions")).toBe(before + 2);
    const stored = await catalog.question(
      adminUser.raw,
      imported.body.questions[0]!.questionId,
      randomUUID(),
    );
    expect(stored.prompt).toBe(markup);
    expect(await scalar("SELECT count(*)::int n FROM platform.import_reports")).toBe(reports + 3);
    await expect(catalog.importReport(otherUser.id, imported.body.id)).rejects.toThrow("Not found");
  });

  it("rechecks a revoked admin inside the write transaction", async () => {
    const client = await fixture.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM identity.users WHERE id = $1 FOR UPDATE", [adminUser.id]);
      const pending = catalog.createQuestion(
        adminUser.raw,
        uuidv7(),
        questionBody("revoked"),
        randomUUID(),
      );
      let waiting = false;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const locks = (
          await admin.query(
            "SELECT count(*)::int n FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock'",
            [name],
          )
        ).rows[0] as { n: number };
        if (Number(locks.n) > 0) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      expect(waiting).toBe(true);
      await client.query(
        "DELETE FROM identity.user_roles WHERE user_id = $1 AND role_id = 'ADMIN'",
        [adminUser.id],
      );
      await client.query("COMMIT");
      await expect(pending).rejects.toThrow("Permission denied");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      await ops.query(
        "SELECT identity.operator_admin($1, 'catalog-test', 'restore catalog admin', $2, false, true)",
        [adminUser.id, randomUUID()],
      );
    }
    await expect(
      catalog.createQuestion(candidateUser.raw, uuidv7(), questionBody("candidate"), randomUUID()),
    ).rejects.toThrow("Permission denied");
  });

  it("pages published metadata without question text and keeps the cursor bound", async () => {
    const firstQuestion = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("page one"),
      randomUUID(),
    );
    const firstExam = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(firstQuestion.body.resourceId),
      randomUUID(),
    );
    await catalog.publish(adminUser.raw, uuidv7(), firstExam.body.resourceId, 1, randomUUID());
    const page = await catalog.browse(candidateUser.id, { pageSize: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.metadata.next).toBeTruthy();
    expect(JSON.stringify(page)).not.toContain("page one");
    const newerQuestion = await catalog.createQuestion(
      adminUser.raw,
      uuidv7(),
      questionBody("page two"),
      randomUUID(),
    );
    const newerExam = await catalog.createExam(
      adminUser.raw,
      uuidv7(),
      examBody(newerQuestion.body.resourceId),
      randomUUID(),
    );
    await catalog.publish(adminUser.raw, uuidv7(), newerExam.body.resourceId, 1, randomUUID());
    const continued = await catalog.browse(candidateUser.id, {
      pageSize: 1,
      cursor: page.metadata.next!,
    });
    expect(continued.items.map((item) => item.id)).not.toContain(newerExam.body.resourceId);
    const fresh = await catalog.browse(candidateUser.id, { pageSize: 1 });
    expect(fresh.items[0]?.id).toBe(newerExam.body.resourceId);
    const cursors = new HmacCatalogCursor(csrfKey);
    const foreign = cursors.sign(
      { kind: "exam.browse", actorId: adminUser.id, pageSize: 1, filter: "" },
      new Date().toISOString(),
      [new Date().toISOString(), newerExam.body.resourceId],
      Date.now() + 60_000,
    );
    await expect(
      catalog.browse(candidateUser.id, { pageSize: 1, cursor: foreign }),
    ).rejects.toThrow("Invalid request");
    expect(await catalog.exam(newerExam.body.resourceId)).toMatchObject({ questionCount: 1 });
    await expect(catalog.exam(randomUUID())).rejects.toThrow("Not found");
  });

  it("enforces HTTP permission, CSRF, envelope and the import body limit", async () => {
    const origin = "http://127.0.0.1:3000";
    const security = new PostgresSecurity(db, randomBytes(32));
    @Module({
      controllers: [CatalogController, IdentityController],
      providers: [
        { provide: CatalogService, useValue: catalog },
        { provide: IdentityService, useValue: identity },
        { provide: IDENTITY_ACCESS, useExisting: IdentityService },
        {
          provide: HTTP_SESSION,
          useValue: new HttpSession(identity, security, origin, randomBytes(32)),
        },
        {
          provide: REQUEST_GUARD,
          inject: [HTTP_SESSION],
          useFactory: (session: HttpSession): RequestGuard => ({
            checkUnsafe: (request, context) => session.checkUnsafe(request, context),
            admit: (request, kind, actor) => session.admit(request, kind, actor),
            access: (request) => session.access(request),
          }),
        },
        ShutdownGate,
      ],
    })
    class CatalogHttpModule {}
    const api = await createHttpApplication(CatalogHttpModule);
    try {
      const http = api.app.getHttpAdapter().getInstance();
      const session = await identity.login(adminUser.email, finalPassword);
      const csrfResponse = await http.inject({
        method: "GET",
        url: "/v1/auth/csrf",
        headers: { cookie: `__Host-refresh=${session.refresh}` },
      });
      const csrfCookie = csrfResponse.cookies.find(
        (cookie: { name: string }) => cookie.name === "__Host-csrf",
      );
      const headers = {
        origin,
        cookie: `__Host-access=${session.access}; __Host-refresh=${session.refresh}; __Host-csrf=${csrfCookie.value}`,
        "x-csrf-token": csrfResponse.json().data.csrfToken,
        "idempotency-key": uuidv7(),
      };
      const created = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers,
        payload: questionBody("http question"),
      });
      expect(created.statusCode).toBe(201);
      expect(created.json()).toMatchObject({
        errorCode: null,
        status: true,
        data: { revision: 1 },
      });
      expect(created.json().data).not.toHaveProperty("prompt");
      const replay = await http.inject({
        method: "POST",
        url: "/v1/admin/questions",
        headers,
        payload: questionBody("http question"),
      });
      expect(replay.statusCode).toBe(201);
      expect(replay.headers["idempotency-replayed"]).toBe("true");
      const candidate = await identity.login(candidateUser.email, finalPassword);
      const denied = await http.inject({
        method: "GET",
        url: "/v1/admin/questions",
        headers: { cookie: `__Host-access=${candidate.access}` },
      });
      expect(denied.statusCode).toBe(403);
      expect(denied.json().errorCode).toBe("Permission denied");
      const listed = await http.inject({
        method: "GET",
        url: "/v1/exams?pageSize=1",
        headers: { cookie: `__Host-access=${candidate.access}` },
      });
      expect(listed.statusCode).toBe(200);
      expect(listed.json().metadata.pageSize).toBe(1);
      expect(JSON.stringify(listed.json())).not.toContain("http question");
      const oversizedRegister = await http.inject({
        method: "POST",
        url: "/v1/auth/register",
        headers: {
          "content-type": "application/json",
          origin,
          "x-csrf-token": "x",
          cookie: "__Host-csrf=x",
        },
        payload: `{${" ".repeat(20_000)}}`,
      });
      expect(oversizedRegister.statusCode).toBe(400);
      const anonymous = await http.inject({ method: "GET", url: "/v1/auth/csrf" });
      const anonymousCsrf = anonymous.cookies.find(
        (cookie: { name: string }) => cookie.name === "__Host-csrf",
      );
      const wideImport = await http.inject({
        method: "POST",
        url: "/v1/admin/question-imports",
        headers: {
          "content-type": "application/json",
          origin,
          cookie: `__Host-csrf=${anonymousCsrf.value}`,
          "x-csrf-token": anonymous.json().data.csrfToken,
        },
        payload: JSON.stringify({ pad: "x".repeat(20_000) }),
      });
      expect(wideImport.statusCode).toBe(401);
      expect(wideImport.json().errorCode).toBe("Unauthenticated");
      const tooLarge = await http.inject({
        method: "POST",
        url: "/v1/admin/question-imports",
        headers,
        payload: JSON.stringify({ pad: "x".repeat(1_048_577) }),
      });
      expect(tooLarge.statusCode).toBe(400);
      expect(tooLarge.json().errorCode).toBe("Invalid request");
    } finally {
      await api.app.close();
    }
  });

  it("records exact projection and publication diagnostics without overwriting archived evidence", async () => {
    const imported = await catalog.importQuestions(
      adminUser.raw,
      uuidv7(),
      {
        schemaVersion: 1,
        dryRun: false,
        questions: Array.from({ length: 100 }, (_, index) =>
          importEntry(`diagnostic ${index}`, `q${index}`),
        ),
      },
      randomUUID(),
    );
    const publishMs: number[] = [];
    const publishObservations: DatabaseObservation[] = [];
    const publishQueries: number[] = [];
    for (let index = 0; index < 25; index += 1) {
      const draft = await catalog.createExam(
        adminUser.raw,
        uuidv7(),
        {
          ...examBody(imported.body.questions[0]!.questionId),
          sections: [0, 1].map((section) => ({
            title: `Section ${section + 1}`,
            position: section + 1,
            questions: imported.body.questions
              .slice(section * 50, (section + 1) * 50)
              .map((question, position) => ({
                bankQuestionId: question.questionId,
                position: position + 1,
                points: 2,
              })),
          })),
        },
        randomUUID(),
      );
      const started = observations.length;
      const clock = performance.now();
      await catalog.publish(adminUser.raw, uuidv7(), draft.body.resourceId, 1, randomUUID());
      publishMs.push(performance.now() - clock);
      const sample = observations.slice(started);
      publishObservations.push(...sample);
      publishQueries.push(sample.filter((item) => item.kind === "query").length);
    }

    // Capture the real adapter statements during warm-up only; never export SQL or parameters.
    const exact: Partial<Record<"browse" | "detail", { sql: string; parameters: unknown[] }>> = {};
    let capturing: "browse" | "detail" = "browse";
    const originalQuery = db.query.bind(db);
    db.query = <T extends QueryResultRow>(
      operation: DatabaseOperation,
      sql: string,
      parameters: unknown[] = [],
    ) => {
      if (operation === "catalog.read") exact[capturing] = { sql, parameters };
      return originalQuery<T>(operation, sql, parameters);
    };
    try {
      const page = await catalog.browse(candidateUser.id, { pageSize: 20 });
      capturing = "detail";
      await catalog.exam(page.items[0]!.id);
    } finally {
      db.query = originalQuery;
    }
    expect(exact.browse).toBeDefined();
    expect(exact.detail).toBeDefined();

    const readStarted = observations.length;
    const browseMs: number[] = [];
    const detailMs: number[] = [];
    let payloadBytes = 0;
    for (let index = 0; index < 25; index += 1) {
      const browseStart = performance.now();
      const page = await catalog.browse(candidateUser.id, { pageSize: 20 });
      browseMs.push(performance.now() - browseStart);
      const detailStart = performance.now();
      const detail = await catalog.exam(page.items[0]!.id);
      detailMs.push(performance.now() - detailStart);
      payloadBytes = Buffer.byteLength(JSON.stringify(detail));
    }
    const readObservations = observations.slice(readStarted);
    const explain = async (query: { sql: string; parameters: unknown[] }) => {
      const result = await db.query<{ "QUERY PLAN": { Plan: Record<string, unknown> }[] }>(
        "diagnostic",
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`,
        query.parameters,
      );
      return stripPlan(result.rows[0]!["QUERY PLAN"][0]!.Plan);
    };
    const plans = {
      browse: await explain(exact.browse!),
      detail: await explain(exact.detail!),
    };
    const planText = JSON.stringify(plans);
    expect(planText).toContain("published_sections");
    expect(planText).toContain("published_questions");

    const runId = randomUUID();
    const evidence = {
      schemaVersion: 2,
      runId,
      recordedAt: new Date().toISOString(),
      scope:
        "local restricted PostgreSQL adapter diagnostic; sequential calls, no HTTP session/admission",
      notCapacityEvidence: true,
      iterations: 25,
      pageSize: 20,
      poolMax: 10,
      statementTimeoutMs: 2000,
      lockTimeoutMs: 500,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      postgres: (await fixture.query("SELECT version() AS version")).rows[0].version as string,
      dataset: {
        newPublications: 25,
        questionsPerPublication: 100,
        sectionsPerPublication: 2,
      },
      excluded: [
        "draft/import preparation",
        "projection capture warm-up",
        "EXPLAIN",
        "provenance generation",
      ],
      browseMs: summarize(browseMs),
      detailMs: summarize(detailMs),
      publishMs: summarize(publishMs),
      detailPayloadBytes: payloadBytes,
      reads: observationSummary(readObservations),
      publication: {
        ...observationSummary(publishObservations),
        queriesPerCall: summarize(publishQueries),
      },
      plans,
      exactSqlSha256: Object.fromEntries(
        Object.entries(exact).map(([name, query]) => [
          name,
          createHash("sha256").update(query.sql).digest("hex"),
        ]),
      ),
      source: await sourceHashes("apps/api/src"),
      testSourceSha256: createHash("sha256")
        .update(await readFile("apps/api/tests/integration/catalog.spec.ts"))
        .digest("hex"),
    };
    expect(evidence.reads.errorCount).toBe(0);
    expect(evidence.publication.errorCount).toBe(0);
    expect(evidence.reads.queryCount).toBe(50);
    expect(evidence.reads.transactionMs).toEqual({ n: 0, p50: null, p95: null, p99: null });
    expect(evidence.publication.transactionMs.n).toBe(25);
    expect(evidence.publication.lockRoundTripMs.n).toBeGreaterThanOrEqual(75);
    expect(evidence.publication.pool.maxActive).toBeGreaterThan(0);
    expect(JSON.stringify(evidence)).not.toContain(promptToken);
    const output = ".local/catalog-diagnostics";
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/${runId}.json`, JSON.stringify(evidence, null, 2) + "\n", {
      flag: "wx",
    });
  });
});

function summarize(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const at = (percent: number) =>
    sorted[
      Math.min(sorted.length - 1, Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1))
    ] ?? null;
  return { n: sorted.length, p50: at(50), p95: at(95), p99: at(99) };
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

function observationSummary(sample: DatabaseObservation[]) {
  const count = (kind: DatabaseObservation["kind"]) => sample.filter((item) => item.kind === kind);
  return {
    queryCount: count("query").length,
    errorCount: sample.filter((item) => item.code).length,
    transactionMs: summarize(count("transaction").map((item) => item.durationMs)),
    lockRoundTripMs: summarize(count("lock").map((item) => item.durationMs)),
    acquireMs: summarize(count("acquire").map((item) => item.durationMs)),
    pool: {
      observations: sample.length,
      maxTotal: Math.max(0, ...sample.map((item) => item.total)),
      maxActive: Math.max(0, ...sample.map((item) => item.total - item.idle)),
      maxWaiting: Math.max(0, ...sample.map((item) => item.waiting)),
    },
  };
}

async function sourceHashes(directory: string): Promise<{ path: string; sha256: string }[]> {
  const results: { path: string; sha256: string }[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...(await sourceHashes(path)));
    else if (entry.isFile() && /\.(ts|sql)$/.test(entry.name))
      results.push({
        path: path.replaceAll("\\", "/"),
        sha256: createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      });
  }
  return results.sort((left, right) => left.path.localeCompare(right.path));
}
