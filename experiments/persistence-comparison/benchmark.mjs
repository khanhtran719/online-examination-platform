import { performance, PerformanceObserver } from "node:perf_hooks";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import os from "node:os";
import { createCandidate } from "./candidates.mjs";
import { disposableFixture, activatedSession } from "./fixture.mjs";
import { cryptoFixture, identityFixture, freshKey } from "./runtime.mjs";
import { seedIdentity, cleanIdentities } from "./seed.mjs";
import { summarize, quantiles } from "./statistics.mjs";

const root = new URL("../../", import.meta.url),
  here = new URL("./", import.meta.url);
async function sourceDigest(directory, hash = createHash("sha256")) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (entry.isDirectory()) await sourceDigest(new URL(entry.name + "/", directory), hash);
    else if (entry.name.endsWith(".ts")) {
      hash.update(entry.name);
      hash.update(await readFile(new URL(entry.name, directory)));
    }
  }
  return hash;
}
const report = {
  timestamp: new Date().toISOString(),
  scope: "local closed-loop Identity comparison, not sustainable capacity/AWS/SLO/cost proof",
  machine: {
    arch: os.arch(),
    platform: os.platform(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0].model,
    totalMemoryBytes: os.totalmem(),
    node: process.version,
  },
  sourceSha256: (await sourceDigest(new URL("apps/api/src/", root))).digest("hex"),
  config: {
    pool: 4,
    maxWaiting: 32,
    acquireMs: 1000,
    statementMs: 2000,
    lockMs: 500,
    idleTransactionMs: 5000,
    concurrency: [1, 8, 32],
    blocks: 5,
    samplesPerWorkload: 256,
    warmup: 32,
    argon: { memoryKiB: 19456, timeCost: 2, parallelism: 1 },
    redis: false,
    aws: false,
    tcoUsd: null,
  },
  startup: [],
  runs: [],
  gc: [],
  limitations: [
    "shared local host",
    "closed-loop coordinated omission",
    "small per-run p99 tail",
    "no DB/container CPU isolation",
    "RSS is not allocation/request",
    "Identity-only dataset",
    "no x86_64/AWS/TLS/failover/cost proof",
    "Sequelize native rollback warning remains an adoption logging concern",
  ],
};
const crypto = await cryptoFixture(),
  fixture = await disposableFixture();
const configs = ["pg", "typeorm.raw", "sequelize.raw", "typeorm.mapped", "sequelize.mapped"];
const gc = [];
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries())
    gc.push({ durationMs: entry.duration, kind: entry.detail.kind });
});
observer.observe({ entryTypes: ["gc"] });
function coldStartup(candidate) {
  return new Promise((resolve, reject) => {
    const at = performance.now(),
      child = spawn(process.execPath, [new URL("startup.mjs", here).pathname], {
        env: {
          ...process.env,
          PERSISTENCE_CANDIDATE: candidate,
          PERSISTENCE_CONFIG: JSON.stringify(fixture.config),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", () => undefined);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error("Startup child failed"));
      else resolve({ candidate, wallMs: performance.now() - at, ...JSON.parse(output) });
    });
  });
}
async function dbSnapshot() {
  const database = (
    await fixture.fixture.query(
      "SELECT numbackends,xact_commit,xact_rollback,blks_read,blks_hit,temp_bytes,deadlocks FROM pg_stat_database WHERE datname=current_database()",
    )
  ).rows[0];
  const statements = (
    await fixture.fixture.query(
      "SELECT coalesce(sum(calls),0)::float8 calls,coalesce(sum(total_exec_time),0)::float8 exec_ms,coalesce(sum(shared_blks_hit),0)::float8 shared_hits,coalesce(sum(shared_blks_read),0)::float8 shared_reads FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database())",
    )
  ).rows[0];
  return { database, statements };
}
async function workload(db, events, count, concurrency, work) {
  global.gc?.();
  await new Promise((done) => setImmediate(done));
  const before = events.length,
    gcBefore = gc.length,
    cpu = process.cpuUsage(),
    memory = process.memoryUsage(),
    at = performance.now(),
    samples = [];
  let next = 0,
    peakRssBytes = memory.rss;
  await Promise.all(
    Array.from({ length: concurrency }, async (_, worker) => {
      while (next < count) {
        const ordinal = next++,
          start = performance.now();
        let ok = true,
          code;
        try {
          await work(worker, ordinal);
        } catch (error) {
          ok = false;
          code = error.code ?? "UNEXPECTED";
        }
        peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
        samples.push({ ordinal, ms: performance.now() - start, ok, ...(code ? { code } : {}) });
      }
    }),
  );
  const elapsed = performance.now() - at,
    usage = process.cpuUsage(cpu),
    after = process.memoryUsage();
  const observations = events.slice(before),
    queries = observations.filter((e) => e.kind === "query"),
    picks = (kind) =>
      quantiles(observations.filter((e) => e.kind === kind).map((e) => e.durationMs));
  return {
    ...summarize(samples, elapsed),
    raw: samples.sort((a, b) => a.ordinal - b.ordinal),
    cpuMsPerOperation: (usage.user + usage.system) / 1000 / count,
    memory: {
      rssBytes: after.rss,
      peakRssBytes,
      rssDeltaBytes: after.rss - memory.rss,
      heapUsedBytes: after.heapUsed,
      heapDeltaBytes: after.heapUsed - memory.heapUsed,
    },
    gc: gc.slice(gcBefore),
    db: {
      queries: queries.length,
      queriesPerOperation: queries.length / count,
      queryMs: picks("query"),
      poolAcquireMs: picks("acquire"),
      lockMs: picks("lock"),
      transactionMs: picks("transaction"),
      maxTotal: Math.max(0, ...observations.map((e) => e.total)),
      maxWaiting: Math.max(0, ...observations.map((e) => e.waiting)),
    },
  };
}
try {
  report.gitHead = (
    await promisify(execFile)("git", ["rev-parse", "HEAD"], { cwd: root.pathname })
  ).stdout.trim();
  report.migrations = fixture.migrations.map(({ name, checksum }) => ({ name, checksum }));
  report.database = (await fixture.fixture.query("SELECT version() version")).rows[0].version;
  const seedAt = performance.now();
  await seedIdentity(fixture.fixture, crypto.dummy);
  report.dataset = {
    baselineUsers: 100000,
    baselineRoleMemberships: 100000,
    baselineFamilies: 100000,
    baselineSessions: 100000,
    maxTemporaryUsers: 32,
    seedMs: performance.now() - seedAt,
    databaseBytes: Number(
      (await fixture.fixture.query("SELECT pg_database_size(current_database()) bytes")).rows[0]
        .bytes,
    ),
  };
  report.settings = (
    await fixture.fixture.query(
      "SELECT name,setting FROM pg_settings WHERE name IN ('max_connections','shared_buffers','work_mem','synchronous_commit','max_locks_per_transaction','shared_preload_libraries') ORDER BY name",
    )
  ).rows;
  const explain = (
    await fixture.fixture.query(
      "EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id,email,display_name,revision FROM identity.users WHERE email=$1",
      ["seed-50000@example.test"],
    )
  ).rows[0]["QUERY PLAN"];
  // Synthetic values only; remove expression literals from retained plan.
  function safePlan(value) {
    if (Array.isArray(value)) return value.map(safePlan);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !["Index Cond", "Filter", "Output"].includes(key))
          .map(([key, v]) => [key, safePlan(v)]),
      );
    return value;
  }
  report.accountPlan = safePlan(explain);
  for (let block = 0; block < 5; block++)
    for (const candidate of ["pg", "typeorm", "sequelize"])
      report.startup.push({ block, ...(await coldStartup(candidate)) });
  for (let block = 0; block < 5; block++) {
    const order = [...configs.slice(block), ...configs.slice(0, block)];
    for (const concurrency of [1, 8, 32])
      for (const mode of order) {
        const [candidate, path] = mode.split("."),
          events = [];
        const db = await createCandidate(candidate, fixture.config, (event) => events.push(event));
        const states = [];
        try {
          const { repo, identity } = identityFixture(db, crypto, path === "mapped");
          for (let i = 0; i < concurrency; i++) {
            const pair = await activatedSession(db, crypto);
            states.push({ ...pair, revision: 1, email: `${pair.userId}@example.test` });
          }
          const operations = {
            account: async (worker) => {
              if (!(await repo.accountByEmail(states[worker].email)))
                throw new Error("Missing account");
            },
            principal: (worker) => identity.authenticate(states[worker].access),
            refresh: async (worker) => {
              Object.assign(states[worker], await identity.refresh(states[worker].refresh));
            },
            profile: async (worker) => {
              const state = states[worker],
                receipt = await identity.updateProfile(
                  state.access,
                  freshKey(),
                  {
                    displayName: "Benchmark candidate",
                    leaderboardOptIn: false,
                    expectedRevision: state.revision,
                  },
                  crypto.codec.id(),
                );
              state.revision = receipt.revision;
            },
          };
          const measured = {};
          for (const [label, work] of Object.entries(operations)) {
            const warmup = await workload(db, events, 32, concurrency, work);
            if (warmup.errors) throw new Error(`Warmup failed: ${mode}/${label}`);
            const before = await dbSnapshot();
            measured[label] = await workload(db, events, 256, concurrency, work);
            measured[label].databaseBefore = before;
            measured[label].databaseAfter = await dbSnapshot();
            if (measured[label].errors)
              throw new Error(`Hard failure during measurement: ${mode}/${label}`);
          }
          report.runs.push({ block, concurrency, mode, measurements: measured });
          process.stdout.write(
            JSON.stringify({
              block,
              concurrency,
              mode,
              errors: 0,
              profileP95Ms: measured.profile.latencyMs.p95,
            }) + "\n",
          );
        } finally {
          await db.close();
          await cleanIdentities(
            fixture.fixture,
            states.map((s) => s.userId),
          );
        }
      }
  }
  report.completedAt = new Date().toISOString();
  await writeFile(new URL("raw.json", here), JSON.stringify(report, null, 2) + "\n");
} catch (error) {
  report.failure = { message: error.message, code: error.code };
  await writeFile(new URL("failed-run.json", here), JSON.stringify(report, null, 2) + "\n");
  throw error;
} finally {
  observer.disconnect();
  await fixture.close();
}
