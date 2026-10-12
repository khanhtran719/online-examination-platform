import { randomUUID } from "node:crypto";

import { auditRetentionConfig } from "@config/audit-retention.config";
import { loadDatabaseConfig } from "@infrastructure/database/load-database-config";
import { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";
import { PostgresAuditRetention } from "@infrastructure/observability/audit/postgres-audit-retention";
import { AuditRetention } from "@shared/application/services/audit-retention";

/** Finite scheduled job. Scheduling/overlap belongs to the deployer; no permanent service. */
export async function runAuditRetentionJob(
  env: NodeJS.ProcessEnv,
  stopping: () => boolean = () => false,
  log: (event: Record<string, unknown>) => void = (event) =>
    process.stdout.write(JSON.stringify(event) + "\n"),
) {
  const config = auditRetentionConfig(env);
  if (!config.enabled) {
    log({ event: "audit.retention.disabled" });
    return;
  }
  const db = new PostgresDatabase(
    loadDatabaseConfig({ ...env, DB_POOL_MAX: "1", DB_MAX_WAITING: "1" }),
  );
  const tickId = randomUUID(),
    started = performance.now();
  try {
    const authority = (
      await db.query<{ allowed: boolean }>(
        "diagnostic",
        `
        SELECT has_function_privilege(
          current_user,
          'platform.prune_audit(integer,uuid)',
          'EXECUTE'
        ) AS allowed
      `,
      )
    ).rows[0];
    if (!authority?.allowed) throw new Error("Maintenance authority required");
    log({ event: "audit.retention.started", tickId });
    const result = await new AuditRetention(
      new PostgresAuditRetention(db),
      db,
      config.batch,
    ).runOnce(tickId, stopping);
    log({
      event: "audit.retention.completed",
      tickId,
      ...result,
      durationMs: performance.now() - started,
    });
    return result;
  } finally {
    await db.close();
  }
}
const entry = process.argv[1] ?? "";
if (/[\\/]audit-retention\.main\.(js|ts)$/.test(entry)) {
  let stopping = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopping = true;
    process.stdout.write('{"event":"audit.retention.stopping"}\n');
    deadline ??= setTimeout(() => process.exit(1), 30000);
    deadline.unref();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  void runAuditRetentionJob(process.env, () => stopping)
    .catch(() => {
      process.stderr.write('{"event":"audit.retention.failed"}\n');
      process.exitCode = 1;
    })
    .finally(() => {
      if (deadline) clearTimeout(deadline);
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    });
}
