import type { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";
import type { Readiness } from "@shared/application/ports/readiness";

export class PostgresReadiness implements Readiness {
  constructor(private readonly database: PostgresDatabase) {}

  async check(): Promise<void> {
    await this.database.query("diagnostic", "SELECT 1");
  }
}
