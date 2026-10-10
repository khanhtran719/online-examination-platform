import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { invalidReport, reportDenied, reportNotFound } from "../../domain/reporting.error";
import { ActiveCandidatesInput, ActiveCandidatesPage } from "../dto/active-candidates.dto";
import { ActiveCandidatesQuery } from "../ports/active-candidates.query";
import { ActiveCandidatesCursor, ActiveCursorState } from "../ports/active-candidates-cursor.port";
const ttlMs = 60000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function time(value: string): number {
  const at = Date.parse(value);
  if (!Number.isFinite(at) || new Date(at).toISOString() !== value) throw invalidReport();
  return at;
}
function validate(state: ActiveCursorState): number {
  const watermark = time(state.watermark);
  if (
    state.position.length !== 2 ||
    !uuid.test(state.position[1]) ||
    time(state.position[0]) > watermark ||
    !Number.isSafeInteger(state.expiresAt) ||
    state.expiresAt !== watermark + ttlMs
  )
    throw invalidReport();
  return watermark;
}
export class ActiveCandidatesService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly queries: ActiveCandidatesQuery,
    private readonly cursors: ActiveCandidatesCursor,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async page(input: ActiveCandidatesInput): Promise<ActiveCandidatesPage> {
    if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100)
      throw invalidReport();
    const { actorId, examId, pageSize } = input,
      claims = { actorId, examId, pageSize };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, 0) : null;
    const watermarkTime = opened ? validate(opened) : null;
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(input.raw, "reporting.read");
      if (current.userId !== actorId) throw reportDenied();
      const page = await this.queries.page({
        examId,
        limit: pageSize + 1,
        watermark: opened?.watermark ?? null,
        position: opened?.position ?? null,
      });
      if (!page.present) throw reportNotFound();
      const now = time(page.serverNow);
      if (input.cursor) this.cursors.read(input.cursor, claims, now);
      if (watermarkTime !== null && watermarkTime > now) throw invalidReport();
      await this.security.audit({
        actorId: current.userId,
        action: "reporting.active-candidates.read",
        resourceType: "EXAM",
        resourceId: examId,
        correlationId: input.correlationId,
      });
      const kept = page.rows.slice(0, pageSize),
        last = kept.at(-1);
      return {
        items: kept,
        metadata: {
          pageSize,
          asOf: page.serverNow,
          next:
            last && page.rows.length > kept.length
              ? this.cursors.sign(claims, {
                  watermark: opened?.watermark ?? page.serverNow,
                  position: [last.startedAt, last.attemptId],
                  expiresAt: opened?.expiresAt ?? now + ttlMs,
                })
              : null,
        },
      };
    });
  }
}
