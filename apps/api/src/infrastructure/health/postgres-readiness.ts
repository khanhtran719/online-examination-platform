import { Readiness } from "../../shared/application/ports/readiness";
import { PostgresDatabase } from "../database/transaction/postgres-database";

export class PostgresReadiness implements Readiness {
  constructor(private readonly database: PostgresDatabase) {}

  async check(): Promise<void> {
    await this.database.query("diagnostic", "SELECT 1");
  }
}
