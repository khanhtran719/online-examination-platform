import { RetentionState } from "../../domain/retention";

/** Maintenance-only writes, joining the caller UoW; no table/driver authority escapes. */
export interface AssessmentRetentionRepository {
  pruneReceipts(limit: number, correlationId: string): Promise<number>;
  lockNext(): Promise<RetentionState | null>;
  purgeLocked(
    id: string,
    correlationId: string,
  ): Promise<{
    purged: boolean;
    answers: number;
    selections: number;
  }>;
}
