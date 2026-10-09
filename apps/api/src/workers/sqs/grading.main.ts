import { createServer, Server } from "node:http";
import { gradingWorkerConfig } from "../../config/grading-worker.config";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { SqsConsumer } from "../../infrastructure/messaging/sqs/sqs-consumer";
import {
  createGradingConsumer,
  createGradingRecovery,
} from "../../modules/assessment/assessment-worker.factory";
import { createScoringCatalog } from "../../modules/catalog/catalog-worker.factory";
import { processGradingDelivery } from "./grading-delivery";

export async function startGradingWorker(
  env: NodeJS.ProcessEnv,
  observe: (event: Record<string, unknown>) => void = (event) => {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  },
): Promise<{ port: number; stop: () => Promise<void> }> {
  const config = gradingWorkerConfig(env);
  const database = loadDatabaseConfig({ ...env, DB_POOL_MAX: env.DB_POOL_MAX ?? "2" });
  if (config.concurrency > database.max) throw new Error("Grading concurrency exceeds DB pool");
  const emit = (event: Record<string, unknown>) => {
    try {
      observe(event);
    } catch {
      /* sink isolation */
    }
  };
  const totals = {
    completed: 0,
    duplicate: 0,
    quarantined: 0,
    terminal: 0,
    stale: 0,
    failed: 0,
    pollsFailed: 0,
  };
  const bounds = [10, 50, 100, 250, 500, 1000, 5000, Infinity];
  const durations = Array<number>(bounds.length).fill(0);
  let queries = 0,
    lockMs = 0,
    transactionMs = 0;
  const db = new PostgresDatabase(database, (value) => {
    if (value.kind === "query") queries++;
    if (value.kind === "lock") lockMs += value.durationMs;
    if (value.kind === "transaction") transactionMs += value.durationMs;
  });
  const queue = new SqsConsumer(config);
  let server: Server | undefined;
  let stopping = false,
    ready = false,
    lastPoll = 0,
    databaseHealthy = true;
  let closePromise: Promise<void> | undefined;
  const controller = new AbortController();
  const metrics = () =>
    emit({
      event: "grading.metrics",
      ...totals,
      settlementDurationBuckets: durations.slice(),
      bucketBoundsMs: bounds.map((n) => (Number.isFinite(n) ? n : "inf")),
      queries,
      lockMs,
      transactionMs,
      pool: db.stats(),
      memoryBytes: process.memoryUsage().rss,
      cpuMicros: process.cpuUsage(),
    });
  try {
    const authority = (
      await db.query<{ allowed: boolean }>(
        "diagnostic",
        `
      SELECT
        pg_has_role(current_user, $1, 'MEMBER')
        AND NOT has_schema_privilege(current_user, 'identity', 'USAGE')
        AND has_column_privilege(current_user, 'assessment.attempts', 'grading_generation', 'SELECT') AS allowed
    `,
        [
          config.queueMode === "dead-letter"
            ? "examination_grading_recovery"
            : "examination_grading_worker",
        ],
      )
    ).rows[0]?.allowed;
    if (!authority) throw new Error("Dedicated grading database authority required");
    await queue.verify();
    const runtime =
      config.queueMode === "dead-letter"
        ? createGradingRecovery(db)
        : createGradingConsumer(db, createScoringCatalog(db));
    server = createServer((req, res) => {
      const known = ["/live", "/ready"].includes(req.url ?? "");
      const healthy =
        req.url === "/live" ||
        (ready && databaseHealthy && !stopping && Date.now() - lastPoll < 30000);
      res.writeHead(!known ? 404 : healthy ? 200 : 503, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ status: known && healthy ? "ok" : "error" }));
    });
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(config.healthPort, "0.0.0.0", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Grading health listener unavailable");
    const loop = (async () => {
      let failures = 0;
      while (!stopping) {
        try {
          const deliveries = await queue.receive(config.concurrency);
          lastPoll = Date.now();
          // No local leased buffer: every admitted delivery starts immediately.
          const settled = await Promise.allSettled(
            deliveries.map((delivery) =>
              processGradingDelivery({
                delivery,
                queue,
                consume: runtime.consume,
                heartbeatMs: config.heartbeatMs,
                observe: (event) => {
                  const outcome = event.outcome;
                  if (
                    outcome === "completed" ||
                    outcome === "duplicate" ||
                    outcome === "quarantined" ||
                    outcome === "terminal" ||
                    outcome === "stale"
                  )
                    totals[outcome]++;
                  const bucket = bounds.findIndex((bound) => Number(event.durationMs) <= bound);
                  if (bucket >= 0) durations[bucket]!++;
                  // Fixed 5% success trace sample; quarantine warnings are also sampled
                  // to keep a poison flood from becoming a CloudWatch bill flood.
                  if (Math.random() < 0.05) emit(event);
                },
              }),
            ),
          );
          const failed = settled.filter((value) => value.status === "rejected").length;
          totals.failed += failed;
          ready = failed === 0;
          failures = failed ? Math.min(6, failures + 1) : 0;
          if (failed || deliveries.length === 0)
            await delay(failed ? backoff(failures) : 200, controller.signal);
        } catch {
          ready = false;
          totals.pollsFailed++;
          failures = Math.min(6, failures + 1);
          await delay(backoff(failures), controller.signal);
        }
      }
    })();
    let probing = false;
    let healthProbe: Promise<void> = Promise.resolve();
    const sampler = setInterval(() => {
      if (probing || stopping) return;
      probing = true;
      healthProbe = db
        .query("diagnostic", "SELECT 1")
        .then(
          () => {
            databaseHealthy = true;
          },
          () => {
            databaseHealthy = false;
          },
        )
        .finally(() => {
          probing = false;
          metrics();
        });
    }, 30000);
    emit({ event: "grading.worker.started", mode: config.queueMode, port: address.port });
    return {
      port: address.port,
      stop: () => {
        closePromise ??= (async () => {
          stopping = true;
          ready = false;
          controller.abort();
          clearInterval(sampler);
          await loop;
          await healthProbe;
          metrics();
          await new Promise<void>((resolve, reject) =>
            server!.close((error) => (error ? reject(error) : resolve())),
          );
          queue.close();
          await db.close();
        })();
        return closePromise;
      },
    };
  } catch (error) {
    if (server?.listening) await new Promise<void>((resolve) => server!.close(() => resolve()));
    queue.close();
    await db.close();
    throw error;
  }
}
function backoff(failures: number) {
  return Math.floor(Math.min(10000, 200 * 2 ** failures) * (0.8 + Math.random() * 0.4));
}
function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}
if (typeof require !== "undefined" && require.main === module) {
  startGradingWorker(process.env)
    .then((handle) => {
      let exiting = false;
      const stop = () => {
        if (exiting) return;
        exiting = true;
        const forced = setTimeout(() => process.exit(1), 30000);
        void handle.stop().then(
          () => {
            clearTimeout(forced);
            process.exitCode = 0;
          },
          () => {
            clearTimeout(forced);
            process.exitCode = 1;
          },
        );
      };
      process.once("SIGTERM", stop);
      process.once("SIGINT", stop);
      process.stdout.write('{"event":"grading.worker.signals"}\n');
    })
    .catch(() => {
      process.stderr.write('{"event":"grading.start.failed"}\n');
      process.exitCode = 1;
    });
}
