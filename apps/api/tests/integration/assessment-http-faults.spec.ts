import { spawn, type ChildProcess } from "node:child_process";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, request, type IncomingHttpHeaders, type Server } from "node:http";
import { createServer as portServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { Pool, type PoolClient } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import { ArgonPasswords } from "../../src/modules/identity/infrastructure/security/identity-crypto";

// Fault injection belongs only to this disposable database/network fixture.
// Runtime code has no test hook, administrator connection or bypassed admission.
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Disposable test administrator required");
const target = new URL(adminUrl);
if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.port !== "55435")
  throw new Error("HTTP crash fixtures require isolated PostgreSQL on port55435");
const name = `assessment_http_${randomUUID().replaceAll("-", "")}`;
const suffix = name.slice(-12);
const owner = `http_ddl_${suffix}`;
const runtimeRole = `http_app_${suffix}`;
const password = randomUUID();
target.pathname = `/${name}`;
const ddlUrl = new URL(target);
ddlUrl.username = owner;
ddlUrl.password = password;
const runtimeUrl = new URL(target);
runtimeUrl.username = runtimeRole;
runtimeUrl.password = password;
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const origin = "http://127.0.0.1:31000";
const credential = "HTTP fault fixture password";
const advisoryKey = 848202601;
const processes = new Set<ApiProcess>();
const holders = new Set<PoolClient>();
const records: { operation: string; fault: string; durationMs: number | null }[] = [];
let fixture: Pool;
let secrets: string;
let baseEnv: NodeJS.ProcessEnv;
let passwordHash: string;
let adminEmail: string;
let api: ApiProcess;
let databaseCreated = false;

type Operation = "start" | "save" | "submit";
interface Envelope<T> {
  data: T;
  errorCode: string | null;
  message: string | null;
  status: boolean;
}
interface HttpResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}
interface ApiProcess {
  child: ChildProcess;
  port: number;
  closed: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  output: () => string;
}
interface Session {
  headers: { origin: string; cookie: string; "x-csrf-token": string };
  userId: string;
}
interface Attempt {
  id: string;
  revision: number;
  deadline: string;
  startedAt: string;
  status: string;
}
interface Context {
  actor: Session;
  examId: string;
  attempt?: Attempt;
  questionId?: string;
  optionId?: string;
  key: string;
  method: string;
  path: string;
  body: object;
  expectedStatus: number;
}

function uuidv7(): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function envelope<T>(response: HttpResponse): Envelope<T> {
  return JSON.parse(response.body.toString()) as Envelope<T>;
}

async function unusedPort(): Promise<number> {
  const server = portServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  return address.port;
}

function http(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: object,
  timeoutMs = 10000,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const call = request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path,
        agent: false,
        headers: {
          ...headers,
          ...(payload
            ? { "content-type": "application/json", "content-length": String(payload.length) }
            : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (value: Buffer) => chunks.push(value));
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode!,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    call.setTimeout(timeoutMs, () => {
      const error = Object.assign(new Error("Fixture client timeout"), { code: "ETIMEDOUT" });
      call.destroy(error);
    });
    call.on("error", reject);
    call.end(payload);
  });
}

async function waitFor<T>(probe: () => Promise<T | undefined>, description: string): Promise<T> {
  const deadline = performance.now() + 5000;
  do {
    const result = await probe();
    if (result !== undefined) return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  } while (performance.now() < deadline);
  throw new Error(`Fixture did not observe ${description}`);
}

async function launch(overrides: NodeJS.ProcessEnv = {}): Promise<ApiProcess> {
  const port = await unusedPort();
  const child = spawn(process.execPath, [resolve("dist/main.js")], {
    env: { ...baseEnv, ...overrides, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream!.on("data", (value: Buffer) => {
      output = (output + value.toString()).slice(-65536);
    });
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({ code, signal }));
    },
  );
  const apiProcess = { child, port, closed, output: () => output };
  processes.add(apiProcess);
  await waitFor(async () => {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error("Compiled API failed to start");
    return output.includes('"event":"api.started"') ? true : undefined;
  }, "compiled API startup");
  expect((await http(port, "GET", "/ready")).status).toBe(200);
  return apiProcess;
}

async function stop(process: ApiProcess, signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
  process.child.kill(signal);
  const outcome = await Promise.race([
    process.closed,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("API stop timeout")), 6000).unref(),
    ),
  ]);
  if (signal === "SIGKILL") expect(outcome.signal).toBe("SIGKILL");
  else expect(outcome).toEqual({ code: 0, signal: null });
  expect(process.output()).not.toMatch(
    /PRIVATE KEY|HTTP fault fixture password|postgres:\/\/|csrfToken|set-cookie|\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/i,
  );
  processes.delete(process);
}

async function seedUser(role: "ADMIN" | "CANDIDATE"): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `${id}@example.test`;
  await fixture.query(
    `
    INSERT INTO
      identity.users (id, email, password_hash, display_name, email_verified_at)
    VALUES
      ($1, $2, $3, 'HTTP candidate', clock_timestamp())
    `,
    [id, email, passwordHash],
  );
  await fixture.query(
    `
    INSERT INTO
      identity.user_roles (user_id, role_id)
    VALUES
      ($1, $2)
    `,
    [id, role],
  );
  return { id, email };
}

async function session(port: number, email: string, userId = "fixture-admin"): Promise<Session> {
  const cookies = new Map<string, string>();
  const absorb = (response: HttpResponse) => {
    for (const value of response.headers["set-cookie"] ?? []) {
      const pair = value.split(";")[0]!;
      const split = pair.indexOf("=");
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
  };
  const cookie = () => [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
  const anonymous = await http(port, "GET", "/v1/auth/csrf");
  expect(anonymous.status).toBe(200);
  absorb(anonymous);
  const login = await http(
    port,
    "POST",
    "/v1/auth/login",
    {
      origin,
      cookie: cookie(),
      "x-csrf-token": envelope<{ csrfToken: string }>(anonymous).data.csrfToken,
    },
    { email, password: credential },
  );
  expect(login.status).toBe(200);
  absorb(login);
  const authenticated = await http(port, "GET", "/v1/auth/csrf", { cookie: cookie() });
  expect(authenticated.status).toBe(200);
  absorb(authenticated);
  return {
    userId,
    headers: {
      origin,
      cookie: cookie(),
      "x-csrf-token": envelope<{ csrfToken: string }>(authenticated).data.csrfToken,
    },
  };
}

async function prepare(operation: Operation, leaderboardEnabled = false): Promise<Context> {
  const operator = await session(api.port, adminEmail);
  const mutation = async (path: string, body: object) => {
    const response = await http(
      api.port,
      "POST",
      path,
      { ...operator.headers, "idempotency-key": uuidv7() },
      body,
    );
    expect(response.status).toBe(path.endsWith("/publish") ? 200 : 201);
    return envelope<{ resourceId: string }>(response).data.resourceId;
  };
  const question = await mutation("/v1/admin/questions", {
    type: "SINGLE_CHOICE",
    prompt: "Fault matrix question",
    points: 2,
    options: [
      { position: 1, text: "A" },
      { position: 2, text: "B" },
    ],
    correctOptionPositions: [1],
    explanation: "Private frozen explanation",
    expectedRevision: 0,
  });
  const examId = await mutation("/v1/admin/exams", {
    title: "HTTP recovery",
    category: "IT_CERTIFICATION",
    durationSeconds: 600,
    openAt: new Date(Date.now() - 60000).toISOString(),
    closeAt: new Date(Date.now() + 3600000).toISOString(),
    displayTimezone: "Asia/Ho_Chi_Minh",
    attemptLimit: 1,
    explanationPolicy: "NEVER",
    leaderboardEnabled,
    expectedRevision: 0,
    sections: [
      {
        title: "One",
        position: 1,
        questions: [{ bankQuestionId: question, position: 1, points: 2 }],
      },
    ],
  });
  await mutation(`/v1/admin/exams/${examId}/publish`, { expectedRevision: 1 });
  const user = await seedUser("CANDIDATE");
  const actor = await session(api.port, user.email, user.id);
  const context: Context = {
    actor,
    examId,
    key: uuidv7(),
    method: "POST",
    path: `/v1/exams/${examId}/attempts`,
    body: {},
    expectedStatus: 201,
  };
  if (operation === "start") return context;
  const started = await http(
    api.port,
    "POST",
    context.path,
    { ...actor.headers, "idempotency-key": uuidv7() },
    {},
  );
  expect(started.status).toBe(201);
  context.attempt = envelope<Attempt>(started).data;
  const questions = await http(
    api.port,
    "GET",
    `/v1/attempts/${context.attempt.id}/questions`,
    actor.headers,
  );
  expect(questions.status).toBe(200);
  const questionView = envelope<{ id: string; options: { id: string }[] }[]>(questions).data[0]!;
  context.questionId = questionView.id;
  context.optionId = questionView.options[0]!.id;
  const answers = {
    answers: [
      {
        questionId: context.questionId,
        selectedOptionIds: [context.optionId],
        marked: false,
        expectedVersion: 0,
      },
    ],
  };
  context.path = `/v1/attempts/${context.attempt.id}/answers`;
  context.method = "PUT";
  context.body = answers;
  context.expectedStatus = 200;
  if (operation === "save") return context;
  const saved = await http(
    api.port,
    "PUT",
    context.path,
    { ...actor.headers, "idempotency-key": uuidv7() },
    answers,
  );
  expect(saved.status).toBe(200);
  context.path = `/v1/attempts/${context.attempt.id}/submit`;
  context.method = "POST";
  context.body = {};
  context.expectedStatus = 202;
  return context;
}

function send(context: Context, port = api.port, timeoutMs = 10000): Promise<HttpResponse> {
  return http(
    port,
    context.method,
    context.path,
    { ...context.actor.headers, "idempotency-key": context.key },
    context.body,
    timeoutMs,
  );
}

async function receipt(
  context: Context,
): Promise<{ response: object; http_status: number } | undefined> {
  return (
    await fixture.query<{ response: object; http_status: number }>(
      `
    SELECT
      response,
      http_status
    FROM
      platform.idempotency_receipts
    WHERE
      actor_id = $1
      AND key = $2
    `,
      [context.actor.userId, context.key],
    )
  ).rows[0];
}

async function state(context: Context): Promise<object> {
  const attempts = (
    await fixture.query(
      `
    SELECT
      id,
      revision,
      status,
      submission_id,
      submission_kind,
      started_at,
      deadline
    FROM
      assessment.attempts
    WHERE
      user_id = $1
      AND exam_id = $2
    ORDER BY
      id
    `,
      [context.actor.userId, context.examId],
    )
  ).rows;
  const answers = (
    await fixture.query(
      `
    SELECT
      a.*,
      ARRAY(
        SELECT
          s.option_id
        FROM
          assessment.answer_selections s
        WHERE
          s.attempt_id = a.attempt_id
          AND s.question_id = a.question_id
        ORDER BY
          s.option_id
      ) AS selections
    FROM
      assessment.answers a
      JOIN assessment.attempts t ON t.id = a.attempt_id
    WHERE
      t.user_id = $1
      AND t.exam_id = $2
    ORDER BY
      a.question_id
    `,
      [context.actor.userId, context.examId],
    )
  ).rows;
  const events = (
    await fixture.query(
      `
    SELECT
      o.*
    FROM
      platform.outbox o
      JOIN assessment.attempts t ON t.id = o.aggregate_id
    WHERE
      t.user_id = $1
      AND t.exam_id = $2
    ORDER BY
      o.event_id
    `,
      [context.actor.userId, context.examId],
    )
  ).rows;
  return { attempts, answers, events };
}

async function assertAccepted(context: Context, operation: Operation): Promise<void> {
  const current = (await state(context)) as {
    attempts: { id: string; status: string; revision: number; submission_id: string }[];
    answers: { version: number; selections: string[] }[];
    events: {
      event_id: string;
      correlation_id: string;
      causation_id: string;
      payload: { eventId: string; payload: { submissionId: string } };
    }[];
  };
  expect(current.attempts).toHaveLength(1);
  expect(current.attempts[0]!.status).toBe(operation === "submit" ? "SUBMITTED" : "IN_PROGRESS");
  expect(current.attempts[0]!.revision).toBe(
    operation === "start" ? 1 : operation === "save" ? 2 : 3,
  );
  expect(current.answers).toHaveLength(operation === "start" ? 0 : 1);
  if (operation !== "start") {
    expect(current.answers[0]!.version).toBe(1);
    expect(current.answers[0]!.selections).toEqual([context.optionId]);
  }
  expect(current.events).toHaveLength(operation === "submit" ? 1 : 0);
  if (operation === "submit") {
    expect(current.events[0]!.payload.eventId).toBe(current.events[0]!.event_id);
    expect(current.events[0]!.payload.payload.submissionId).toBe(
      current.attempts[0]!.submission_id,
    );
    expect(current.events[0]!.causation_id).toBe(context.key);
  }
  expect(await receipt(context)).toBeDefined();
  const id = current.attempts[0]!.id;
  const resumed = await http(api.port, "GET", `/v1/attempts/${id}`, context.actor.headers);
  expect(resumed.status).toBe(200);
  expect(envelope<Attempt>(resumed).data.status).toBe(current.attempts[0]!.status);
  expect(resumed.headers["cache-control"]).toBe("no-store");
  expect(resumed.body.toString()).not.toMatch(/Private frozen explanation|correctOption/);
  const answers = await http(api.port, "GET", `/v1/attempts/${id}/answers`, context.actor.headers);
  expect(answers.status).toBe(200);
  const saved = envelope<{ version: number; selectedOptionIds: string[] }[]>(answers).data;
  expect(saved).toHaveLength(operation === "start" ? 0 : 1);
  if (operation !== "start") {
    expect(saved[0]!.version).toBe(1);
    expect(saved[0]!.selectedOptionIds).toEqual([context.optionId]);
  }
}

async function gate(context: Context, mode: "lock" | "sleep" = "lock"): Promise<PoolClient> {
  await fixture.query(`
    CREATE TRIGGER http_receipt_gate
    BEFORE INSERT ON platform.idempotency_receipts
    FOR EACH ROW EXECUTE FUNCTION public.http_receipt_gate('${context.key}', '${mode}')
  `);
  const holder = await fixture.connect();
  holders.add(holder);
  await holder.query("BEGIN");
  if (mode === "lock") await holder.query("SELECT pg_advisory_xact_lock($1)", [advisoryKey]);
  return holder;
}

async function release(holder: PoolClient): Promise<void> {
  if (!holders.delete(holder)) return;
  try {
    await holder.query("ROLLBACK");
  } finally {
    holder.release();
  }
}

async function blocked(holder: PoolClient, mode: "lock" | "sleep" = "lock"): Promise<number> {
  const blocker = (await holder.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!
    .pid;
  return waitFor(async () => {
    const row = (
      await admin.query<{ pid: number }>(
        `
      SELECT
        pid
      FROM
        pg_stat_activity
      WHERE
        datname = $1
        AND usename = $2
        AND query LIKE '%platform.idempotency_receipts%'
        AND (
          ($3 = 'lock' AND $4 = ANY(pg_blocking_pids(pid)))
          OR ($3 = 'sleep' AND wait_event = 'PgSleep')
        )
      `,
        [name, runtimeRole, mode, blocker],
      )
    ).rows[0];
    return row?.pid;
  }, "late pre-COMMIT receipt gate");
}

async function ungate(): Promise<void> {
  await fixture.query("DROP TRIGGER IF EXISTS http_receipt_gate ON platform.idempotency_receipts");
}

async function lostAcknowledgement(
  context: Context,
): Promise<{ committed: HttpResponse; errorCode: string }> {
  let upstreamResult!: (response: HttpResponse) => void;
  const committed = new Promise<HttpResponse>((resolve) => {
    upstreamResult = resolve;
  });
  const proxy: Server = createServer((incoming, downstream) => {
    const forward = request(
      {
        hostname: "127.0.0.1",
        port: api.port,
        path: incoming.url,
        method: incoming.method,
        headers: incoming.headers,
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (value: Buffer) => chunks.push(value));
        response.on("end", () => {
          upstreamResult({
            status: response.statusCode!,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
          downstream.destroy(); // No downstream headers/body/ACK have been sent.
        });
      },
    );
    forward.on("error", () => downstream.destroy());
    incoming.pipe(forward);
  });
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  if (!address || typeof address === "string") throw new Error("No proxy port");
  try {
    const errorCode = await send(context, address.port).then(
      () => "UNEXPECTED_ACK",
      (error: NodeJS.ErrnoException) => error.code ?? "UNKNOWN",
    );
    const response = await Promise.race([
      committed,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("No upstream response")), 2000).unref(),
      ),
    ]);
    return { committed: response, errorCode };
  } finally {
    proxy.closeAllConnections();
    await new Promise<void>((resolve) => proxy.close(() => resolve()));
  }
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  databaseCreated = true;
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtimeRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtimeRole}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: target.toString(), max: 3 });
  await fixture.query(`
    CREATE FUNCTION public.http_receipt_gate() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.key = TG_ARGV[0]::uuid THEN
        IF TG_ARGV[1] = 'lock' THEN
          PERFORM pg_advisory_xact_lock(${advisoryKey});
        ELSE
          PERFORM pg_sleep(30);
        END IF;
      END IF;
      RETURN NEW;
    END
    $fn$
  `);
  passwordHash = await new ArgonPasswords(2, 8).hash(credential);
  adminEmail = (await seedUser("ADMIN")).email;
  secrets = await mkdtemp(join(tmpdir(), "exam-http-faults-"));
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const materials = {
    "private.pem": keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    "public.json": JSON.stringify([
      {
        kid: "http-test",
        publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
      },
    ]),
    "email.json": JSON.stringify({
      activeKid: "mail",
      keys: { mail: randomBytes(32).toString("base64url") },
    }),
    "rate.key": randomBytes(32).toString("base64url"),
    "csrf.key": randomBytes(32).toString("base64url"),
    "leaderboard.key": randomBytes(32).toString("base64url"),
  };
  for (const [file, value] of Object.entries(materials))
    await writeFile(join(secrets, file), value, { mode: 0o600 });
  baseEnv = {
    NODE_ENV: "test",
    PUBLIC_ORIGIN: origin,
    JWT_ISSUER: "urn:test:assessment-http",
    JWT_ACTIVE_KID: "http-test",
    JWT_PRIVATE_KEY_FILE: join(secrets, "private.pem"),
    JWT_PUBLIC_KEYS_FILE: join(secrets, "public.json"),
    EMAIL_KEYS_FILE: join(secrets, "email.json"),
    RATE_KEY_FILE: join(secrets, "rate.key"),
    CSRF_KEY_FILE: join(secrets, "csrf.key"),
    LEADERBOARD_KEY_FILE: join(secrets, "leaderboard.key"),
    MAIL_ADAPTER: "smtp",
    MAIL_FROM: "fixture@example.test",
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: "13025",
    DATABASE_URL: runtimeUrl.toString(),
    DB_SSL: "false",
    DB_POOL_MAX: "2",
    DB_MAX_WAITING: "4",
    DB_ACQUIRE_TIMEOUT_MS: "1000",
    DB_LOCK_TIMEOUT_MS: "8000",
    DB_STATEMENT_TIMEOUT_MS: "15000",
    DB_IDLE_TRANSACTION_TIMEOUT_MS: "20000",
  };
});

beforeEach(async () => {
  api = await launch();
});

afterEach(async () => {
  for (const holder of [...holders]) await release(holder);
  for (const process of [...processes]) await stop(process, "SIGKILL");
  if (fixture) await ungate();
});

afterAll(async () => {
  try {
    await fixture?.end();
    if (!databaseCreated) return;
    await waitFor(async () => {
      const row = (
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
      ).rows[0]!;
      return row.n === 0 ? true : undefined;
    }, "all API/fixture database connections drained");
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`DROP ROLE IF EXISTS ${owner}, ${runtimeRole}`);
  } finally {
    await admin.end();
    if (secrets) await rm(secrets, { recursive: true });
  }
  if (process.env.TEST_ASSESSMENT_HTTP_EVIDENCE)
    await writeFile(
      process.env.TEST_ASSESSMENT_HTTP_EVIDENCE,
      JSON.stringify(
        {
          localOnly: true,
          realHttp: true,
          compiledApi: true,
          restrictedDatabase: true,
          records,
          cleanup: {
            processes: processes.size,
            holders: holders.size,
            databaseDropped: true,
            loginsDropped: true,
            secretsRemoved: true,
          },
        },
        null,
        2,
      ) + "\n",
    );
});

it("serves leaderboard, Admin monitor, submissions/result, question statistics and best/latest through the actual compiled Reporting composition over TCP", async () => {
  const f = await prepare("start", true);
  const versionId = (
    await fixture.query(
      `
    SELECT
      current_version_id
    FROM
      catalog.exams
    WHERE
      id = $1
  `,
      [f.examId],
    )
  ).rows[0]!.current_version_id as string;
  const path = `/v1/exams/${f.examId}/versions/${versionId}/leaderboard`,
    started = performance.now();
  const response = await http(api.port, "GET", path, f.actor.headers);
  expect(response.status).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(envelope(response)).toEqual({
    data: [],
    metadata: { pageSize: 20, next: null },
    errorCode: null,
    message: null,
    status: true,
  });
  expect((await http(api.port, "GET", path)).status).toBe(401);
  expect((await http(api.port, "GET", path + "?pageSize=101", f.actor.headers)).status).toBe(400);
  const adminSession = await session(api.port, adminEmail);
  const monitorPath = `/v1/admin/exams/${f.examId}/active-candidates`;
  const monitor = await http(api.port, "GET", monitorPath, adminSession.headers);
  expect(monitor.status).toBe(200);
  expect(monitor.headers["cache-control"]).toBe("no-store");
  expect(envelope(monitor)).toMatchObject({
    data: [],
    metadata: { pageSize: 20, next: null, asOf: expect.any(String) },
    status: true,
  });
  expect((await http(api.port, "GET", monitorPath, f.actor.headers)).status).toBe(403);
  expect((await http(api.port, "GET", monitorPath)).status).toBe(401);
  expect(
    (await http(api.port, "GET", monitorPath + "?pageSize=101", adminSession.headers)).status,
  ).toBe(400);
  const statisticsPath = `/v1/admin/exams/${f.examId}/versions/${versionId}/question-statistics`;
  const statistics = await http(api.port, "GET", statisticsPath, adminSession.headers);
  expect(statistics.status).toBe(200);
  expect(envelope(statistics)).toMatchObject({
    data: [{ completedAttempts: 0, answered: 0, correct: 0, incorrect: 0, unanswered: 0 }],
    status: true,
  });
  expect((await http(api.port, "GET", statisticsPath, f.actor.headers)).status).toBe(403);
  const candidatesPath = `/v1/admin/exams/${f.examId}/versions/${versionId}/candidate-results`;
  const candidates = await http(api.port, "GET", candidatesPath, adminSession.headers);
  expect(candidates.status).toBe(200);
  expect(envelope(candidates)).toMatchObject({
    data: [],
    metadata: { pageSize: 20, next: null },
    status: true,
  });
  expect((await http(api.port, "GET", candidatesPath, f.actor.headers)).status).toBe(403);
  const metricsPath = "/v1/admin/business-metrics";
  const metrics = await http(api.port, "GET", metricsPath, adminSession.headers);
  expect(metrics.status).toBe(200);
  expect(metrics.headers["cache-control"]).toBe("no-store");
  expect(envelope(metrics)).toMatchObject({
    data: {
      window: { basis: "ATTEMPT_STARTED_AT" },
      counts: { startedAttempts: expect.any(Number) },
      backlog: { pendingAttempts: expect.any(Number) },
    },
    status: true,
  });
  expect((await http(api.port, "GET", metricsPath, f.actor.headers)).status).toBe(403);
  expect((await http(api.port, "GET", metricsPath)).status).toBe(401);
  expect(
    (
      await http(
        api.port,
        "GET",
        metricsPath + "?from=0000-01-01T00%3A00%3A00.000Z&to=0000-01-02T00%3A00%3A00.000Z",
        adminSession.headers,
      )
    ).status,
  ).toBe(400);
  const submissionsPath = `/v1/admin/exams/${f.examId}/submissions`;
  const submissions = await http(api.port, "GET", submissionsPath, adminSession.headers);
  expect(submissions.status).toBe(200);
  expect(envelope(submissions)).toMatchObject({
    data: [],
    metadata: { next: null, pageSize: 20 },
    status: true,
  });
  expect((await http(api.port, "GET", submissionsPath, f.actor.headers)).status).toBe(403);
  expect(
    (await http(api.port, "GET", `/v1/admin/attempts/${randomUUID()}/result`, adminSession.headers))
      .status,
  ).toBe(404);
  records.push({
    operation: "leaderboard",
    fault: "compiled-route-composition",
    durationMs: performance.now() - started,
  });
});

describe.each<Operation>(["start", "save", "submit"])(
  "Compiled Assessment %s HTTP faults",
  (operation) => {
    it("replays the original durable ACK after socket reset and API restart", async () => {
      const started = performance.now();
      const context = await prepare(operation);
      const { committed, errorCode } = await lostAcknowledgement(context);
      expect(errorCode).toBe("ECONNRESET");
      expect(committed.status).toBe(context.expectedStatus);
      expect(await receipt(context)).toEqual({
        response: envelope(committed).data,
        http_status: committed.status,
      });
      const durable = await state(context);
      await stop(api, "SIGKILL");
      api = await launch();
      const replay = await send(context);
      expect(replay.status).toBe(committed.status);
      expect(envelope(replay)).toEqual(envelope(committed));
      expect(replay.headers["idempotency-replayed"]).toBe("true");
      expect(replay.headers["cache-control"]).toBe("no-store");
      expect(await state(context)).toEqual(durable);
      await assertAccepted(context, operation);
      const changedResource = {
        ...context,
        path:
          operation === "start"
            ? `/v1/exams/${randomUUID()}/attempts`
            : `/v1/attempts/${randomUUID()}/${operation === "save" ? "answers" : "submit"}`,
      };
      expect((await send(changedResource)).status).toBe(409);
      expect(await state(context)).toEqual(durable);
      await fixture.query(
        `
        DELETE FROM identity.user_roles
        WHERE
          user_id = $1
          AND role_id = 'CANDIDATE'
      `,
        [context.actor.userId],
      );
      expect((await send(context)).status).toBe(403);
      await fixture.query(
        `
        INSERT INTO
          identity.user_roles (user_id, role_id)
        VALUES
          ($1, 'CANDIDATE')
      `,
        [context.actor.userId],
      );
      // Receipt replay must still check current credentials after a restart.
      const anonymous = await http(
        api.port,
        context.method,
        context.path,
        { origin, "idempotency-key": context.key },
        context.body,
      );
      expect(anonymous.status).toBe(403);
      await fixture.query(
        `
      UPDATE identity.session_families
      SET
        revoked_at = clock_timestamp()
      WHERE
        user_id = $1
    `,
        [context.actor.userId],
      );
      expect((await send(context)).status).toBe(403);
      expect(await state(context)).toEqual(durable);
      records.push({
        operation,
        fault: "lost-ack-restart-current-auth",
        durationMs: performance.now() - started,
      });
    });

    it("rolls back business writes when the API is killed before COMMIT, then retries once", async () => {
      const started = performance.now();
      const context = await prepare(operation);
      const before = await state(context);
      const holder = await gate(context);
      const pending = send(context).then(
        () => "UNEXPECTED_ACK",
        (error: NodeJS.ErrnoException) => error.code,
      );
      await blocked(holder);
      expect(await receipt(context)).toBeUndefined();
      expect(await state(context)).toEqual(before);
      await stop(api, "SIGKILL");
      expect(await pending).toBe("ECONNRESET");
      await release(holder);
      await ungate();
      expect(await state(context)).toEqual(before);
      expect(await receipt(context)).toBeUndefined();
      api = await launch();
      expect((await send(context)).status).toBe(context.expectedStatus);
      await assertAccepted(context, operation);
      const durable = await state(context);
      expect((await send(context)).headers["idempotency-replayed"]).toBe("true");
      expect(await state(context)).toEqual(durable);
      records.push({
        operation,
        fault: "api-kill-before-commit",
        durationMs: performance.now() - started,
      });
    });

    it("returns a safe error and recovers after the transaction backend is terminated", async () => {
      const context = await prepare(operation);
      const before = await state(context);
      const holder = await gate(context);
      const pending = send(context);
      const pid = await blocked(holder);
      await admin.query("SELECT pg_terminate_backend($1)", [pid]);
      const failed = await pending;
      expect(failed.status).toBe(503);
      expect(envelope(failed)).toEqual({
        data: null,
        status: false,
        errorCode: "Service unavailable",
        message: "Service unavailable",
      });
      await release(holder);
      await ungate();
      expect(await state(context)).toEqual(before);
      expect(await receipt(context)).toBeUndefined();
      expect((await send(context)).status).toBe(context.expectedStatus);
      await assertAccepted(context, operation);
      records.push({ operation, fault: "backend-terminated", durationMs: null });
    });

    it.each(["lock", "sleep"] as const)(
      "rolls back a %s timeout and accepts the same retry key",
      async (mode) => {
        await stop(api);
        api = await launch({ DB_LOCK_TIMEOUT_MS: "300", DB_STATEMENT_TIMEOUT_MS: "900" });
        const context = await prepare(operation);
        const before = await state(context);
        const holder = await gate(context, mode);
        const started = performance.now();
        const pending = send(context);
        await blocked(holder, mode);
        const failed = await pending;
        const elapsed = performance.now() - started;
        expect(failed.status).toBe(503);
        expect(envelope(failed).errorCode).toBe("Service unavailable");
        expect(elapsed).toBeLessThan(5000);
        expect(await state(context)).toEqual(before);
        expect(await receipt(context)).toBeUndefined();
        await release(holder);
        await ungate();
        expect((await send(context)).status).toBe(context.expectedStatus);
        await assertAccepted(context, operation);
        records.push({
          operation,
          fault: mode === "lock" ? "lock-timeout" : "statement-timeout",
          durationMs: elapsed,
        });
      },
    );

    it("resolves a client timeout by durable replay after the disconnected write commits", async () => {
      const context = await prepare(operation);
      const holder = await gate(context);
      const pending = send(context, api.port, 300).then(
        () => "UNEXPECTED_ACK",
        (error: NodeJS.ErrnoException) => error.code,
      );
      await blocked(holder);
      expect(await pending).toBe("ETIMEDOUT");
      expect(await receipt(context)).toBeUndefined();
      await release(holder);
      await waitFor(() => receipt(context), "commit after client disconnect");
      await ungate();
      const durable = await state(context);
      const original = await receipt(context);
      await stop(api, "SIGKILL");
      api = await launch();
      const replay = await send(context);
      expect(replay.status).toBe(context.expectedStatus);
      expect(envelope(replay).data).toEqual(original!.response);
      expect(replay.headers["idempotency-replayed"]).toBe("true");
      expect(await state(context)).toEqual(durable);
      await assertAccepted(context, operation);
      records.push({ operation, fault: "client-timeout-commit-restart", durationMs: null });
    });

    it("bounds pool exhaustion without accepting a write, then recovers with the same key", async () => {
      await stop(api);
      api = await launch({ DB_ACQUIRE_TIMEOUT_MS: "250", DB_MAX_WAITING: "1" });
      const occupied = await prepare(operation);
      const context = await prepare(operation);
      const before = await state(context);
      const holder = await gate(occupied);
      const first = send(occupied);
      const firstPid = await blocked(holder);
      const second = send({ ...occupied, key: uuidv7() });
      await waitFor(async () => {
        const row = (
          await admin.query<{ pid: number }>(
            `
          SELECT
            pid
          FROM
            pg_stat_activity
          WHERE
            datname = $1
            AND usename = $2
            AND $3 = ANY(pg_blocking_pids(pid))
        `,
            [name, runtimeRole, firstPid],
          )
        ).rows[0];
        return row?.pid;
      }, "second API pool connection waiting on the first transaction");
      const started = performance.now();
      const waiting = send(context);
      // This extra request exceeds maxWaiting while both clients are held.
      const overloaded = { ...context, key: uuidv7() };
      expect((await send(overloaded)).status).toBe(503);
      expect((await waiting).status).toBe(503);
      const elapsed = performance.now() - started;
      expect(elapsed).toBeLessThan(5000);
      expect(await state(context)).toEqual(before);
      expect(await receipt(context)).toBeUndefined();
      expect(await receipt(overloaded)).toBeUndefined();
      await release(holder);
      expect((await first).status).toBe(occupied.expectedStatus);
      expect((await second).status).toBe(operation === "save" ? 409 : occupied.expectedStatus);
      await ungate();
      expect((await send(context)).status).toBe(context.expectedStatus);
      await assertAccepted(context, operation);
      records.push({ operation, fault: "pool-exhaustion-backpressure", durationMs: elapsed });
    });
  },
);

describe("Assessment writes across independent compiled API tasks", () => {
  it.each<Operation>(["start", "save", "submit"])(
    "commits %s only once across two tasks with the same key",
    async (operation) => {
      const context = await prepare(operation);
      const other = await launch();
      const responses = await Promise.all([send(context), send(context, other.port)]);
      expect(responses.map((r) => r.status)).toEqual([
        context.expectedStatus,
        context.expectedStatus,
      ]);
      expect(envelope(responses[0]!)).toEqual(envelope(responses[1]!));
      expect(responses.filter((r) => r.headers["idempotency-replayed"] === "true")).toHaveLength(1);
      await assertAccepted(context, operation);
      await stop(other);
      records.push({ operation, fault: "two-api-same-key", durationMs: null });
    },
  );

  it("rejects a stale tab and keeps newer answers when an older save receipt is replayed", async () => {
    const context = await prepare("save");
    const other = await launch();
    const competing = {
      ...context,
      key: uuidv7(),
      body: {
        answers: [
          {
            questionId: context.questionId,
            selectedOptionIds: [],
            marked: true,
            expectedVersion: 0,
          },
        ],
      },
    };
    const responses = await Promise.all([send(context), send(competing, other.port)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const winning = responses[0]!.status === 200 ? context : competing;
    const older = responses.find((r) => r.status === 200)!;
    const fresh = {
      ...context,
      key: uuidv7(),
      body: {
        answers: [
          {
            questionId: context.questionId,
            selectedOptionIds: [context.optionId],
            marked: true,
            expectedVersion: 1,
          },
        ],
      },
    };
    expect((await send(fresh, other.port)).status).toBe(200);
    const durable = await state(context);
    const replay = await send(winning);
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    expect(envelope(replay)).toEqual(envelope(older));
    expect(await state(context)).toEqual(durable);
    const changed = {
      ...winning,
      body: {
        answers: [
          {
            questionId: context.questionId,
            selectedOptionIds: [],
            marked: false,
            expectedVersion: 2,
          },
        ],
      },
    };
    expect((await send(changed)).status).toBe(409);
    expect(await state(context)).toEqual(durable);
    await stop(other);
    records.push({ operation: "save", fault: "two-api-stale-tab-old-receipt", durationMs: null });
  });

  it("drains an admitted submit on SIGTERM and replays it after restart", async () => {
    const context = await prepare("submit");
    const holder = await gate(context);
    const pending = send(context);
    await blocked(holder);
    api.child.kill("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(api.child.exitCode).toBeNull();
    expect(api.child.signalCode).toBeNull();
    await release(holder);
    const accepted = await pending;
    expect(accepted.status).toBe(202);
    expect(await api.closed).toEqual({ code: 0, signal: null });
    processes.delete(api);
    await ungate();
    api = await launch();
    const replay = await send(context);
    expect(envelope(replay)).toEqual(envelope(accepted));
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    await assertAccepted(context, "submit");
    records.push({ operation: "submit", fault: "sigterm-drain-restart", durationMs: null });
  });
});
