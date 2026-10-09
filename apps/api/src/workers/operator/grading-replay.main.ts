import { randomUUID } from "node:crypto";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { createGradingReplay } from "../../modules/assessment/assessment-worker.factory";
async function main() {
  const [attempt, revisionText, extra] = process.argv.slice(2);
  const actor = process.env.OPERATOR_IDENTITY;
  const reason = process.env.OPERATOR_REASON;
  if (
    !attempt ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt) ||
    !revisionText ||
    !/^[1-9][0-9]{0,9}$/.test(revisionText) ||
    Number(revisionText) > 2147483647 ||
    extra ||
    !actor ||
    !reason ||
    !process.env.DATABASE_OPERATOR_URL
  )
    throw new Error("Invalid replay request");
  const db = new PostgresDatabase(
    loadDatabaseConfig({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_OPERATOR_URL,
      DB_POOL_MAX: "1",
    }),
  );
  try {
    const accepted = await createGradingReplay(db).replay(
      attempt,
      Number(revisionText),
      actor,
      reason,
      randomUUID(),
    );
    process.stdout.write(JSON.stringify({ event: "grading.replay.accepted", ...accepted }) + "\n");
  } finally {
    await db.close();
  }
}
void main().catch(() => {
  process.stderr.write('{"event":"grading.replay.failed"}\n');
  process.exitCode = 1;
});
