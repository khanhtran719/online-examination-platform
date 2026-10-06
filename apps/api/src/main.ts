import { AppModule } from "./app.module";
import { PostgresDatabase } from "./infrastructure/database/transaction/postgres-database";
import { loadRuntimeConfig } from "./infrastructure/security/authentication/secret-loader";
import { createHttpApplication } from "./infrastructure/http/configure-http-application";

async function main(): Promise<void> {
  const config = await loadRuntimeConfig(process.env, "api");
  const api = await createHttpApplication(AppModule.forRoot(config), {
    trustedProxies: config.trustedProxies,
    log: (value) => process.stdout.write(JSON.stringify(value) + "\n"),
  });
  await api.app.listen(config.port, "0.0.0.0");
  process.stdout.write(JSON.stringify({ event: "api.started", port: config.port }) + "\n");
  const database = api.app.get(PostgresDatabase);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    api.drain();
    const deadline = setTimeout(() => {
      process.stderr.write('{"event":"shutdown.timeout"}\n');
      process.exit(1);
    }, 30000);
    deadline.unref();
    await api.app.close();
    await database.close();
    clearTimeout(deadline);
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const)
    process.once(signal, () => {
      void stop().catch(() => {
        process.exitCode = 1;
      });
    });
}

void main().catch(() => {
  process.stderr.write('{"event":"api.startup.failed"}\n');
  process.exitCode = 1;
});
