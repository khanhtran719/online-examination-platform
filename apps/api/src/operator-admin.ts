import { randomUUID } from "node:crypto";
import { databaseConfig } from "./platform/infrastructure/database/database-config";
import { PostgresDatabase } from "./platform/infrastructure/database/postgres-database";
import { PostgresOperatorAdmin } from "./modules/identity/infrastructure/persistence/postgres-operator-admin";

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
    databaseConfig({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_OPERATOR_URL,
      DB_POOL_MAX: "1",
    }),
  );
  try {
    await new PostgresOperatorAdmin(db).apply(
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
