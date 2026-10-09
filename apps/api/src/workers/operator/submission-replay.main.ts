import { randomUUID } from "node:crypto";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { createSubmissionReplay } from "../../modules/assessment/assessment-worker.factory";

async function main(): Promise<void> {
  const [eventId, extra] = process.argv.slice(2);
  const actor = process.env.OPERATOR_IDENTITY;
  const reason = process.env.OPERATOR_REASON;
  if (
    !eventId ||
    extra ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId) ||
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
    await createSubmissionReplay(db).replay(eventId, actor, reason, randomUUID());
    process.stdout.write('{"event":"submission.replay.completed"}\n');
  } finally {
    await db.close();
  }
}

void main().catch(() => {
  process.stderr.write('{"event":"submission.replay.failed"}\n');
  process.exitCode = 1;
});
