import { Readiness } from "../../application/readiness";
import { PostgresDatabase } from "./postgres-database";

export class PostgresReadiness implements Readiness {
  constructor(private readonly database: PostgresDatabase) {}

  async check(): Promise<void> {
    await this.database.query("diagnostic", "SELECT 1");
  }
}
