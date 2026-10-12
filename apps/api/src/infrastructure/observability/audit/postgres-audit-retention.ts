import type { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";
import type { AuditRetentionPort } from "@shared/application/ports/audit-retention.port";

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
