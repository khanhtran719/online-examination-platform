import { randomUUID } from "node:crypto";
import { assessmentRetentionConfig } from "../../config/assessment-retention.config";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { createAssessmentRetention } from "../../modules/assessment/assessment-worker.factory";

/** Finite scheduled job. Scheduling/overlap belongs to the deployer; no permanent service. */
export async function runAssessmentRetentionJob(
  env: NodeJS.ProcessEnv,
  stopping: () => boolean = () => false,
  log: (event: Record<string, unknown>) => void = (event) =>
    process.stdout.write(JSON.stringify(event) + "\n"),
) {
  const config = assessmentRetentionConfig(env);
  if (!config.enabled) {
    log({ event: "assessment.retention.disabled" });
    return;
  }
  const db = new PostgresDatabase(loadDatabaseConfig(env));
  const tickId = randomUUID(),
    started = performance.now();
  try {
    const authority = (
      await db.query<{ allowed: boolean }>(
        "diagnostic",
        `
        SELECT has_function_privilege(
          current_user,
          'assessment.purge_retained_attempt(uuid,uuid)',
          'EXECUTE'
        ) AS allowed
      `,
      )
    ).rows[0];
    if (!authority?.allowed) throw new Error("Maintenance authority required");
    log({ event: "assessment.retention.started", tickId });
    const result = await createAssessmentRetention(db, config).runOnce(tickId, stopping);
    log({
      event: "assessment.retention.completed",
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
if (/[\\/]assessment-retention\.main\.(js|ts)$/.test(entry)) {
  let stopping = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopping = true;
    process.stdout.write('{"event":"assessment.retention.stopping"}\n');
    deadline ??= setTimeout(() => process.exit(1), 30000);
    deadline.unref();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  void runAssessmentRetentionJob(process.env, () => stopping)
    .catch(() => {
      process.stderr.write('{"event":"assessment.retention.failed"}\n');
      process.exitCode = 1;
    })
    .finally(() => {
      if (deadline) clearTimeout(deadline);
      process.removeListener("SIGTERM", stop);
      process.removeListener("SIGINT", stop);
    });
}
