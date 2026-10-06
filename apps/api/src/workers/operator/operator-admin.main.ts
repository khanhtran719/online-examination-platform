import { randomUUID } from "node:crypto";
import { loadDatabaseConfig } from "../../infrastructure/database/load-database-config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { createOperatorAdmin } from "../../modules/identity/identity-operator.factory";

async function main(): Promise<void> {
  const [action, userId] = process.argv.slice(2);
  const actor = process.env.OPERATOR_IDENTITY;
  const reason = process.env.OPERATOR_REASON;
  if (
    !["bootstrap", "grant", "revoke"].includes(action ?? "") ||
    !userId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
    !actor ||
    !reason ||
    !process.env.DATABASE_OPERATOR_URL
  )
    throw new Error("Invalid operator input");
  const db = new PostgresDatabase(
    loadDatabaseConfig({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_OPERATOR_URL,
      DB_POOL_MAX: "1",
    }),
  );
  try {
    await createOperatorAdmin(db).apply(
      userId,
      actor,
      reason,
      randomUUID(),
      action === "bootstrap",
      action !== "revoke",
    );
    process.stdout.write('{"event":"operator.admin.completed"}\n');
  } finally {
    await db.close();
  }
}

void main().catch(() => {
  process.stderr.write('{"event":"operator.admin.failed"}\n');
  process.exitCode = 1;
});
