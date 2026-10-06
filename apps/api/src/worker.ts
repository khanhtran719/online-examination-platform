import { createServer } from "node:http";
import { databaseConfig } from "./platform/infrastructure/database/database-config";
import { PostgresDatabase } from "./platform/infrastructure/database/postgres-database";
import { loadRuntimeConfig } from "./platform/infrastructure/security/runtime-config";
import { PostgresSecurity } from "./platform/infrastructure/security/postgres-security";
import { PostgresVerificationDelivery } from "./modules/identity/infrastructure/persistence/postgres-verification-delivery";
import { createVerificationSecrets } from "./modules/identity/infrastructure/security/identity-runtime";
import {
  SesVerificationMail,
  SmtpVerificationMail,
} from "./modules/identity/infrastructure/mail/verification-mail";
import { VerificationWorker } from "./modules/identity/application/verification-worker";

async function main(): Promise<void> {
  const config = await loadRuntimeConfig(process.env, "worker");
  const db = new PostgresDatabase(databaseConfig(process.env));
  await db.query("diagnostic", "SELECT 1");
  const mail =
    config.mail.adapter === "ses"
      ? new SesVerificationMail(config.mail.region, config.mail.from, config.mail.configurationSet)
      : new SmtpVerificationMail(config.mail.host, config.mail.port, config.mail.from);
  const delivery = new PostgresVerificationDelivery(db);
  const security = new PostgresSecurity(db, config.rateKey);
  const worker = new VerificationWorker(
    delivery,
    createVerificationSecrets(config.emailKeys.activeKid, config.emailKeys.keys),
    mail,
    config.origin,
    (event) =>
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
          await delivery.cleanup();
          await security.purgeExpired();
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
    mail.close();
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
