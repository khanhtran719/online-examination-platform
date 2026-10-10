import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { invalidReport, reportDenied, reportNotFound } from "../../domain/reporting.error";
import { assertCandidateSelections } from "../../domain/candidate-results";
import { CandidateResultsInput, CandidateResultsPage } from "../dto/candidate-results.dto";
import { CandidateResultsQuery } from "../ports/candidate-results.query";
import {
  CandidateResultsCursor,
  CandidateResultsCursorState,
} from "../ports/candidate-results-cursor.port";
const ttlMs = 900000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function time(value: string): number {
  const at = Date.parse(value);
  if (!Number.isFinite(at) || new Date(at).toISOString() !== value) throw invalidReport();
  return at;
}
function validate(state: CandidateResultsCursorState): number {
  const watermark = time(state.watermark);
  if (
    !uuid.test(state.position) ||
    !Number.isSafeInteger(state.expiresAt) ||
    state.expiresAt !== watermark + ttlMs
  )
    throw invalidReport();
  return watermark;
}
export class CandidateResultsService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly queries: CandidateResultsQuery,
    private readonly cursors: CandidateResultsCursor,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async page(input: CandidateResultsInput): Promise<CandidateResultsPage> {
    if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100)
      throw invalidReport();
    const { actorId, examId, versionId, pageSize } = input,
      claims = { actorId, examId, versionId, pageSize };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, 0) : null;
    const watermarkTime = opened ? validate(opened) : null;
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(input.raw, "reporting.read");
      if (current.userId !== actorId) throw reportDenied();
      const page = await this.queries.page({
        examId,
        versionId,
        limit: pageSize + 1,
        watermark: opened?.watermark ?? null,
        position: opened?.position ?? null,
      });
      if (!page.present) throw reportNotFound();
      const now = time(page.serverNow);
      if (input.cursor) this.cursors.read(input.cursor, claims, now);
      if (watermarkTime !== null && watermarkTime > now) throw invalidReport();
      const kept = page.rows.slice(0, pageSize),
        last = kept.at(-1);
      for (const row of kept) assertCandidateSelections(row.best, row.latest);
      await this.security.audit({
        actorId: current.userId,
        action: "reporting.candidate-results.read",
        resourceType: "EXAM_VERSION",
        resourceId: versionId,
        correlationId: input.correlationId,
      });
      return {
        items: kept,
        metadata: {
          pageSize,
          next:
            last && page.rows.length > kept.length
              ? this.cursors.sign(claims, {
                  watermark: opened?.watermark ?? page.serverNow,
                  position: last.candidateId,
                  expiresAt: opened?.expiresAt ?? now + ttlMs,
                })
              : null,
        },
      };
    });
  }
}
