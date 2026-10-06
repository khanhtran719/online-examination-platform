import { createServer } from "node:http";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { loadRuntimeConfig } from "../../infrastructure/security/authentication/secret-loader";
import { createVerificationWorker } from "../../modules/identity/identity-worker.factory";

async function main(): Promise<void> {
  const config = await loadRuntimeConfig(process.env, "worker");
  const db = new PostgresDatabase(loadDatabaseConfig(process.env));
  await db.query("diagnostic", "SELECT 1");
  const worker = createVerificationWorker(config, db, (event) =>
    process.stdout.write(JSON.stringify({ event: "verification.delivery", ...event }) + "\n"),
  );
  let stopping = false;
  let ready = true;
  let lastMaintenance = 0;
  const server = createServer((request, response) => {
    const live = request.url === "/live";
    const healthy = live || (request.url === "/ready" && ready && !stopping);
    response.writeHead(healthy ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({ status: healthy ? "ok" : "error" }));
  });
  await new Promise<void>((resolve) => server.listen(config.port, "0.0.0.0", resolve));
  const loops = Array.from({ length: config.workerConcurrency }, async () => {
    while (!stopping) {
      try {
        if (Date.now() - lastMaintenance > 60000) {
          lastMaintenance = Date.now();
          await worker.maintain();
        }
        const worked = await worker.runOnce();
        ready = true;
        if (!worked) await new Promise((r) => setTimeout(r, 1000));
      } catch {
        ready = false;
        process.stderr.write('{"event":"worker.poll.failed"}\n');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  });
  let closing = false;
  const stop = async () => {
    if (closing) return;
    closing = true;
    stopping = true;
    ready = false;
    const deadline = setTimeout(() => process.exit(1), 30000);
    deadline.unref();
    await Promise.all(loops);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    worker.close();
    await db.close();
    clearTimeout(deadline);
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      void stop().catch(() => {
        process.exitCode = 1;
      });
    });
  process.stdout.write('{"event":"worker.started"}\n');
}

void main().catch(() => {
  process.stderr.write('{"event":"worker.startup.failed"}\n');
  process.exitCode = 1;
});
