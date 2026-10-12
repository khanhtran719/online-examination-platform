import { UnitOfWork } from "../unit-of-work/unit-of-work.port";
import { AuditRetentionPort } from "../ports/audit-retention.port";
export class AuditRetention {
  constructor(
    private readonly port: AuditRetentionPort,
    private readonly uow: UnitOfWork,
    private readonly batch: number,
  ) {
    if (!Number.isSafeInteger(batch) || batch < 1 || batch > 1000)
      throw Error("Invalid audit retention batch");
  }
  async runOnce(correlationId: string, stopping: () => boolean = () => false) {
    if (stopping()) return { purgedRows: 0 };
    return this.uow.transaction(async () => {
      const purgedRows = await this.port.prune(this.batch, correlationId);
      if (!Number.isSafeInteger(purgedRows) || purgedRows < 0 || purgedRows > this.batch)
        throw Error("AUDIT_RETENTION_STATE_UNAVAILABLE");
      return { purgedRows };
    });
  }
}
