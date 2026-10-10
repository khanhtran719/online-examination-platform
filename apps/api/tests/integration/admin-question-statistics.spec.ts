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

import { QuestionStatisticsController } from "../../src/modules/reporting/presentation/http/question-statistics.controller";
import { QuestionStatisticsService } from "../../src/modules/reporting/application/services/question-statistics.service";
import { QuestionStatisticsPage } from "../../src/modules/reporting/application/dto/question-statistics.dto";
import { PostgresQuestionStatisticsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-question-statistics.query";
import { QuestionStatisticsCrypto } from "../../src/modules/reporting/infrastructure/security/question-statistics-cursor";
import {
  createGradingConsumer,
  createGradingRecovery,
  createGradingReplay,
} from "../../src/modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../src/modules/catalog/catalog-worker.factory";
import { submissionEvent } from "../../src/modules/assessment/domain/assessment-policy";
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = "question_stats_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "qs_ddl_" + suffix,
  runtimeRole = "qs_api_" + suffix,
  graderRole = "qs_grade_" + suffix,
  maintenanceRole = "qs_maintenance_" + suffix,
  recoveryRole = "qs_recovery_" + suffix,
  operatorRole = "qs_operator_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const crypto = new QuestionStatisticsCrypto(randomBytes(32)),
  observations: DatabaseObservation[] = [];
let fixture: Pool,
  db: PostgresDatabase,
  gradeDb: PostgresDatabase,
  maintenance: PostgresDatabase,
  recoveryDb: PostgresDatabase,
  operatorDb: PostgresDatabase,
  identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string, viewer: string, headers: { cookie: string }, validate: ValidateFunction;
let security: PostgresSecurity;
const reader = () =>
  new QuestionStatisticsService(
    identity,
    new PostgresQuestionStatisticsQuery(db),
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
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [login, group] of [
    [owner, "examination_owner"],
    [runtimeRole, "examination_runtime"],
    [graderRole, "examination_grading_worker"],
    [maintenanceRole, "examination_assessment_maintenance"],
    [recoveryRole, "examination_grading_recovery"],
    [operatorRole, "examination_operator"],
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
  gradeDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(graderRole) }),
  );
  maintenance = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(maintenanceRole) }),
  );
  recoveryDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(recoveryRole) }),
  );
  operatorDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(operatorRole) }),
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
    controllers: [QuestionStatisticsController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: QuestionStatisticsService, useValue: reader() },
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
  validate = ajv.compile(document.components.schemas.QuestionStatisticListEnvelope!);
});

it("records bounded natural projection plans and local timings on10k questions/100k options", async () => {
  const versions: Universe[] = [];
  for (let i = 0; i < 20; i++) {
    const v = await universe(500, 10);
    versions.push(v);
    // Synthetic diagnostic counters, not invented real attempts. Correctness uses
    // real grading/retention above. Constraints and source ownership stay enabled.
    await fixture.query(
      `
      INSERT INTO assessment.question_statistics (
        version_id,
        question_id,
        completed_count,
        correct_count,
        incorrect_count,
        unanswered_count
      )
      SELECT
        version_id,
        id,
        1000000,
        500000,
        300000,
        200000
      FROM
        catalog.published_questions
      WHERE
        version_id = $1
    `,
      [v.version],
    );
    await fixture.query(
      `
      INSERT INTO assessment.option_statistics (
        version_id,
        question_id,
        option_id,
        selected_count
      )
      SELECT
        version_id,
        question_id,
        id,
        500000
      FROM
        catalog.published_options
      WHERE
        version_id = $1
    `,
      [v.version],
    );
  }
  for (const table of [
    "catalog.published_versions",
    "catalog.published_sections",
    "catalog.published_questions",
    "catalog.published_options",
    "assessment.question_statistics",
    "assessment.option_statistics",
  ])
    await fixture.query(`ANALYZE ${table}`); // Fixed trusted table names, never caller input.
  const target = versions[0]!;
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
  const query = new PostgresQuestionStatisticsQuery(measured);
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
  async function sample(position: [number, number, string] | null, limit: number) {
    const input = { examId: target.exam, versionId: target.version, position, limit };
    for (let i = 0; i < 5; i++) await query.page(input);
    const samples: number[] = [],
      cpuStart = process.cpuUsage(),
      at = performance.now();
    for (let i = 0; i < 40; i++) {
      const started = performance.now(),
        page = await query.page(input);
      expect(page.rows).toHaveLength(limit);
      expect(page.rows.every((q) => q.options.length === 10)).toBe(true);
      samples.push(performance.now() - started);
    }
    const elapsed = performance.now() - at,
      cpu = process.cpuUsage(cpuStart);
    const plan = (
      await measured.query("diagnostic", `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, bindings)
    ).rows[0]!["QUERY PLAN"];
    return {
      rawLatencyMs: samples,
      latencyMs: metrics(samples),
      elapsedMs: elapsed,
      sequentialRps: 40000 / elapsed,
      harnessCpuMsPerQuery: (cpu.user + cpu.system) / 1000 / 40,
      plan,
    };
  }
  try {
    const row = (
      await query.page({
        examId: target.exam,
        versionId: target.version,
        position: null,
        limit: 301,
      })
    ).rows.at(-1)!;
    const querySamples = {
      first20: await sample(null, 21),
      maximum100: await sample(null, 101),
      continuationAfter301: await sample(
        [row.sectionPosition, row.questionPosition, row.questionId],
        101,
      ),
    };
    const latency: number[] = [],
      bytes: number[] = [],
      transactions: number[] = [],
      acquire: number[] = [];
    let window = 0,
      cpuStart = process.cpuUsage();
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 110));
      observations.length = 0;
      const at = performance.now();
      if (i === 5) {
        window = at;
        cpuStart = process.cpuUsage();
      }
      const response = await http.inject({
        method: "GET",
        url: `/v1/admin/exams/${target.exam}/versions/${target.version}/question-statistics?pageSize=100`,
        headers,
      });
      expect(response.statusCode).toBe(200);
      expect(body(response).items).toHaveLength(100);
      expect(observations.filter((r) => r.kind === "query")).toHaveLength(8);
      expect(Buffer.byteLength(response.payload)).toBeLessThan(128 * 1024);
      if (i >= 5) {
        latency.push(performance.now() - at);
        bytes.push(Buffer.byteLength(response.payload));
        transactions.push(
          ...observations.filter((r) => r.kind === "transaction").map((r) => r.durationMs),
        );
        acquire.push(...observations.filter((r) => r.kind === "acquire").map((r) => r.durationMs));
      }
    }
    const elapsed = performance.now() - window,
      cpu = process.cpuUsage(cpuStart);
    const evidence = {
      localOnly: true,
      notCapacityEvidence: true,
      nodeVersion: process.version,
      cpuArchitecture: process.arch,
      dataset: {
        versions: 20,
        frozenQuestions: 10000,
        frozenOptions: 100000,
        questionCounters: 10000,
        optionCounters: 100000,
        syntheticProjectionOnly: true,
        realAttempts: null,
      },
      sqlSha256: createHash("sha256").update(sql).digest("hex"),
      querySamples,
      http: {
        rawLatencyMs: latency,
        latencyMs: metrics(latency),
        rawPayloadBytes: bytes,
        payloadBytes: metrics(bytes),
        rawTransactionMs: transactions,
        transactionMs: metrics(transactions),
        rawAcquireMs: acquire,
        acquireMs: metrics(acquire),
        sqlCalls: 8,
        pollingPaceMs: 110,
        elapsedMs: elapsed,
        achievedSuccessfulRps: (latency.length * 1000) / elapsed,
        harnessCpuMsPerRequest: (cpu.user + cpu.system) / 1000 / latency.length,
        errors: 0,
        scope:
          "Fastify inject/real Identity/restricted primary PostgreSQL, maximum100-row/10-option page; combined Jest harness CPU; no TCP/TLS/ALB; pace excluded from latency and included in RPS",
      },
      rssBytes: process.memoryUsage().rss,
      allocationBytesPerRequest: null,
      databaseCpu: null,
      utilization: null,
      sustainableRps: null,
      concurrentCapacity: null,
      awsCostPerHour: null,
      costPerMillionRequests: null,
      decision:
        "Baseline only; existing indexes, no new schema/resource or optimization/capacity/cost winner accepted.",
    };
    const directory = process.env.ADMIN_QUESTION_STATISTICS_EVIDENCE_DIR;
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
afterAll(async () => {
  await api?.app.close();
  await db?.close();
  await gradeDb?.close();
  await maintenance?.close();
  await recoveryDb?.close();
  await operatorDb?.close();
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
  await admin.query(
    `DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${graderRole}, ${maintenanceRole}, ${recoveryRole}, ${operatorRole}`,
  );
  await admin.end();
});
async function universe(size = 3, optionsCount = 2, examId?: string) {
  const user = randomUUID(),
    exam = examId ?? randomUUID(),
    version = randomUUID(),
    section = randomUUID();
  const questions = Array.from({ length: size }, (_, i) => ({
    id: randomUUID(),
    position: (i % 25) + 1,
    section: Math.floor(i / 25) + 1,
    options: Array.from({ length: optionsCount }, (_, j) => ({
      id: randomUUID(),
      position: j + 1,
    })),
  }));
  await fixture.query(
    `
      INSERT INTO identity.users (
        id,
        email,
        password_hash
      )
      VALUES (
        $1,
        $2,
        'fixture-only'
      )
    `,
    [user, `${user}@retention.test`],
  );
  const c = await fixture.connect();
  try {
    await c.query("BEGIN");
    if (!examId)
      await c.query(
        `
        INSERT INTO catalog.exams (
          id,
          title,
          category,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at
        )
        VALUES (
          $1,
          'Retention fixture',
          'IT_CERTIFICATION',
          3600,
          10,
          '2020-01-01',
          '2030-01-01'
        )
      `,
        [exam],
      );
    await c.query(
      `
        INSERT INTO catalog.published_versions (
          id,
          exam_id,
          version,
          title,
          description,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at,
          display_timezone,
          explanation_policy,
          category,
          published_by
        )
        VALUES (
          $1,
          $2,
          $4,
          'Retention fixture',
          '',
          3600,
          10,
          '2020-01-01',
          '2030-01-01',
          'Asia/Ho_Chi_Minh',
          'AFTER_COMPLETION',
          'IT_CERTIFICATION',
          $3
        )
      `,
      [version, exam, user, examId ? 2 : 1],
    );
    await c.query(
      `
        INSERT INTO catalog.published_sections (
          version_id,
          id,
          title,
          position
        )
        SELECT
          $1,
          (substr($2::text, 1, 24) || lpad(i::text, 12, '0'))::uuid,
          'Section',
          i
        FROM
          generate_series(1, $3::int) i
      `,
      [version, section, Math.ceil(size / 25)],
    );
    await c.query(
      `
        INSERT INTO catalog.published_questions (
          version_id,
          id,
          section_id,
          source_question_id,
          source_revision,
          type,
          prompt,
          explanation,
          points,
          position
        )
        SELECT
          $1,
          q.id,
          (substr($2::text, 1, 24) || lpad(q.section::text, 12, '0'))::uuid,
          q.id,
          1,
          CASE
            WHEN $4::int = 10 THEN 'MULTIPLE_CHOICE'
            WHEN q.position = 2 THEN 'MULTIPLE_CHOICE'
            WHEN q.position = 3 THEN 'TRUE_FALSE'
            ELSE 'SINGLE_CHOICE'
          END,
          'PRIVATE_QUESTION_TEXT',
          'PRIVATE_EXPLANATION',
          1,
          q.position
        FROM
          jsonb_to_recordset($3::jsonb) AS q(id uuid, position smallint, section smallint)
      `,
      [version, section, JSON.stringify(questions), optionsCount],
    );
    const opts = questions.flatMap((q) => q.options.map((o) => ({ ...o, question: q.id })));
    await c.query(
      `
        INSERT INTO catalog.published_options (
          version_id,
          question_id,
          id,
          position,
          text
        )
        SELECT
          $1,
          o.question,
          o.id,
          o.position,
          'Option'
        FROM
          jsonb_to_recordset($2::jsonb) AS o(question uuid, id uuid, position smallint)
      `,
      [version, JSON.stringify(opts)],
    );
    await c.query(
      `
        INSERT INTO catalog.published_answer_keys (
          version_id,
          question_id,
          option_id
        )
        SELECT
          version_id,
          question_id,
          id
        FROM
          catalog.published_options
        WHERE
          version_id = $1
          AND (position = 1 OR $2::boolean OR question_id IN (
            SELECT
              id
            FROM
              catalog.published_questions
            WHERE
              version_id = $1
              AND type = 'MULTIPLE_CHOICE'
          ))
      `,
      [version, optionsCount === 10],
    );
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return { user, exam, version, questions, optionsCount };
}
type Universe = Awaited<ReturnType<typeof universe>>;
const day = 86400000;
async function attempt(
  f: Universe,
  ageDays = 366,
  selections: number[][] = [[0], [0, 1], []],
  expired = false,
) {
  const id = randomUUID(),
    eventId = randomUUID(),
    submissionId = randomUUID();
  const submittedAt = new Date(Date.now() - ageDays * day).toISOString();
  const startedAt = new Date(Date.parse(submittedAt) - 60000).toISOString();
  const deadline = new Date(Date.parse(submittedAt) + 3600000).toISOString();
  await fixture.query(
    `
      INSERT INTO assessment.attempts (
        id,
        user_id,
        exam_id,
        version_id,
        status,
        started_at,
        deadline,
        submitted_at,
        submission_id,
        submission_event_id,
        submission_kind,
        expired,
        revision
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $10,
        $5,
        $6,
        $7,
        $8,
        $9,
        $11,
        $12,
        1
      )
    `,
    [
      id,
      f.user,
      f.exam,
      f.version,
      startedAt,
      expired ? submittedAt : deadline,
      submittedAt,
      submissionId,
      eventId,
      expired ? "EXPIRED" : "SUBMITTED",
      expired ? "DEADLINE" : "MANUAL",
      expired,
    ],
  );
  const selected = f.questions.filter((_q, i) => i < selections.length);
  await fixture.query(
    `
      INSERT INTO assessment.answers (
        attempt_id,
        version_id,
        question_id,
        version
      )
      SELECT
        $1,
        $2,
        q.id,
        1
      FROM
        jsonb_to_recordset($3::jsonb) AS q(id uuid)
    `,
    [id, f.version, JSON.stringify(selected)],
  );
  const choices = selected.flatMap((q, i) =>
    selections[i]!.map((index) => q.options[index]!).map((o) => ({
      question: q.id,
      option: o.id,
    })),
  );
  await fixture.query(
    `
      INSERT INTO assessment.answer_selections (
        attempt_id,
        version_id,
        question_id,
        option_id
      )
      SELECT
        $1,
        $2,
        s.question,
        s.option
      FROM
        jsonb_to_recordset($3::jsonb) AS s(question uuid, option uuid)
    `,
    [id, f.version, JSON.stringify(choices)],
  );
  const event = submissionEvent({
    eventId,
    attemptId: id,
    examId: f.exam,
    publishedVersionId: f.version,
    submissionId,
    occurredAt: submittedAt,
    deadline: expired ? submittedAt : deadline,
    expired,
    submissionKind: expired ? "DEADLINE" : "MANUAL",
    correlationId: randomUUID(),
    causationId: randomUUID(),
  });
  await fixture.query(
    `
      INSERT INTO platform.outbox (
        event_id,
        aggregate_id,
        type,
        payload,
        correlation_id,
        created_at
      )
      VALUES (
        $1,
        $2,
        'attempt.submitted.v1',
        $3::jsonb,
        $4,
        $5
      )
    `,
    [eventId, id, JSON.stringify(event), event.correlationId, submittedAt],
  );
  return { id, event, raw: JSON.stringify(event) };
}

async function grade(a: Awaited<ReturnType<typeof attempt>>) {
  return createGradingConsumer(gradeDb, createScoringCatalog(gradeDb)).consume(a.raw);
}
async function get(v: Universe, query = "", h = headers) {
  await new Promise((r) => setTimeout(r, 110));
  return http.inject({
    method: "GET",
    url: `/v1/admin/exams/${v.exam}/versions/${v.version}/question-statistics${query}`,
    headers: h,
  });
}
function body(response: Awaited<ReturnType<typeof get>>): QuestionStatisticsPage {
  const value = response.json();
  if (response.statusCode === 200 && !validate(value))
    throw new Error(JSON.stringify(validate.errors));
  return { items: value.data, metadata: value.metadata };
}
async function audits(v: Universe) {
  return (
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
      AND action = 'reporting.question-statistics.read'
  `,
      [v.version],
    )
  ).rows;
}
describe("Admin question statistics on real grading/primary PostgreSQL", () => {
  it("audits replay and counts only the completed generation, ignoring old/duplicate delivery", async () => {
    const v = await universe(),
      a = await attempt(v, 1);
    expect((await createGradingRecovery(recoveryDb).consume(a.raw)).outcome).toBe("terminal");
    expect(body(await get(v)).items.every((q) => q.completedAttempts === 0)).toBe(true);
    const revision = (
      await fixture.query(
        `
      SELECT
        revision
      FROM
        assessment.attempts
      WHERE
        id = $1
    `,
        [a.id],
      )
    ).rows[0]!.revision as number;
    const replay = await createGradingReplay(operatorDb).replay(
      a.id,
      revision,
      viewer,
      "Recovered dependency for statistics fixture",
      randomUUID(),
    );
    expect(replay.generation).toBe(1);
    const consumer = createGradingConsumer(gradeDb, createScoringCatalog(gradeDb));
    expect((await consumer.consume(a.raw, 0)).outcome).toBe("stale");
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("completed");
    expect((await consumer.consume(a.raw, 1)).outcome).toBe("duplicate");
    expect(body(await get(v)).items.every((q) => q.completedAttempts === 1)).toBe(true);
  });
  it("revalidates permission inside UoW after prior successful authentication", async () => {
    const v = await universe(),
      raw = headers.cookie.slice("__Host-access=".length);
    expect((await identity.authenticate(raw)).permissions).toContain("reporting.read");
    const service = new QuestionStatisticsService(
      {
        authenticate: identity.authenticate.bind(identity),
        requirePermission: identity.requirePermission.bind(identity),
        revalidate: async (credential, permission) => {
          await fixture.query(
            `
          DELETE FROM identity.user_roles
          WHERE
            user_id = $1
            AND role_id = 'ADMIN'
        `,
            [viewer],
          );
          return identity.revalidate(credential, permission);
        },
      },
      new PostgresQuestionStatisticsQuery(db),
      crypto,
      security,
      db,
    );
    try {
      await expect(
        service.page({
          raw,
          actorId: viewer,
          examId: v.exam,
          versionId: v.version,
          pageSize: 20,
          cursor: null,
          correlationId: randomUUID(),
        }),
      ).rejects.toMatchObject({ category: "forbidden" });
      expect(await audits(v)).toEqual([]);
    } finally {
      await fixture.query(
        `
      INSERT INTO identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'ADMIN')
    `,
        [viewer],
      );
    }
  });
  it("bounds actor-lock wait without returning a report, then recovers", async () => {
    const v = await universe(),
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
      const at = performance.now(),
        response = await get(v);
      expect(response.statusCode).toBe(503);
      expect(response.json().data).toBeNull();
      expect(performance.now() - at).toBeLessThan(2500);
      expect(await audits(v)).toEqual([]);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
    expect((await get(v)).statusCode).toBe(200);
  });
  it("rejects option counters greater than answered instead of inventing a valid report", async () => {
    const v = await universe();
    await grade(await attempt(v));
    await fixture.query(
      `
      UPDATE assessment.option_statistics
      SET
        selected_count = 3
      WHERE
        version_id = $1
    `,
      [v.version],
    );
    const response = await get(v);
    expect(response.statusCode).toBe(503);
    expect(response.json().data).toBeNull();
    expect(await audits(v)).toEqual([]);
  });
  it("returns every frozen question/option with audited zero counts and exact DTO", async () => {
    const v = await universe(),
      response = await get(v),
      page = body(response);
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(page.items.map((q) => q.questionId)).toEqual(v.questions.map((q) => q.id));
    for (const row of page.items) {
      expect(row).toMatchObject({
        completedAttempts: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
      });
      expect(row.options).toHaveLength(2);
      expect(row.options.every((o) => o.selectedCount === 0)).toBe(true);
      expect(Object.keys(row).sort()).toEqual(
        [
          "questionId",
          "completedAttempts",
          "answered",
          "correct",
          "incorrect",
          "unanswered",
          "options",
        ].sort(),
      );
    }
    expect(await audits(v)).toEqual([
      {
        actor_id: viewer,
        resource_type: "EXAM_VERSION",
        correlation_id: response.headers["x-correlation-id"],
        changed_fields: [],
      },
    ]);
    for (const secret of [
      "PRIVATE_DISPLAY_NAME",
      "PRIVATE_QUESTION_TEXT",
      "PRIVATE_EXPLANATION",
      "correctOptionIds",
      "selectedOptionIds",
      "@example.test",
    ])
      expect(response.payload).not.toContain(secret);
  });
  it("counts all completed attempts, exact multiple-choice, empty/missing selections and expired completion once", async () => {
    const v = await universe();
    const a = await attempt(v),
      b = await attempt(v, 1, [[1], [0], [0]], true),
      c = await attempt(v, 1, []);
    await attempt(v, 1, [[0]]); // Pending contributes nothing.
    const failed = await attempt(v, 1, [[0]]);
    await fixture.query(
      `
      UPDATE assessment.attempts
      SET
        status = 'FAILED'
      WHERE
        id = $1
    `,
      [failed.id],
    );
    await fixture.query(
      `
      UPDATE identity.users
      SET
        leaderboard_opt_in = false,
        enabled = false
      WHERE
        id = $1
    `,
      [v.user],
    );
    for (const item of [a, b, c]) expect((await grade(item)).outcome).toBe("completed");
    expect((await grade(a)).outcome).toBe("duplicate");
    const page = body(await get(v));
    expect(
      page.items.map(({ completedAttempts, answered, correct, incorrect, unanswered }) => ({
        completedAttempts,
        answered,
        correct,
        incorrect,
        unanswered,
      })),
    ).toEqual([
      { completedAttempts: 3, answered: 2, correct: 1, incorrect: 1, unanswered: 1 },
      { completedAttempts: 3, answered: 2, correct: 1, incorrect: 1, unanswered: 1 },
      { completedAttempts: 3, answered: 1, correct: 1, incorrect: 0, unanswered: 2 },
    ]);
    expect(page.items[1]?.options.map((o) => o.selectedCount)).toEqual([2, 1]);
    expect(page.items[1]!.options.reduce((n, o) => n + o.selectedCount, 0)).toBeGreaterThan(
      page.items[1]!.answered,
    );
  });
  it("reads committed counters during a blocked grading transaction, then atomically sees completion", async () => {
    const v = await universe(),
      a = await attempt(v),
      b = await attempt(v, 1, [[1], [0], [1]]);
    await grade(a);
    const holder = await fixture.connect();
    let running: Promise<Awaited<ReturnType<typeof grade>>> | undefined;
    try {
      await holder.query("BEGIN");
      await holder.query(
        `
        SELECT
          question_id
        FROM
          assessment.question_statistics
        WHERE
          version_id = $1
        ORDER BY
          question_id
        FOR UPDATE
      `,
        [v.version],
      );
      running = grade(b);
      // Observe the actual worker lock wait rather than guessing a sleep duration.
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        waiting = (
          await fixture.query(
            `
          SELECT
            EXISTS (
              SELECT
                1
              FROM
                pg_stat_activity
              WHERE
                datname = $1
                AND usename = $2
                AND wait_event_type = 'Lock'
            ) AS waiting
        `,
            [name, graderRole],
          )
        ).rows[0]!.waiting;
        if (waiting) break;
        await new Promise((r) => setTimeout(r, 2));
      }
      expect(waiting).toBe(true);
      expect(body(await get(v)).items.every((q) => q.completedAttempts === 1)).toBe(true);
      await holder.query("COMMIT");
      expect((await running).outcome).toBe("completed");
      expect(body(await get(v)).items.every((q) => q.completedAttempts === 2)).toBe(true);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
      await running;
    }
  });
  it("uses real retention RPC to subtract counts and preserves duplicate fencing after purge", async () => {
    const v = await universe(),
      a = await attempt(v, 366);
    await grade(a);
    await fixture.query(
      `
      UPDATE assessment.results
      SET
        completed_at = clock_timestamp() - interval '8 days'
      WHERE
        attempt_id = $1
    `,
      [a.id],
    );
    await fixture.query(
      `
      UPDATE platform.outbox
      SET
        delivered_at = clock_timestamp()
      WHERE
        event_id = $1
    `,
      [a.event.eventId],
    );
    expect(body(await get(v)).items.every((q) => q.completedAttempts === 1)).toBe(true);
    const outcome = (
      await maintenance.query(
        "assessment.write",
        `
      SELECT
        assessment.purge_retained_attempt($1, $2) AS outcome
    `,
        [a.id, randomUUID()],
      )
    ).rows[0]!.outcome;
    expect(outcome.purged).toBe(true);
    expect((await grade(a)).outcome).toBe("duplicate");
    const page = body(await get(v));
    expect(page.items).toHaveLength(3);
    expect(
      page.items.every(
        (q) => q.completedAttempts === 0 && q.options.every((o) => o.selectedCount === 0),
      ),
    ).toBe(true);
  });
  it("requires exact exam/version even when archived/unpublished or another version has counters", async () => {
    const v = await universe(),
      v2 = await universe(3, 2, v.exam);
    await grade(await attempt(v));
    await fixture.query(
      `
      UPDATE catalog.exams
      SET
        published = false,
        archived_at = clock_timestamp()
      WHERE
        id = $1
    `,
      [v.exam],
    );
    expect(body(await get(v)).items[0]?.completedAttempts).toBe(1);
    expect(body(await get(v2)).items[0]?.completedAttempts).toBe(0);
    expect((await get({ ...v, exam: randomUUID() })).statusCode).toBe(404);
    expect((await get({ ...v, version: randomUUID() })).statusCode).toBe(404);
  });
  it("traverses all500 frozen questions without duplicates across20 sections or changes from concurrent grading", async () => {
    const v = await universe(500, 10),
      expected = v.questions.map((q) => q.id);
    const first = body(await get(v, "?pageSize=100"));
    const a = await attempt(v, 1, []);
    await grade(a);
    const ids = first.items.map((q) => q.questionId);
    let next = first.metadata.next;
    while (next) {
      const page = body(await get(v, `?pageSize=100&cursor=${next}`));
      expect(page.items.every((q) => q.completedAttempts === 1)).toBe(true);
      ids.push(...page.items.map((q) => q.questionId));
      next = page.metadata.next;
    }
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(500);
  });
  it("binds opaque cursors to actor/exam/version/size and rejects tampering or expiry", async () => {
    const v = await universe(),
      other = await universe(),
      first = body(await get(v, "?pageSize=1")),
      token = first.metadata.next!;
    expect((await get(other, `?pageSize=1&cursor=${token}`)).statusCode).toBe(400);
    expect((await get(v, `?pageSize=2&cursor=${token}`)).statusCode).toBe(400);
    const candidate = await user();
    await fixture.query(
      `
      INSERT INTO identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'ADMIN')
    `,
      [candidate],
    );
    const s = await identity.login(`${candidate}@example.test`, "ranking fixture password");
    expect(
      (await get(v, `?pageSize=1&cursor=${token}`, { cookie: `__Host-access=${s.access}` }))
        .statusCode,
    ).toBe(400);
    const packed = Buffer.from(token, "base64url");
    packed[28] = packed[28]! ^ 1;
    expect((await get(v, `?pageSize=1&cursor=${packed.toString("base64url")}`)).statusCode).toBe(
      400,
    );
    const watermark = new Date(Date.now() - 901000).toISOString();
    const expired = crypto.sign(
      { actorId: viewer, examId: v.exam, versionId: v.version, pageSize: 1 },
      {
        watermark,
        position: [1, 1, v.questions[0]!.id],
        expiresAt: Date.parse(watermark) + 900000,
      },
    );
    expect((await get(v, `?pageSize=1&cursor=${expired}`)).statusCode).toBe(400);
  });
  it("enforces current permission/session and rejects actor/filter overrides", async () => {
    const v = await universe(),
      candidate = await user(),
      s = await identity.login(`${candidate}@example.test`, "ranking fixture password");
    expect((await get(v, "", { cookie: `__Host-access=${s.access}` })).statusCode).toBe(403);
    expect((await get(v, "", { cookie: "" })).statusCode).toBe(401);
    expect((await get(v, `?actorId=${candidate}`)).statusCode).toBe(400);
    await fixture.query(
      `
      DELETE FROM identity.user_roles
      WHERE
        user_id = $1
        AND role_id = 'ADMIN'
    `,
      [viewer],
    );
    try {
      expect((await get(v)).statusCode).toBe(403);
    } finally {
      await fixture.query(
        `
      INSERT INTO identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'ADMIN')
    `,
        [viewer],
      );
    }
  });
  it.each([
    "?pageSize=0",
    "?pageSize=101",
    "?pageSize=1.5",
    "?pageSize=1&pageSize=2",
    "?cursor=",
    "?cursor=bad.token",
    "?filter=all",
  ])("rejects invalid input %s", async (query) => {
    expect((await get(await universe(), query)).statusCode).toBe(400);
  });
  it("fails closed on audit outage, overflow and inconsistent option counts, without leaking counts", async () => {
    const v = await universe();
    await grade(await attempt(v));
    await fixture.query("REVOKE INSERT ON platform.audit_logs FROM examination_runtime");
    try {
      expect((await get(v)).statusCode).toBe(503);
    } finally {
      await fixture.query("GRANT INSERT ON platform.audit_logs TO examination_runtime");
    }
    expect(await audits(v)).toEqual([]);
    await fixture.query(
      `
      UPDATE assessment.question_statistics
      SET
        completed_count = 2147483648,
        correct_count = 2147483648,
        incorrect_count = 0,
        unanswered_count = 0
      WHERE
        version_id = $1
    `,
      [v.version],
    );
    const response = await get(v);
    expect(response.statusCode).toBe(503);
    expect(response.json().data).toBeNull();
    expect(response.payload).not.toContain("2147483648");
    expect(await audits(v)).toEqual([]);
  });
  it("has a fixed auth-inclusive8 SQL budget at page sizes1 and100, independent of options", async () => {
    const v = await universe(100, 10);
    for (const size of [1, 100]) {
      observations.length = 0;
      const response = await get(v, `?pageSize=${size}`);
      expect(response.statusCode).toBe(200);
      expect(body(response).items).toHaveLength(size);
      expect(observations.filter((r) => r.kind === "query").map((r) => r.operation)).toEqual([
        "identity.read",
        "security.rate",
        "transaction.begin",
        "lock.acquire",
        "identity.read",
        "reporting.read",
        "audit.write",
        "transaction.commit",
      ]);
      expect(Buffer.byteLength(response.payload)).toBeLessThan(128 * 1024);
      expect(db.stats().waiting).toBe(0);
    }
  });
});
