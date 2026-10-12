import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { auditTime, auditValues, validateAuditPosition } from "../../domain/audit";
import { invalidReport, reportDenied } from "../../domain/reporting.error";
import { AuditInput, AuditPage } from "../dto/audit.dto";
import { AuditQuery } from "../ports/audit.query";
import { AuditCursor } from "../ports/audit-cursor.port";
export class AuditService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly query: AuditQuery,
    private readonly cursor: AuditCursor,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async page(input: AuditInput): Promise<AuditPage> {
    if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100)
      throw invalidReport();
    const claims = { actorId: input.actorId, pageSize: input.pageSize };
    const state = input.cursor ? this.cursor.read(input.cursor, claims, 0) : null;
    const watermark = state ? validateAuditPosition(state) : null;
    return this.uow.transaction(async () => {
      const actor = await this.access.revalidate(input.raw, "audit.read");
      if (actor.userId !== input.actorId) throw reportDenied();
      const result = await this.query.page({
        limit: input.pageSize + 1,
        watermark: state?.watermark ?? null,
        position: state?.position ?? null,
      });
      let now: number;
      try {
        now = auditTime(result.serverNow);
      } catch {
        throw Error("AUDIT_STATE_UNAVAILABLE");
      }
      if (input.cursor) this.cursor.read(input.cursor, claims, now);
      if (watermark !== null && watermark > now) throw invalidReport();
      const boundary = state?.watermark ?? result.serverNow;
      let previous = state?.position ?? null;
      if (result.rows.length > input.pageSize + 1) throw Error("AUDIT_STATE_UNAVAILABLE");
      const projected = result.rows.map(auditValues);
      for (const row of projected) {
        if (
          row.occurredAt > boundary ||
          (previous !== null &&
            (row.occurredAt > previous[0] ||
              (row.occurredAt === previous[0] && row.id >= previous[1])))
        )
          throw Error("AUDIT_STATE_UNAVAILABLE");
        previous = [row.occurredAt, row.id];
      }
      const kept = projected.slice(0, input.pageSize),
        last = kept.at(-1);
      await this.security.audit({
        actorId: actor.userId,
        correlationId: input.correlationId,
        action: "reporting.audit.read",
        resourceType: "AUDIT_LOG",
        resourceId: "00000000-0000-4000-8000-000000000000",
      });
      return {
        items: kept,
        metadata: {
          pageSize: input.pageSize,
          next:
            last && result.rows.length > kept.length
              ? this.cursor.sign(claims, {
                  watermark: state?.watermark ?? result.serverNow,
                  position: [last.occurredAt, last.id],
                  expiresAt: state?.expiresAt ?? now + 900000,
                })
              : null,
        },
      };
    });
  }
}
