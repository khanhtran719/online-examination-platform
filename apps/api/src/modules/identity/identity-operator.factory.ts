import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { OperatorAdmin } from "./application/ports/operator-admin.port";
import { PostgresOperatorAdmin } from "./infrastructure/persistence/postgres/repositories/postgres-operator-admin";
/** Public operator capability composition; use the dedicated operator database role. */
export function createOperatorAdmin(db: PostgresDatabase): OperatorAdmin {
  return new PostgresOperatorAdmin(db);
}
