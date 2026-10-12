import { AuditRetentionPort } from "../../../shared/application/ports/audit-retention.port";
import { PostgresDatabase } from "../../database/transaction/postgres-database";
export class PostgresAuditRetention implements AuditRetentionPort {
  constructor(private readonly db: PostgresDatabase) {}
  async prune(batch: number, correlationId: string): Promise<number> {
    const r = await this.db.query<{ count: number }>(
      "audit.prune",
      `
    SELECT
      platform.prune_audit($1::int, $2::uuid) AS count
  `,
      [batch, correlationId],
    );
    return r.rows[0]!.count;
  }
}
