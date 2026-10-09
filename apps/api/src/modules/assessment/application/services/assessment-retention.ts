import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { canPurgeCompleted } from "../../domain/retention";
import { AssessmentRetentionRepository } from "../ports/assessment-retention.repository";

export interface RetentionBatch {
  receiptBatch: number;
  attemptBatch: number;
}
export class AssessmentRetention {
  constructor(
    private readonly repository: AssessmentRetentionRepository,
    private readonly uow: UnitOfWork,
    private readonly batch: RetentionBatch,
  ) {
    if (
      !Number.isSafeInteger(batch.receiptBatch) ||
      batch.receiptBatch < 1 ||
      batch.receiptBatch > 1000 ||
      !Number.isSafeInteger(batch.attemptBatch) ||
      batch.attemptBatch < 1 ||
      batch.attemptBatch > 50
    )
      throw new Error("Invalid retention batch");
  }
  async runOnce(correlationId: string, stopping: () => boolean = () => false) {
    const total = { receipts: 0, attempts: 0, answers: 0, selections: 0 };
    if (stopping()) return total;
    total.receipts = await this.uow.transaction(() =>
      this.repository.pruneReceipts(this.batch.receiptBatch, correlationId),
    );
    for (let i = 0; i < this.batch.attemptBatch && !stopping(); i++) {
      const result = await this.uow.transaction(async () => {
        const state = await this.repository.lockNext();
        if (!state) return null;
        if (!canPurgeCompleted(state)) throw new Error("RETENTION_STATE_UNAVAILABLE");
        return this.repository.purgeLocked(state.id, correlationId);
      });
      if (!result) break;
      if (result.purged) {
        total.attempts++;
        total.answers += result.answers;
        total.selections += result.selections;
      }
    }
    return total;
  }
}
