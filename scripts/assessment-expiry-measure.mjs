import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import pg from "pg";

const require = createRequire(import.meta.url);
const { databaseConfig } = require("../dist/config/database.config.js");
const { loadMigrations, migrate } = require("../dist/infrastructure/database/migration-runner.js");
const {
  PostgresDatabase,
} = require("../dist/infrastructure/database/transaction/postgres-database.js");
const {
  DeadlineSweep,
} = require("../dist/modules/assessment/application/services/deadline-sweep.js");
const {
  PostgresAttemptRepository,
  claimDueSql,
} = require("../dist/modules/assessment/infrastructure/persistence/postgres-attempt.repository.js");
const {
  PostgresSubmissionOutbox,
} = require("../dist/modules/assessment/infrastructure/persistence/postgres-submission-outbox.js");

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("TEST_DATABASE_ADMIN_URL required");
const evidenceDir = process.env.EXPIRY_EVIDENCE_DIR ?? "docs/evidence/assessment-expiry-2026-10-08";
const rawDir = `${evidenceDir}/raw`;
const stamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "");
const sourceFiles = [
  "apps/api/src/modules/assessment/application/services/attempt-submission.ts",
  "apps/api/src/modules/assessment/application/services/deadline-sweep.ts",
  "apps/api/src/modules/assessment/application/services/expiry-supervisor.ts",
  "apps/api/src/modules/assessment/assessment-worker.factory.ts",
  "apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.repository.ts",
  "apps/api/src/workers/scheduler/expiry.main.ts",
  "apps/api/src/config/expiry-worker.config.ts",
  "apps/api/src/infrastructure/database/migrations/0011_submission_kind.sql",
  "docs/contracts/attempt-submitted.v1.schema.json",
];

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarizeDurations(observations, kind) {
  const samples = observations.filter((item) => item.kind === kind).map((item) => item.durationMs);
  return {
    count: samples.length,
    totalMs: samples.reduce((sum, value) => sum + value, 0),
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
  };
}

async function fileHashes() {
  const hashes = {};
  for (const path of sourceFiles) {
    hashes[path] = createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
  }
  return hashes;
}

function dbConfig(databaseUrl, poolMax) {
  return databaseConfig({
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    DB_POOL_MAX: String(poolMax),
    DB_MAX_WAITING: "4",
    DB_ACQUIRE_TIMEOUT_MS: "1000",
    DB_STATEMENT_TIMEOUT_MS: "2000",
    DB_LOCK_TIMEOUT_MS: "500",
    DB_IDLE_TRANSACTION_TIMEOUT_MS: "5000",
    DB_SSL: "false",
  });
}

async function provision(admin, spec) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const database = `expiry_measure_${suffix}`;
  const owner = `measure_ddl_${suffix}`;
  const expiryLogin = `measure_worker_${suffix}`;
  const password = randomUUID();
  await admin.query(`CREATE DATABASE ${database}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${database} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${expiryLogin} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_expiry_worker TO ${expiryLogin}`);
  const base = new URL(adminUrl);
  base.pathname = `/${database}`;
  const ownerUrl = new URL(base);
  ownerUrl.username = owner;
  ownerUrl.password = password;
  const expiryUrl = new URL(base);
  expiryUrl.username = expiryLogin;
  expiryUrl.password = password;
  await migrate(
    dbConfig(ownerUrl.toString(), 1),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  const fixture = new pg.Pool({ connectionString: base.toString(), max: 2 });
  await publishOne(fixture);
  await seed(fixture, spec);
  return { database, owner, expiryLogin, fixture, expiryUrl: expiryUrl.toString() };
}

async function publishOne(fixture) {
  const client = await fixture.connect();
  try {
    await client.query("BEGIN");
    const userId = randomUUID();
    const examId = randomUUID();
    const versionId = randomUUID();
    const sectionId = randomUUID();
    const questionId = randomUUID();
    const optionA = randomUUID();
    const optionB = randomUUID();
    await client.query(
      `INSERT INTO identity.users (id, email, password_hash, display_name)
       VALUES ($1, $2, 'fixture-not-a-real-password-hash', 'Publisher')`,
      [userId, `${userId}@example.test`],
    );
    await client.query(
      `INSERT INTO catalog.exams (
         id, title, category, duration_seconds, attempt_limit, opens_at, closes_at, display_timezone
       ) VALUES (
         $1, 'Expiry measure', 'IT_CERTIFICATION', 90, 10,
         clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day', 'Asia/Ho_Chi_Minh'
       )`,
      [examId],
    );
    await client.query(
      `INSERT INTO catalog.published_versions (
         id, exam_id, version, title, description, duration_seconds, attempt_limit,
         opens_at, closes_at, display_timezone, explanation_policy, category, published_by
       ) VALUES (
         $1, $2, 1, 'Expiry measure', '', 90, 10,
         clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day',
         'Asia/Ho_Chi_Minh', 'NEVER', 'IT_CERTIFICATION', $3
       )`,
      [versionId, examId, userId],
    );
    await client.query(
      `INSERT INTO catalog.published_sections (version_id, id, title, position) VALUES ($1, $2, 'One', 1)`,
      [versionId, sectionId],
    );
    await client.query(
      `INSERT INTO catalog.published_questions (
         version_id, id, section_id, source_question_id, source_revision, type, prompt, explanation, points, position
       ) VALUES ($1, $2, $3, $4, 1, 'SINGLE_CHOICE', 'Prompt', 'hidden', 5, 1)`,
      [versionId, questionId, sectionId, randomUUID()],
    );
    await client.query(
      `INSERT INTO catalog.published_options (version_id, question_id, id, position, text)
       VALUES ($1, $2, $3, 1, 'A'), ($1, $2, $4, 2, 'B')`,
      [versionId, questionId, optionA, optionB],
    );
    await client.query(
      `INSERT INTO catalog.published_answer_keys (version_id, question_id, option_id) VALUES ($1, $2, $3)`,
      [versionId, questionId, optionA],
    );
    await client.query(
      `UPDATE catalog.exams SET published = true, current_version_id = $2, revision = 2 WHERE id = $1`,
      [examId, versionId],
    );
    await client.query("COMMIT");
    return { examId, versionId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function seed(fixture, spec) {
  const version = (
    await fixture.query("SELECT id, exam_id FROM catalog.published_versions LIMIT 1")
  ).rows[0];
  if (!version) throw new Error("Publication missing");
  await insertAttempts(fixture, version, spec.due, "due");
  await insertAttempts(fixture, version, spec.future, "future");
  await insertAttempts(fixture, version, spec.submitted, "submitted");
  await insertAttempts(fixture, version, spec.expired, "expired");
  await insertAttempts(fixture, version, spec.failed, "failed");
  await fixture.query("ANALYZE assessment.attempts");
}

async function insertAttempts(fixture, version, count, kind) {
  if (count < 1) return;
  if (kind === "due" || kind === "future") {
    await fixture.query(
      `WITH people AS (
         INSERT INTO identity.users (id, email, password_hash, display_name)
         SELECT gen_random_uuid(), replace(gen_random_uuid()::text, '-', '') || '@example.test',
                'fixture-not-a-real-password-hash', 'Measure'
         FROM generate_series(1, $3)
         RETURNING id
       ), numbered AS (
         SELECT id, row_number() OVER () AS n FROM people
       )
       INSERT INTO assessment.attempts (
         id, user_id, exam_id, version_id, status, started_at, deadline, revision
       )
       SELECT gen_random_uuid(), id, $1, $2, 'IN_PROGRESS',
              clock_timestamp() - interval '2 hours',
              CASE
                WHEN $4 = 'future' THEN clock_timestamp() + interval '1 hour'
                ELSE clock_timestamp() - (((n % 60) + 1) * interval '1 second')
              END,
              1
       FROM numbered`,
      [version.exam_id, version.id, count, kind],
    );
    return;
  }
  await fixture.query(
    `WITH people AS (
       INSERT INTO identity.users (id, email, password_hash, display_name)
       SELECT gen_random_uuid(), replace(gen_random_uuid()::text, '-', '') || '@example.test',
              'fixture-not-a-real-password-hash', 'Measure'
       FROM generate_series(1, $3)
       RETURNING id
     )
     INSERT INTO assessment.attempts (
       id, user_id, exam_id, version_id, status, started_at, deadline, submitted_at,
       submission_id, submission_event_id, expired, failure_code, revision, submission_kind
     )
     SELECT gen_random_uuid(), id, $1, $2,
            CASE $4
              WHEN 'submitted' THEN 'SUBMITTED'
              WHEN 'expired' THEN 'EXPIRED'
              ELSE 'FAILED'
            END,
            clock_timestamp() - interval '2 days',
            CASE WHEN $4 = 'expired' THEN clock_timestamp() - interval '1 day'
                 ELSE clock_timestamp() + interval '1 hour' END,
            CASE WHEN $4 = 'expired' THEN clock_timestamp() - interval '1 day'
                 ELSE clock_timestamp() - interval '30 minutes' END,
            gen_random_uuid(), gen_random_uuid(),
            $4 = 'expired',
            CASE WHEN $4 = 'failed' THEN 'SCORE_UNAVAILABLE' ELSE NULL END,
            2,
            CASE WHEN $4 = 'expired' THEN 'DEADLINE' ELSE 'MANUAL' END
     FROM people`,
    [version.exam_id, version.id, count, kind],
  );
}

function walkIndex(plan, found = []) {
  if (!plan || typeof plan !== "object") return found;
  if (typeof plan["Index Name"] === "string") found.push(plan["Index Name"]);
  for (const child of plan.Plans ?? []) walkIndex(child, found);
  return found;
}

function stripQueryText(value) {
  if (Array.isArray(value)) return value.map(stripQueryText);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "Query Text")
      .map(([key, item]) => [key, stripQueryText(item)]),
  );
}

async function explainClaim(fixture, expiryUrl) {
  const client = await fixture.connect();
  const expiry = new pg.Pool({ connectionString: expiryUrl, max: 1 });
  try {
    const natural = await client.query(`EXPLAIN (FORMAT JSON) ${claimDueSql}`, [[]]);
    await client.query("BEGIN");
    await client.query("SET LOCAL enable_seqscan = off");
    const indexed = await client.query(`EXPLAIN (FORMAT JSON) ${claimDueSql}`, [[]]);
    await client.query("ROLLBACK");
    const worker = await expiry.connect();
    let analyzed;
    try {
      await worker.query("BEGIN");
      analyzed = await worker.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${claimDueSql}`, [[]]);
      await worker.query("ROLLBACK");
    } finally {
      worker.release();
    }
    const naturalPlan = stripQueryText(natural.rows[0]["QUERY PLAN"]);
    const indexedPlan = stripQueryText(indexed.rows[0]["QUERY PLAN"]);
    const analyzedPlan = stripQueryText(analyzed.rows[0]["QUERY PLAN"]);
    return {
      naturalIndexes: walkIndex(naturalPlan[0]?.Plan),
      forcedIndexes: walkIndex(indexedPlan[0]?.Plan),
      analyzedIndexes: walkIndex(analyzedPlan[0]?.Plan),
      naturalPlan,
      indexedPlan,
      analyzedPlan,
    };
  } finally {
    client.release();
    await expiry.end();
  }
}

async function backlog(fixture) {
  const row = (
    await fixture.query(`
      SELECT count(*) FILTER (
               WHERE status = 'IN_PROGRESS' AND deadline <= clock_timestamp()
             )::int AS due,
             (
               extract(epoch FROM (
                 clock_timestamp() - min(deadline) FILTER (
                   WHERE status = 'IN_PROGRESS' AND deadline <= clock_timestamp()
                 )
               )) * 1000
             )::float8 AS oldest_ms
      FROM assessment.attempts
    `)
  ).rows[0];
  return {
    due: Number(row.due),
    oldestDueAgeMs: row.oldest_ms === null ? null : Number(row.oldest_ms),
  };
}

async function lags(fixture) {
  const rows = (
    await fixture.query(`
      SELECT (extract(epoch FROM (submitted_at - deadline)) * 1000)::float8 AS lag_ms
      FROM assessment.attempts
      WHERE status = 'EXPIRED'
        AND submission_kind = 'DEADLINE'
        AND submitted_at >= clock_timestamp() - interval '15 minutes'
    `)
  ).rows.map((row) => Number(row.lag_ms));
  return {
    sampleCount: rows.length,
    p50Ms: percentile(rows, 0.5),
    p95Ms: percentile(rows, 0.95),
    p99Ms: percentile(rows, 0.99),
    minMs: rows.length ? Math.min(...rows) : null,
    maxMs: rows.length ? Math.max(...rows) : null,
  };
}

async function skipLockedProbe(fixture, sweep) {
  const pending = await backlog(fixture);
  if (pending.due !== 0) return { measured: false, reason: "backlog remained before the probe" };
  const version = (
    await fixture.query("SELECT id, exam_id FROM catalog.published_versions LIMIT 1")
  ).rows[0];
  await insertAttempts(fixture, version, 2, "due");
  const pair = (
    await fixture.query(`
      SELECT id FROM assessment.attempts
      WHERE status = 'IN_PROGRESS' AND deadline <= clock_timestamp()
      ORDER BY deadline, id
      LIMIT 2
    `)
  ).rows;
  const oldest = pair[0]?.id;
  const younger = pair[1]?.id;
  if (!oldest || !younger) return { measured: false, reason: "probe pair missing" };
  const holder = await fixture.connect();
  await holder.query("BEGIN");
  await holder.query("SELECT id FROM assessment.attempts WHERE id = $1 FOR UPDATE", [oldest]);
  const running = sweep.runOnce(randomUUID());
  let waiting = null;
  let youngerExpired = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const locks = (
      await fixture.query(
        `SELECT count(*) FILTER (WHERE NOT granted)::int AS waiting
         FROM pg_locks l
         JOIN pg_stat_activity a ON a.pid = l.pid
         WHERE a.datname = current_database()`,
      )
    ).rows[0];
    const youngerStatus = (
      await fixture.query("SELECT status FROM assessment.attempts WHERE id = $1", [younger])
    ).rows[0].status;
    waiting = Number(locks.waiting);
    if (youngerStatus === "EXPIRED") {
      youngerExpired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await running;
  const oldestStatus = (
    await fixture.query("SELECT status FROM assessment.attempts WHERE id = $1", [oldest])
  ).rows[0].status;
  await holder.query("ROLLBACK");
  holder.release();
  return {
    measured: true,
    youngerExpiredWhileOldestHeld: youngerExpired,
    lockWaitsObserved: waiting,
    oldestStatusWhileHeld: oldestStatus,
  };
}

async function measureSweep(admin, spec, hashes, serverVersion) {
  const resources = await provision(admin, spec);
  const observations = [];
  const db = new PostgresDatabase(dbConfig(resources.expiryUrl, spec.poolMax), (value) =>
    observations.push(value),
  );
  try {
    const plans = await explainClaim(resources.fixture, resources.expiryUrl);
    const before = await backlog(resources.fixture);
    const sweep = new DeadlineSweep(
      new PostgresAttemptRepository(db),
      new PostgresSubmissionOutbox(db),
      db,
      spec.batchSize,
    );
    observations.length = 0;
    const cpuStart = process.cpuUsage();
    const rssStart = process.memoryUsage().rss;
    const started = performance.now();
    const ticks = [];
    for (let guard = 0; guard < 500; guard += 1) {
      const tickStarted = performance.now();
      const result = await sweep.runOnce(randomUUID());
      ticks.push({
        processed: result.processed,
        skipped: result.skipped,
        failed: result.failed,
        empty: result.empty,
        due: result.due,
        oldestDueAgeMs: result.oldestDueAgeMs,
        durationMs: performance.now() - tickStarted,
      });
      if (result.empty) break;
    }
    const wallMs = performance.now() - started;
    const cpu = process.cpuUsage(cpuStart);
    const rssEnd = process.memoryUsage().rss;
    const processed = ticks.reduce((sum, tick) => sum + tick.processed, 0);
    const skipped = ticks.reduce((sum, tick) => sum + tick.skipped, 0);
    const failed = ticks.reduce((sum, tick) => sum + tick.failed, 0);
    const lag = await lags(resources.fixture);
    const after = await backlog(resources.fixture);
    const probe = await skipLockedProbe(resources.fixture, sweep);
    const pool = db.stats();
    return {
      capturedAt: new Date().toISOString(),
      scenario: spec.name,
      harness: "in-process DeadlineSweep",
      firstMeasured: spec.firstMeasured,
      repeat: spec.repeat,
      differentConfig: spec.differentConfig,
      schedulerBaselineThroughput: null,
      baselineReason:
        "No scheduler existed before ATT-07. A before throughput number is not invented.",
      dataset: {
        due: spec.due,
        future: spec.future,
        submitted: spec.submitted,
        alreadyExpired: spec.expired,
        failed: spec.failed,
      },
      config: {
        batchSize: spec.batchSize,
        poolMax: spec.poolMax,
        statementTimeoutMs: 2000,
        lockTimeoutMs: 500,
        concurrency: 1,
        transaction: "one attempt",
      },
      postgresVersion: serverVersion,
      node: process.version,
      hashes,
      before,
      after,
      ticks: ticks.length,
      processed,
      skipped,
      failed,
      wallMs,
      processedPerSecond: wallMs > 0 ? (processed * 1000) / wallMs : null,
      deadlineToCommitLagMs: lag,
      lagMatchesProcessed: lag.sampleCount === processed,
      observations: {
        query: summarizeDurations(observations, "query"),
        lock: summarizeDurations(observations, "lock"),
        acquire: summarizeDurations(observations, "acquire"),
        transaction: summarizeDurations(observations, "transaction"),
        poolError: observations.filter((item) => item.kind === "pool.error").length,
        maxWaiting: observations.reduce((max, item) => Math.max(max, item.waiting), 0),
      },
      pool,
      process: {
        cpuUserMicros: cpu.user,
        cpuSystemMicros: cpu.system,
        rssStartBytes: rssStart,
        rssEndBytes: rssEnd,
      },
      skipLockedProbe: probe,
      plans: {
        naturalIndexes: plans.naturalIndexes,
        forcedIndexes: plans.forcedIndexes,
        analyzedIndexes: plans.analyzedIndexes,
        natural: plans.naturalPlan,
        indexed: plans.indexedPlan,
        analyzed: plans.analyzedPlan,
      },
      unmeasured: [
        "sqsDispatchLatency",
        "resultAvailabilityLatency",
        "awsCost",
        "sustainableCapacity",
        "productionSlo",
        "blockedLockWaitDuringUncontendedBurst",
      ],
      notes: [
        "deadlineToCommitLagMs is database commit lag, not queue dispatch or result latency.",
        "CPU and RSS include this measurement process, not a separate host.",
        "Lock observations are successful FOR UPDATE timings. The skip-locked probe records whether a waiter appeared.",
      ],
    };
  } finally {
    await db.close();
    await destroy(admin, resources);
  }
}

function workerEnv(databaseUrl, batchSize) {
  return {
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    DB_POOL_MAX: "2",
    DB_MAX_WAITING: "4",
    DB_ACQUIRE_TIMEOUT_MS: "1000",
    DB_STATEMENT_TIMEOUT_MS: "2000",
    DB_LOCK_TIMEOUT_MS: "500",
    DB_IDLE_TRANSACTION_TIMEOUT_MS: "5000",
    DB_SSL: "false",
    EXPIRY_POLL_INTERVAL_MS: "5000",
    EXPIRY_BATCH_SIZE: String(batchSize),
    EXPIRY_JITTER_PERCENT: "0",
    EXPIRY_BACKOFF_INITIAL_MS: "200",
    EXPIRY_BACKOFF_MAX_MS: "30000",
    EXPIRY_HEALTH_PORT: "0",
  };
}

function spawnWorker(databaseUrl, batchSize) {
  let buffer = "";
  const child = spawn(process.execPath, ["dist/workers/scheduler/expiry.main.js"], {
    env: workerEnv(databaseUrl, batchSize),
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
  });
  return {
    child,
    events() {
      return buffer
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line))
        .map((event) => ({
          event: event.event,
          port: event.port,
          processed: event.processed,
          skipped: event.skipped,
          failed: event.failed,
          due: event.due,
          oldestDueAgeMs: event.oldestDueAgeMs,
          durationMs: event.durationMs,
        }));
    },
  };
}

async function waitFor(read, predicate, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const found = read().find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
}

async function stopChild(child) {
  if (child.exitCode !== null) return { code: child.exitCode, drainMs: 0 };
  const started = performance.now();
  child.kill("SIGTERM");
  const code = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(1);
    }, 10_000);
    child.once("exit", (value) => {
      clearTimeout(timer);
      resolve(value ?? 1);
    });
  });
  return { code, drainMs: performance.now() - started };
}

async function sampleProcess(pid) {
  return new Promise((resolve) => {
    const child = spawn("/bin/ps", ["-o", "rss=,%cpu=,time=", "-p", String(pid)]);
    let text = "";
    child.stdout.on("data", (chunk) => {
      text += chunk.toString("utf8");
    });
    child.on("exit", () => {
      const parts = text.trim().split(/\s+/);
      if (parts.length < 3) {
        resolve(null);
        return;
      }
      resolve({ rssKb: Number(parts[0]), cpuPercent: Number(parts[1]), cpuTime: parts[2] });
    });
  });
}

async function measureWorker(admin, spec, hashes, serverVersion) {
  const resources = await provision(admin, spec);
  const samples = [];
  try {
    const before = await backlog(resources.fixture);
    const first = spawnWorker(resources.expiryUrl, spec.batchSize);
    const startedEvent = await waitFor(
      first.events,
      (event) => event.event === "expiry.started",
      5000,
    );
    const signals = await waitFor(first.events, (event) => event.event === "expiry.signals", 5000);
    let live = null;
    let ready = null;
    if (startedEvent?.port) {
      live = await fetch(`http://127.0.0.1:${startedEvent.port}/live`);
      ready = await fetch(`http://127.0.0.1:${startedEvent.port}/ready`);
    }
    const sampler = setInterval(() => {
      void sampleProcess(first.child.pid).then((sample) => {
        if (sample) samples.push(sample);
      });
    }, 100);
    await waitFor(
      first.events,
      (event) => event.event === "expiry.sweep" && Number(event.processed) > 0,
      10_000,
    );
    const stopped = await stopChild(first.child);
    clearInterval(sampler);
    const partial = await backlog(resources.fixture);
    const second = spawnWorker(resources.expiryUrl, spec.batchSize);
    await waitFor(second.events, (event) => event.event === "expiry.signals", 5000);
    const restarted = performance.now();
    let drained = false;
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const remaining = await backlog(resources.fixture);
      if (remaining.due === 0) {
        drained = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const restartWallMs = performance.now() - restarted;
    const finalStop = await stopChild(second.child);
    const counts = (
      await resources.fixture.query(`
        SELECT
          (SELECT count(*)::int FROM assessment.attempts WHERE status = 'EXPIRED' AND submission_kind = 'DEADLINE' AND submitted_at >= clock_timestamp() - interval '15 minutes') AS expired,
          (SELECT count(*)::int FROM platform.outbox) AS outbox,
          (SELECT count(DISTINCT aggregate_id)::int FROM platform.outbox) AS aggregates
      `)
    ).rows[0];
    return {
      capturedAt: new Date().toISOString(),
      scenario: spec.name,
      harness: "compiled dist/workers/scheduler/expiry.main.js",
      firstMeasured: false,
      repeat: false,
      differentConfig: false,
      schedulerBaselineThroughput: null,
      baselineReason:
        "No scheduler existed before ATT-07. A before throughput number is not invented.",
      dataset: {
        due: spec.due,
        future: spec.future,
        submitted: spec.submitted,
        alreadyExpired: spec.expired,
        failed: spec.failed,
      },
      config: {
        batchSize: spec.batchSize,
        poolMax: spec.poolMax,
        pollIntervalMs: 5000,
        jitterPercent: 0,
        healthPort: 0,
      },
      postgresVersion: serverVersion,
      node: process.version,
      hashes,
      before,
      afterSignal: partial,
      health: {
        signals: signals !== null,
        liveStatus: live?.status ?? null,
        readyStatus: ready?.status ?? null,
        liveBody: live ? await live.json() : null,
        readyBody: ready ? await ready.json() : null,
      },
      sigterm: stopped,
      restart: { drained, wallMs: restartWallMs, exitCode: finalStop.code },
      durable: {
        expired: Number(counts.expired),
        outbox: Number(counts.outbox),
        distinctAggregates: Number(counts.aggregates),
        duplicateEvents: Number(counts.outbox) !== Number(counts.aggregates),
      },
      processSamples: samples,
      maxRssKb: samples.reduce((max, sample) => Math.max(max, sample.rssKb), 0) || null,
      sweepEvents: first.events().filter((event) => event.event === "expiry.sweep").length,
      unmeasured: [
        "sqsDispatchLatency",
        "resultAvailabilityLatency",
        "awsCost",
        "sustainableCapacity",
        "productionSlo",
        "inProcessQueryCounts",
        "poolCheckoutWait",
      ],
      notes: [
        "Process RSS/CPU samples come from ps during the first process only.",
        "SIGTERM is sent after the first non-empty sweep log. Restart drains the remaining due rows.",
        "Database commit completion is not SQS dispatch or result latency.",
      ],
    };
  } finally {
    await destroy(admin, resources);
  }
}

async function destroy(admin, resources) {
  await resources.fixture.end().catch(() => undefined);
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [resources.database],
  );
  await admin.query(`DROP DATABASE IF EXISTS ${resources.database}`);
  await admin.query(`DROP ROLE IF EXISTS ${resources.owner}`);
  await admin.query(`DROP ROLE IF EXISTS ${resources.expiryLogin}`);
}

function markdown(results) {
  const lines = [
    "# ATT-07 local measurement",
    "",
    "Generated from append-only raw JSON. Scheduler throughput has no before value.",
    "Deadline-to-commit lag includes the seeded overdue age, up to 60 seconds before the sweep starts. It is not SQS dispatch or result latency.",
    "These runs do not establish capacity, an SLO, or AWS savings.",
    "",
    "| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Lag p50/p95/p99 ms |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
  ];
  for (const result of results) {
    const captured = result.capturedAt ?? "";
    if (result.harness.startsWith("compiled")) {
      lines.push(
        `| ${captured} | ${result.scenario} | compiled worker | ${result.dataset.due} | ${result.durable.expired} |  | ${result.restart.wallMs.toFixed(1)} |  | drained ${result.restart.drained}; duplicates ${result.durable.duplicateEvents}; SIGTERM ${result.sigterm.code} |`,
      );
      continue;
    }
    const lag = result.deadlineToCommitLagMs;
    lines.push(
      `| ${captured} | ${result.scenario} | in-process | ${result.dataset.due} | ${result.processed} | ${result.failed} | ${result.wallMs.toFixed(1)} | ${result.processedPerSecond?.toFixed(2) ?? ""} | ${lag.p50Ms?.toFixed(1) ?? "null"} / ${lag.p95Ms?.toFixed(1) ?? "null"} / ${lag.p99Ms?.toFixed(1) ?? "null"} |`,
    );
  }
  lines.push(
    "",
    "The unconstrained claim plan at this sample size is a sequential scan. `attempts_deadline` appears when sequential scan is disabled. Manual HTTP query counts are statement counts, not scheduler throughput.",
    "",
  );
  return lines.join("\n");
}

async function writeSummary() {
  const names = (await readdir(rawDir)).filter((name) => name.endsWith(".json")).sort();
  const results = [];
  for (const name of names) results.push(JSON.parse(await readFile(`${rawDir}/${name}`, "utf8")));
  await writeFile(`${evidenceDir}/measurement-summary.md`, markdown(results));
}

const scenarios = [
  {
    name: "mixed-batch50-pool2",
    due: 200,
    future: 100,
    submitted: 40,
    expired: 40,
    failed: 20,
    batchSize: 50,
    poolMax: 2,
    firstMeasured: false,
    repeat: false,
    differentConfig: false,
  },
  {
    name: "burst2000-batch50-pool2-run1",
    due: 2000,
    future: 100,
    submitted: 25,
    expired: 25,
    failed: 0,
    batchSize: 50,
    poolMax: 2,
    firstMeasured: true,
    repeat: false,
    differentConfig: false,
  },
  {
    name: "burst2000-batch50-pool2-run2",
    due: 2000,
    future: 100,
    submitted: 25,
    expired: 25,
    failed: 0,
    batchSize: 50,
    poolMax: 2,
    firstMeasured: false,
    repeat: true,
    differentConfig: false,
  },
  {
    name: "burst2000-batch10-pool2",
    due: 2000,
    future: 100,
    submitted: 25,
    expired: 25,
    failed: 0,
    batchSize: 10,
    poolMax: 2,
    firstMeasured: false,
    repeat: false,
    differentConfig: true,
  },
];

const only = process.env.EXPIRY_MEASURE_ONLY;
const admin = new pg.Pool({ connectionString: adminUrl, max: 1 });
const hashes = await fileHashes();
const serverVersion = (await admin.query("SHOW server_version")).rows[0].server_version;
await mkdir(rawDir, { recursive: true });
const written = [];
if (only !== "worker") {
  for (const scenario of scenarios) {
    const result = await measureSweep(admin, scenario, hashes, serverVersion);
    const path = `${rawDir}/${stamp}-${scenario.name}.json`;
    await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    written.push(result);
    process.stdout.write(
      `${JSON.stringify({ event: "expiry.measure.saved", scenario: scenario.name, processed: result.processed, failed: result.failed })}\n`,
    );
  }
}
if (only === "sweep") {
  await writeSummary();
  await admin.end();
  process.exit(0);
}
const worker = await measureWorker(
  admin,
  {
    name: "worker-burst2000-batch50-pool2",
    due: 2000,
    future: 50,
    submitted: 0,
    expired: 0,
    failed: 0,
    batchSize: 50,
    poolMax: 2,
  },
  hashes,
  serverVersion,
);
const workerPath = `${rawDir}/${stamp}-worker-burst2000-batch50-pool2.json`;
await writeFile(workerPath, `${JSON.stringify(worker, null, 2)}\n`, { flag: "wx" });
written.push(worker);
await writeSummary();
await admin.end();
process.stdout.write(
  `${JSON.stringify({ event: "expiry.measure.complete", files: written.length, duplicateEvents: worker.durable.duplicateEvents, drained: worker.restart.drained })}\n`,
);
