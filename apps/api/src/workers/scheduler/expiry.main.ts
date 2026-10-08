import { createServer, Server } from "node:http";
import { randomUUID } from "node:crypto";
import { expiryWorkerConfig } from "../../config/expiry-worker.config";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { createExpiryWorker } from "../../modules/assessment/assessment-worker.factory";

export interface ExpiryHandle {
  port: number;
  stop: () => Promise<void>;
}

function interruptibleDelay(ms: number, stopping: () => boolean): Promise<void> {
  if (ms <= 0 || stopping()) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      clearInterval(watch);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const watch = setInterval(() => {
      if (stopping()) finish();
    }, 25);
  });
}

/** Process lifecycle only. Business submission stays in the Assessment application. */
export async function startExpiryWorker(
  env: NodeJS.ProcessEnv,
  log: (event: Record<string, unknown>) => void = (event) => {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  },
): Promise<ExpiryHandle> {
  const config = expiryWorkerConfig(env);
  const db = new PostgresDatabase(loadDatabaseConfig(env));
  await db.query("diagnostic", "SELECT 1");
  const worker = createExpiryWorker(db, config.batchSize);
  let stopping = false;
  let ready = true;
  let closing = false;
  const server = createServer((request, response) => {
    const live = request.url === "/live";
    const healthy = live || (request.url === "/ready" && ready && !stopping);
    response.writeHead(healthy ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ status: healthy ? "ok" : "error" }));
  });
  const port = await listen(server, config.healthPort);
  const loop = worker.supervise({
    timing: config,
    stopping: () => stopping,
    newTickId: randomUUID,
    log,
    onReady: (value) => {
      ready = value;
    },
    delay: (ms) => interruptibleDelay(ms, () => stopping),
  });
  log({ event: "expiry.started", port });
  return {
    port,
    stop: async () => {
      if (closing) return;
      closing = true;
      stopping = true;
      ready = false;
      await loop;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await db.close();
    },
  };
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Health port unavailable"));
        return;
      }
      resolve(address.port);
    });
  });
}

const entry = process.argv[1] ?? "";
const direct =
  entry.endsWith("/expiry.main.js") ||
  entry.endsWith("/expiry.main.ts") ||
  entry.endsWith("\\expiry.main.js") ||
  entry.endsWith("\\expiry.main.ts");
if (direct) {
  void startExpiryWorker(process.env)
    .then((handle) => {
      let closing = false;
      const stop = () => {
        if (closing) return;
        closing = true;
        const deadline = setTimeout(() => process.exit(1), 30_000);
        deadline.unref();
        void handle.stop().then(
          () => clearTimeout(deadline),
          () => {
            process.exitCode = 1;
          },
        );
      };
      process.once("SIGTERM", stop);
      process.once("SIGINT", stop);
      process.stdout.write('{"event":"expiry.signals"}\n');
    })
    .catch(() => {
      process.stderr.write('{"event":"expiry.startup.failed"}\n');
      process.exitCode = 1;
    });
}
