import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Pool, PoolClient } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  DatabaseError,
  PostgresDatabase,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { CatalogService } from "../../src/modules/catalog/application/services/catalog.service";
import { ExamDraft } from "../../src/modules/catalog/domain/catalog-policy";
import { HmacCatalogCursor } from "../../src/modules/catalog/infrastructure/cursor/catalog-cursor";
import { PostgresCatalogQuery } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.query";
import { PostgresCatalogRepository } from "../../src/modules/catalog/infrastructure/persistence/postgres-catalog.repository";
import { IdentityService } from "../../src/modules/identity/application/services/identity.service";
import { PostgresIdentityQuery } from "../../src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";
import { PostgresIdentityRepository } from "../../src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../src/modules/identity/infrastructure/security/identity-crypto";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `catalog_publication_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const password = randomUUID();
const owner = `publication_ddl_${suffix}`;
const runtime = `publication_app_${suffix}`;
const operator = `publication_ops_${suffix}`;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const fixtureUrl = new URL(adminUrl);
fixtureUrl.pathname = `/${name}`;
function roleUrl(role: string): string {
  const url = new URL(fixtureUrl);
  url.username = role;
  url.password = password;
  return url.toString();
}

let fixture: Pool;
let ops: Pool;
let db: PostgresDatabase;
let catalog: CatalogService;
let actor: { id: string; raw: string };

function uuidv7(): string {
  const bytes = randomBytes(16);
  const timestamp = BigInt(Date.now());
  for (let index = 0; index < 6; index += 1)
    bytes[index] = Number((timestamp >> BigInt((5 - index) * 8)) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function examBody(bankQuestionId: string, expectedRevision = 0): ExamDraft {
  return {
    title: "Publication deadline regression",
    category: "IT_CERTIFICATION",
    durationSeconds: 90,
    openAt: new Date(Date.now() - 60_000).toISOString(),
    closeAt: new Date(Date.now() + 3_600_000).toISOString(),
    displayTimezone: "Asia/Ho_Chi_Minh",
    attemptLimit: 2,
    explanationPolicy: "NEVER",
    leaderboardEnabled: false,
    sections: [
      {
        title: "One",
        position: 1,
        questions: [{ bankQuestionId, position: 1, points: 5 }],
      },
    ],
    expectedRevision,
  };
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
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: roleUrl(owner) }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: fixtureUrl.toString(), max: 2 });
  ops = new Pool({ connectionString: roleUrl(operator), max: 1 });
  // Use the normal 500 ms lock / 2 s statement limits, rather than weakening production bounds.
  db = new PostgresDatabase(databaseConfig({ NODE_ENV: "test", DATABASE_URL: roleUrl(runtime) }));
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "publication-test",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const jwt = await JwtSessionTokens.create("urn:test:catalog-publication", key, [key]);
  const codec = new VerificationCodec("mail", { mail: randomBytes(32) });
  const passwords = new ArgonPasswords(2, 8);
  const security = new PostgresSecurity(db, randomBytes(32));
  const receipts = new PostgresIdempotency(db);
  const identity = new IdentityService(
    new PostgresIdentityRepository(db),
    db,
    passwords,
    jwt,
    codec,
    await passwords.hash("dummy fixture credential"),
    security,
    receipts,
    new PostgresIdentityQuery(db),
    new PostgresAuthenticatedWriteAdmission(db),
  );
  catalog = new CatalogService(
    identity,
    new PostgresCatalogRepository(db),
    new PostgresCatalogQuery(db),
    receipts,
    security,
    db,
    new HmacCatalogCursor(randomBytes(32)),
  );
  const email = `${randomUUID()}@example.test`;
  const finalPassword = "email owner final password";
  await identity.register({
    email,
    displayName: "Publication administrator",
    password: "initial candidate password",
  });
  const challenge = (
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
  await identity.confirm(await codec.open(challenge.ciphertext, challenge.id), finalPassword);
  await ops.query(
    "SELECT identity.operator_admin($1, 'publication-test', 'publication regression', $2, true, true)",
    [challenge.user_id, randomUUID()],
  );
  actor = { id: challenge.user_id, raw: (await identity.login(email, finalPassword)).access };
});

afterAll(async () => {
  await db?.close();
  await fixture?.end();
  await ops?.end();
  await eventually(
    async () =>
      Number(
        (
          await admin.query(
            `
            SELECT
              count(*)::integer AS running
            FROM
              pg_stat_activity
            WHERE
              datname = $1
            `,
            [name],
          )
        ).rows[0].running,
      ) === 0,
    "disposable database connections drained",
    1000,
  );
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtime}, ${operator}`);
  await admin.end();
});

async function prepare(republish: boolean) {
  const question = await catalog.createQuestion(
    actor.raw,
    uuidv7(),
    {
      type: "SINGLE_CHOICE",
      prompt: "Publication remains correct across a lock wait",
      options: [
        { position: 1, text: "A" },
        { position: 2, text: "B" },
      ],
      correctOptionPositions: [1],
      points: 2,
      explanation: "Frozen explanation",
      expectedRevision: 0,
    },
    randomUUID(),
  );
  const draft = examBody(question.body.resourceId);
  const exam = await catalog.createExam(actor.raw, uuidv7(), draft, randomUUID());
  let revision = exam.body.revision;
  if (republish) {
    const first = await catalog.publish(
      actor.raw,
      uuidv7(),
      exam.body.resourceId,
      revision,
      randomUUID(),
    );
    revision = first.body.revision;
  }
  return { examId: exam.body.resourceId, questionId: question.body.resourceId, draft, revision };
}

async function publicationState(examId: string) {
  return (
    await fixture.query(
      `
      SELECT
        e.revision,
        e.published,
        e.current_version_id,
        (
          SELECT
            count(*)::integer
          FROM
            catalog.published_versions v
          WHERE
            v.exam_id = e.id
        ) AS versions,
        (
          SELECT
            count(*)::integer
          FROM
            platform.audit_logs a
          WHERE
            a.resource_id = e.id
            AND a.action = 'catalog.exam.publish'
        ) AS audits,
        (
          SELECT
            count(*)::integer
          FROM
            platform.idempotency_receipts r
          WHERE
            r.resource_id = e.id
            AND r.operation = 'catalog.exam.publish'
        ) AS receipts
      FROM
        catalog.exams e
      WHERE
        e.id = $1
      `,
      [examId],
    )
  ).rows[0] as {
    revision: number;
    published: boolean;
    current_version_id: string | null;
    versions: number;
    audits: number;
    receipts: number;
  };
}

async function eventually(
  predicate: () => Promise<boolean>,
  description: string,
  timeoutMs: number,
) {
  const deadline = performance.now() + timeoutMs;
  do {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  } while (performance.now() < deadline);
  throw new Error(`Timed out observing ${description}`);
}

async function observeBlocked(holder: PoolClient) {
  const pid = (await holder.query("SELECT pg_backend_pid() AS pid")).rows[0].pid as number;
  await eventually(
    async () =>
      (
        await fixture.query(
          `
          SELECT
            EXISTS (
              SELECT
                1
              FROM
                pg_stat_activity a
              WHERE
                a.usename = $1
                AND a.wait_event_type = 'Lock'
                AND $2 = ANY (pg_blocking_pids(a.pid))
            ) AS blocked
          `,
          [runtime, pid],
        )
      ).rows[0].blocked as boolean,
    "the publication transaction blocked on the fixture row lock",
    350,
  );
}

async function holdRow(holder: PoolClient, lock: "exam" | "question", resourceId: string) {
  await holder.query("BEGIN");
  // Identifiers are fixed test-owned choices; values remain parameterized.
  const sql =
    lock === "exam"
      ? `
        SELECT
          id
        FROM
          catalog.exams
        WHERE
          id = $1
        FOR UPDATE
        `
      : `
        SELECT
          id
        FROM
          catalog.questions
        WHERE
          id = $1
        FOR UPDATE
        `;
  await holder.query(sql, [resourceId]);
}

async function closeSoon(connection: Pool | PoolClient, examId: string, delayMs: number) {
  return (
    await connection.query(
      `
      UPDATE
        catalog.exams
      SET
        closes_at = clock_timestamp() + $2 * interval '1 millisecond'
      WHERE
        id = $1
      RETURNING
        closes_at
      `,
      [examId, delayMs],
    )
  ).rows[0].closes_at as Date;
}

async function observeClosed(closeAt: Date) {
  await eventually(
    async () =>
      (await fixture.query("SELECT clock_timestamp() >= $1::timestamptz AS closed", [closeAt]))
        .rows[0].closed as boolean,
    "the authoritative database close time",
    400,
  );
}

describe("Catalog publication deadlines on restricted PostgreSQL", () => {
  it.each([
    { lock: "exam" as const, republish: false, publication: "initial publish" },
    { lock: "question" as const, republish: false, publication: "initial publish" },
    { lock: "exam" as const, republish: true, publication: "republish" },
    { lock: "question" as const, republish: true, publication: "republish" },
  ])(
    "rejects $publication when the $lock lock wait crosses close without committing any effect",
    async ({ lock, republish }) => {
      const prepared = await prepare(republish);
      const before = await publicationState(prepared.examId);
      const key = uuidv7();
      const holder = await fixture.connect();
      let result: Promise<{ error: unknown; accepted: boolean }> | undefined;
      try {
        await holdRow(holder, lock, lock === "exam" ? prepared.examId : prepared.questionId);
        // For the question wait, the API has already locked its exam. Set a near deadline first.
        let closesAt =
          lock === "question" ? await closeSoon(fixture, prepared.examId, 250) : undefined;
        result = catalog
          .publish(actor.raw, key, prepared.examId, prepared.revision, randomUUID())
          .then(
            () => ({ error: undefined, accepted: true }),
            (error: unknown) => ({ error, accepted: false }),
          );
        await observeBlocked(holder);
        if (lock === "exam") closesAt = await closeSoon(holder, prepared.examId, 50);
        expect(
          (await fixture.query("SELECT clock_timestamp() < $1::timestamptz AS open", [closesAt]))
            .rows[0].open,
        ).toBe(true);
        await observeClosed(closesAt!);
        await holder.query("COMMIT");
        const outcome = await result;
        expect(outcome.accepted).toBe(false);
        expect(outcome.error).toBeInstanceOf(Error);
        expect((outcome.error as Error).message).toBe("Exam is closed");
        expect(await publicationState(prepared.examId)).toEqual(before);

        if (lock === "exam" && !republish) {
          // A rejection reserves neither the key nor a revision. A repaired schedule can retry it.
          const repaired = await catalog.replaceExam(
            actor.raw,
            uuidv7(),
            prepared.examId,
            { ...prepared.draft, expectedRevision: prepared.revision },
            randomUUID(),
          );
          const accepted = await catalog.publish(
            actor.raw,
            key,
            prepared.examId,
            repaired.body.revision,
            randomUUID(),
          );
          const committed = await publicationState(prepared.examId);
          expect(accepted.replayed).toBe(false);
          expect(committed.versions).toBe(1);
          expect(committed.audits).toBe(1);
          expect(committed.receipts).toBe(1);
          // A lost ACK still replays the durable original receipt, even after the exam closes.
          await closeSoon(fixture, prepared.examId, -1);
          const replay = await catalog.publish(
            actor.raw,
            key,
            prepared.examId,
            repaired.body.revision,
            randomUUID(),
          );
          expect(replay).toEqual({ ...accepted, replayed: true });
          expect(await publicationState(prepared.examId)).toEqual(committed);
        }
      } finally {
        await holder.query("ROLLBACK");
        holder.release();
        await result;
      }
    },
  );

  it.each(["exam", "question"] as const)(
    "rolls back publication on a %s lock timeout and permits the same key to retry after contention clears",
    async (lock) => {
      const prepared = await prepare(false);
      const before = await publicationState(prepared.examId);
      const key = uuidv7();
      const holder = await fixture.connect();
      let result: Promise<unknown> | undefined;
      try {
        await holdRow(holder, lock, lock === "exam" ? prepared.examId : prepared.questionId);
        result = catalog
          .publish(actor.raw, key, prepared.examId, prepared.revision, randomUUID())
          .then(
            (value) => value,
            (error: unknown) => error,
          );
        await observeBlocked(holder);
        const error = await result;
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).code).toBe("55P03");
        expect(await publicationState(prepared.examId)).toEqual(before);
        await holder.query("COMMIT");
        const accepted = await catalog.publish(
          actor.raw,
          key,
          prepared.examId,
          prepared.revision,
          randomUUID(),
        );
        const committed = await publicationState(prepared.examId);
        expect(accepted.replayed).toBe(false);
        expect(committed.revision).toBe(prepared.revision + 1);
        expect(committed.versions).toBe(1);
        expect(committed.audits).toBe(1);
        expect(committed.receipts).toBe(1);
      } finally {
        await holder.query("ROLLBACK");
        holder.release();
        await result;
      }
    },
  );
});
