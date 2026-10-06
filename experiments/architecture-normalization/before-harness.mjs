import { createRequire } from "node:module";
import { randomBytes, randomUUID, generateKeyPairSync } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import os from "node:os";
import pg from "pg";
const require = createRequire(import.meta.url);
const { Module } = require("@nestjs/common");
const {
  PostgresDatabase,
} = require("../dist/platform/infrastructure/database/postgres-database.js");
const { databaseConfig } = require("../dist/platform/infrastructure/database/database-config.js");
const {
  loadMigrations,
  migrate,
} = require("../dist/platform/infrastructure/database/migration-runner.js");
const {
  PostgresSecurity,
} = require("../dist/platform/infrastructure/security/postgres-security.js");
const {
  PostgresIdempotency,
} = require("../dist/platform/infrastructure/database/postgres-idempotency.js");
const { ShutdownGate } = require("../dist/platform/application/shutdown-gate.js");
const { READINESS } = require("../dist/platform/application/readiness.js");
const {
  createHttpApplication,
} = require("../dist/platform/presentation/http/configure-http-application.js");
const { LiveController } = require("../dist/platform/presentation/http/health/live.controller.js");
const {
  ReadyController,
} = require("../dist/platform/presentation/http/health/ready.controller.js");
const { IdentityService } = require("../dist/modules/identity/application/identity.service.js");
const {
  PostgresIdentityRepository,
} = require("../dist/modules/identity/infrastructure/persistence/postgres-identity.repository.js");
const {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} = require("../dist/modules/identity/infrastructure/security/identity-crypto.js");
const {
  IdentityController,
} = require("../dist/modules/identity/presentation/http/identity.controller.js");
const { HTTP_SESSION } = require("../dist/modules/identity/presentation/http/http-session.port.js");
const { HttpSession } = require("../dist/modules/identity/infrastructure/http/http-session.js");
const { VerificationWorker } = require("../dist/modules/identity/application/verification-worker.js");
const { PostgresVerificationDelivery } = require("../dist/modules/identity/infrastructure/persistence/postgres-verification-delivery.js");
const { MailDeliveryError } = require("../dist/modules/identity/application/ports/verification-delivery.port.js");
const base = new URL(process.env.TEST_DATABASE_ADMIN_URL ?? "");
if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost"].includes(base.hostname))
  throw new Error("Disposable local benchmark only");
const name = `identity_bench_${randomUUID().replaceAll("-", "")}`,
  suffix = name.slice(-12),
  ddl = `bench_ddl_${suffix}`,
  runtime = `bench_app_${suffix}`,
  credential = randomUUID();
const fixtureUrl = new URL(base);
fixtureUrl.pathname = `/${name}`;
const ddlUrl = new URL(fixtureUrl);
ddlUrl.username = ddl;
ddlUrl.password = credential;
const appUrl = new URL(fixtureUrl);
appUrl.username = runtime;
appUrl.password = credential;
const admin = new pg.Pool({ connectionString: base.toString(), max: 1 }),
  fixture = new pg.Pool({ connectionString: fixtureUrl.toString(), max: 1 });
const keyPair = generateKeyPairSync("ec", { namedCurve: "prime256v1" }),
  key = {
    kid: "benchmark-key",
    privatePem: keyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keyPair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
const tokens = await JwtSessionTokens.create("urn:local:benchmark:identity", key, [key]),
  codec = new VerificationCodec("mail", { mail: randomBytes(32) }),
  passwords = new ArgonPasswords(2, 8),
  dummy = await passwords.hash("benchmark dummy password"),
  rateKey = randomBytes(32),
  csrfKey = randomBytes(32),
  origin = "http://127.0.0.1:3000";
const databases = [],
  apis = [],
  observations = [];
const quantiles = (values) => {
  const v = [...values].sort((a, b) => a - b);
  return {
    p50: v[Math.max(0, Math.ceil(v.length * 0.5) - 1)] ?? 0,
    p95: v[Math.max(0, Math.ceil(v.length * 0.95) - 1)] ?? 0,
    p99: v[Math.max(0, Math.ceil(v.length * 0.99) - 1)] ?? 0,
  };
};
const report = {
  timestamp: new Date().toISOString(),
  scope: "local diagnostic; not sustainable capacity or AWS SLO/cost evidence",
  machine: {
    arch: os.arch(),
    platform: os.platform(),
    cpus: os.cpus().length,
    node: process.version,
  },
  configuration: {
    apiInstances: 2,
    poolPerInstance: 4,
    argon: { memoryKiB: 19456, timeCost: 2, parallelism: 1, concurrency: 2 },
    users: 32,
    redis: false,
    tls: "loopback HTTP with explicit client cookie jar; browser HTTPS gate pending",
  },
  measurements: {},
};
async function measure(label, count, work) {
  const values = [],
    before = observations.length,
    cpu = process.cpuUsage(),
    rss = process.memoryUsage().rss,
    start = performance.now();
  let errors = 0;
  for (let i = 0; i < count; i++) {
    const at = performance.now();
    try {
      await work(i);
    } catch {
      errors++;
    }
    values.push(performance.now() - at);
  }
  const elapsed = performance.now() - start,
    usage = process.cpuUsage(cpu),
    events = observations.slice(before);
  report.measurements[label] = {
    samples: count,
    errors,
    durationMs: elapsed,
    achievedRps: count / (elapsed / 1000),
    latencyMs: quantiles(values),
    rawLatencyMs: values,
    cpuMsPerOperation: (usage.user + usage.system) / 1000 / count,
    rssDeltaBytes: process.memoryUsage().rss - rss,
    rssBytes: process.memoryUsage().rss,
    dbQueriesPerOperation: events.filter((e) => e.kind === "query").length / count,
    dbPoolWaitMs: quantiles(events.filter((e) => e.kind === "acquire").map((e) => e.durationMs)),
    dbTransactionMs: quantiles(
      events.filter((e) => e.kind === "transaction").map((e) => e.durationMs),
    ),
  };
}
try {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${ddl} LOGIN NOINHERIT PASSWORD '${credential}'`);
  await admin.query(`CREATE ROLE ${runtime} LOGIN INHERIT PASSWORD '${credential}'`);
  await admin.query(`GRANT examination_owner TO ${ddl}`);
  await admin.query(`GRANT examination_runtime TO ${runtime}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/migrations"),
  );
  report.database = (await fixture.query("SELECT version() version")).rows[0].version;
  const identities = [];
  for (let i = 0; i < 2; i++) {
    const db = new PostgresDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: appUrl.toString(), DB_POOL_MAX: "4" }),
      (e) => observations.push(e),
    );
    databases.push(db);
    const security = new PostgresSecurity(db, rateKey),
      identity = new IdentityService(
        new PostgresIdentityRepository(db),
        db,
        passwords,
        tokens,
        codec,
        dummy,
        security,
        new PostgresIdempotency(db),
      );
    identities.push(identity);
    class BenchModule {}
    Module({
      controllers: [IdentityController, LiveController, ReadyController],
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: HTTP_SESSION, useValue: new HttpSession(identity, security, origin, csrfKey) },
        { provide: READINESS, useValue: { check: () => db.query("diagnostic", "SELECT 1") } },
        ShutdownGate,
      ],
    })(BenchModule);
    const api = await createHttpApplication(BenchModule);
    await api.app.listen(0, "127.0.0.1");
    apis.push({ api, url: await api.app.getUrl() });
  }
  const users = [];
  for (let i = 0; i < 32; i++) {
    const email = `${randomUUID()}@example.test`;
    await identities[0].register({
      email,
      displayName: "Benchmark",
      password: "fixture benchmark password",
    });
    const c = (
      await fixture.query(
        "SELECT c.id,c.ciphertext FROM identity.verification_challenges c JOIN identity.users u ON u.id=c.user_id WHERE u.email=$1",
        [email],
      )
    ).rows[0];
    await identities[0].confirm(await codec.open(c.ciphertext, c.id), "fixture benchmark password");
    users.push({ email, cookies: new Map() });
  }
  async function call(i, user, path, method = "GET", body, expectedStatus = 200) {
    const target = apis[i % 2],
      headers = { cookie: [...user.cookies].map(([k, v]) => `${k}=${v}`).join("; ") };
    if (method !== "GET") {
      headers.origin = origin;
      headers["x-csrf-token"] = user.cookies.get("__Host-csrf");
      if (body !== undefined) headers["content-type"] = "application/json";
    }
    const response = await fetch(target.url + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0],
        eq = pair.indexOf("=");
      user.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const value = await response.json();
    if (response.status !== expectedStatus) throw new Error("Benchmark operation rejected");
    return value;
  }
  for (const user of users) await call(0, user, "/v1/auth/csrf");
  await measure("login.http", 64, (i) =>
    call(i, users[i % 32], "/v1/auth/login", "POST", {
      email: users[i % 32].email,
      password: "fixture benchmark password",
    }),
  );
  await measure("me.http", 200, (i) => call(i, users[i % 32], "/v1/me"));
  await measure("refresh.http", 64, (i) => call(i, users[i % 32], "/v1/auth/refresh", "POST"));
  await measure("logout.http", 32, (i) => call(i, users[i % 32], "/v1/auth/logout", "POST"));
  const absent = users.map(() => ({ email: `${randomUUID()}@example.test`, cookies: new Map() }));
  for (const user of absent) await call(0, user, "/v1/auth/csrf");
  await measure("login.invalid.absent.http", 32, (i) =>
    call(
      i,
      absent[i],
      "/v1/auth/login",
      "POST",
      { email: absent[i].email, password: "wrong fixture password" },
      401,
    ),
  );
  for (const user of users) await call(0, user, "/v1/auth/csrf");
  await measure("login.invalid.existing.http", 32, (i) =>
    call(
      i,
      users[i],
      "/v1/auth/login",
      "POST",
      { email: users[i].email, password: "wrong fixture password" },
      401,
    ),
  );
  const input = {
    userId: randomUUID(),
    sessionId: randomUUID(),
    familyId: randomUUID(),
    now: Date.now(),
    absoluteExpiresAt: Date.now() + 30 * 86400000,
  };
  let issued;
  await measure("jwt.sign", 100, async () => {
    issued = await tokens.issue(input);
  });
  report.tokenBytes = {
    access: Buffer.byteLength(issued.access),
    refresh: Buffer.byteLength(issued.refresh),
  };
  await measure("jwt.verify", 200, () => tokens.verify(issued.access, "access"));
  for (const concurrency of [1, 2, 4]) {
    const hashing = new ArgonPasswords(concurrency, 8),
      cpu = process.cpuUsage(),
      start = performance.now(),
      samples = [];
    for (let batch = 0; batch < 8; batch++)
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          const at = performance.now();
          await hashing.hash("fixture benchmark password");
          samples.push(performance.now() - at);
        }),
      );
    const ms = performance.now() - start,
      usage = process.cpuUsage(cpu);
    report.measurements[`argon.hash.c${concurrency}`] = {
      samples: samples.length,
      latencyMs: quantiles(samples),
      rawLatencyMs: samples,
      achievedJobsPerSec: samples.length / (ms / 1000),
      cpuMsPerOperation: (usage.user + usage.system) / 1000 / samples.length,
      rssBytes: process.memoryUsage().rss,
    };
  }
  const delivery = new PostgresVerificationDelivery(databases[0]);
  const mailSuccess = { send: async () => undefined };
  const successWorker = new VerificationWorker(delivery, codec, mailSuccess, origin);
  for (let i = 0; i < 32; i++)
    await identities[0].register({ email: `delivery${i}@example.test`, displayName: "Delivery", password: "delivery fixture password" });
  await measure("worker.accepted", 32, async () => {
    if (!(await successWorker.runOnce())) throw new Error("Missing delivery job");
  });
  if ((await fixture.query("SELECT count(*)::int n FROM identity.email_intents WHERE delivered_at IS NOT NULL")).rows[0].n !== 32)
    throw new Error("Delivery result not durable");
  for (let i = 0; i < 16; i++)
    await identities[0].register({ email: `retry${i}@example.test`, displayName: "Retry", password: "delivery fixture password" });
  const retryWorker = new VerificationWorker(delivery, codec, { send: async () => { throw new MailDeliveryError(true); } }, origin);
  await measure("worker.retry", 16, async () => {
    if (!(await retryWorker.runOnce())) throw new Error("Missing retry job");
  });
  if ((await fixture.query("SELECT count(*)::int n FROM identity.email_intents WHERE delivered_at IS NULL AND attempts=1 AND lease_token IS NULL AND parked_at IS NULL")).rows[0].n !== 16)
    throw new Error("Retry disposition not durable");
  report.cost = {
    awsCostPerHour: null,
    costPerMillionRequests: null,
    reason: "No AWS resources or bill measurement",
  };
  await mkdir("experiments/identity-local", { recursive: true });
  await writeFile("experiments/identity-local/latest.json", JSON.stringify(report, null, 2) + "\n");
  const errors = Object.values(report.measurements).reduce((n, r) => n + (r.errors ?? 0), 0);
  process.stdout.write(
    JSON.stringify({
      event: "identity.benchmark.completed",
      artifact: "experiments/identity-local/latest.json",
      operations: Object.keys(report.measurements),
      errors,
    }) + "\n",
  );
  if (errors) process.exitCode = 1;
} finally {
  for (const { api } of apis) await api.app.close();
  for (const db of databases) await db.close();
  await fixture.end();
  for (let i = 0; i < 100; i++) {
    if (
      (await admin.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=$1", [name]))
        .rows[0].n === 0
    )
      break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`DROP ROLE IF EXISTS ${ddl},${runtime}`);
  await admin.end();
}
