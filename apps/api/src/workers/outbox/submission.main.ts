import { createServer, Server } from "node:http";
import { dispatchWorkerConfig } from "../../config/dispatch-worker.config";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { SqsPublisher } from "../../infrastructure/messaging/sqs/sqs-publisher";
import { createSubmissionPublisher } from "../../modules/assessment/assessment-worker.factory";

export interface SubmissionPublisherHandle {
  port: number;
  stop: () => Promise<void>;
}
export async function startSubmissionPublisher(
  env: NodeJS.ProcessEnv,
  log: (event: Record<string, unknown>) => void = (event) => {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  },
): Promise<SubmissionPublisherHandle> {
  const config = dispatchWorkerConfig(env);
  const database = loadDatabaseConfig({ ...env, DB_POOL_MAX: env.DB_POOL_MAX ?? "2" });
  // Claim statement may consume statementMs after assigning a lease, and ACK
  // tasks may wait for a bounded pool wave. No local send queue is permitted.
  const budget =
    config.timeoutMs +
    database.statementMs +
    Math.ceil(config.concurrency / database.max) * (database.acquireMs + database.statementMs) +
    1000;
  if (config.leaseMs <= budget) throw new Error("Dispatch lease must exceed send/DB budget");
  const emit = (event: Record<string, unknown>) => {
    try {
      log(event);
    } catch {
      /* Log sinks do not control delivery. */
    }
  };
  const db = new PostgresDatabase(database);
  const queue = new SqsPublisher(config);
  let server: Server | undefined;
  try {
    await db.query("diagnostic", "SELECT 1");
    let stopping = false;
    let ready = false;
    let brokerHealthy = true;
    let closePromise: Promise<void> | undefined;
    const controller = new AbortController();
    // Fixed buckets and counters only; no IDs/payloads in metric dimensions.
    const bounds = [10, 50, 100, 250, 500, 1000, 5000, Infinity];
    const durations = Array<number>(bounds.length).fill(0);
    const totals = { claimed: 0, delivered: 0, retried: 0, parked: 0, fenced: 0 };
    const worker = createSubmissionPublisher(db, queue, config, (event) => {
      if (event.event === "submission.published") {
        brokerHealthy = true;
        const duration = Number(event.durationMs);
        const index = bounds.findIndex((bound) => duration <= bound);
        if (index >= 0) durations[index]! += 1;
      } else {
        if (
          ["QUEUE_UNAVAILABLE", "QUEUE_REJECTED", "RETRY_EXHAUSTED"].includes(String(event.code))
        ) {
          brokerHealthy = false;
        }
        emit(event);
      }
    });
    server = createServer((request, response) => {
      const known = ["/live", "/ready"].includes(request.url ?? "");
      const healthy = request.url === "/live" || (ready && brokerHealthy && !stopping);
      response.writeHead(!known ? 404 : healthy ? 200 : 503, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(JSON.stringify({ status: known && healthy ? "ok" : "error" }));
    });
    const port = await listen(server, config.healthPort);
    let lastMetrics = 0;
    const loop = worker.supervise({
      timing: config,
      stopping: () => stopping,
      onReady: (value) => {
        ready = value;
      },
      delay: (ms) => delay(ms, controller.signal),
      observe: (result) => {
        if (!result) emit({ event: "submission.poll.failed" });
        else
          for (const key of Object.keys(totals) as Array<keyof typeof totals>)
            totals[key] += result[key];
        if (Date.now() - lastMetrics >= 30000) {
          lastMetrics = Date.now();
          emit({
            event: "submission.metrics",
            ...totals,
            publishAckDurationBuckets: durations.slice(),
            bucketBoundsMs: bounds.map((value) => (Number.isFinite(value) ? value : "inf")),
            pool: db.stats(),
          });
        }
      },
    });
    // Independent bounded-rate backlog sampling: never a query per published event.
    let metricsPending: Promise<void> = Promise.resolve();
    let sampling = false;
    const backlog = () => {
      if (sampling || stopping) return;
      sampling = true;
      metricsPending = worker
        .backlog()
        .then(
          (value) => {
            emit({ event: "submission.backlog", ...value });
          },
          () => {
            emit({ event: "submission.backlog.failed" });
          },
        )
        .finally(() => {
          sampling = false;
        });
    };
    backlog();
    const sampler = setInterval(backlog, 30000);
    emit({ event: "submission.publisher.started", port });
    return {
      port,
      stop: () => {
        closePromise ??= (async () => {
          stopping = true;
          ready = false;
          controller.abort();
          clearInterval(sampler);
          await loop;
          await metricsPending;
          await new Promise<void>((done, reject) =>
            server!.close((error) => (error ? reject(error) : done())),
          );
          queue.close();
          await db.close();
        })();
        return closePromise;
      },
    };
  } catch (error) {
    if (server?.listening) await new Promise<void>((done) => server!.close(() => done()));
    queue.close();
    await db.close();
    throw error;
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((done) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      done();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      const address = server.address();
      if (!address || typeof address === "string") reject(new Error("Health listener unavailable"));
      else done(address.port);
    });
  });
}

if (/[/\\]submission\.main\.(js|ts)$/.test(process.argv[1] ?? "")) {
  void startSubmissionPublisher(process.env)
    .then((handle) => {
      let closing = false;
      const stop = () => {
        if (closing) return;
        closing = true;
        const deadline = setTimeout(() => process.exit(1), 30000);
        deadline.unref();
        void handle.stop().then(
          () => {
            clearTimeout(deadline);
          },
          () => {
            process.exitCode = 1;
          },
        );
      };
      process.once("SIGTERM", stop);
      process.once("SIGINT", stop);
      process.stdout.write('{"event":"submission.publisher.signals"}\n');
    })
    .catch(() => {
      process.stderr.write('{"event":"submission.publisher.startup.failed"}\n');
      process.exitCode = 1;
    });
}
