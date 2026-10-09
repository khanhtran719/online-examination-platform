import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { AssessmentRetentionRepository } from "../../application/ports/assessment-retention.repository";
import { RetentionState } from "../../domain/retention";

export class PostgresAssessmentRetentionRepository implements AssessmentRetentionRepository {
  constructor(private readonly db: PostgresDatabase) {}
  async pruneReceipts(limit: number, correlationId: string) {
    return (
      await this.db.query<{ count: number }>(
        "assessment.write",
        `
          SELECT assessment.prune_retention_receipts($1, $2) AS count
        `,
        [limit, correlationId],
      )
    ).rows[0]!.count;
  }
  async lockNext(): Promise<RetentionState | null> {
    return (
      await this.db.query<{ state: RetentionState | null }>(
        "lock.acquire",
        `
          SELECT assessment.lock_retention_candidate() AS state
        `,
      )
    ).rows[0]!.state;
  }
  async purgeLocked(id: string, correlationId: string) {
    const row = (
      await this.db.query<{
        outcome: {
          purged: boolean;
          answers: number;
          selections: number;
        };
      }>(
        "assessment.write",
        `
          SELECT assessment.purge_retained_attempt($1, $2) AS outcome
        `,
        [id, correlationId],
      )
    ).rows[0]!;
    return row.outcome;
  }
}
