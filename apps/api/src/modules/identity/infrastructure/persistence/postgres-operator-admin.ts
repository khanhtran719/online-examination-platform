import { PostgresDatabase } from "../../../../platform/infrastructure/database/postgres-database";

export class PostgresOperatorAdmin {
  constructor(private readonly db: PostgresDatabase) {}

  async apply(
    userId: string,
    actor: string,
    reason: string,
    correlationId: string,
    bootstrap: boolean,
    grant: boolean,
  ): Promise<void> {
    await this.db.query("identity.write", "SELECT identity.operator_admin($1,$2,$3,$4,$5,$6)", [
      userId,
      actor,
      reason,
      correlationId,
      bootstrap,
      grant,
    ]);
  }
}
