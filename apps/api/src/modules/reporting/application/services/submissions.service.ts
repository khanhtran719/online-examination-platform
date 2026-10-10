import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import {
  invalidReport,
  reportDenied,
  reportNotFound,
  reportNotReady,
} from "../../domain/reporting.error";
import {
  SubmissionsInput,
  SubmissionPage,
  AdminReportInput,
  AdminScore,
} from "../dto/submissions.dto";
import { SubmissionsQuery } from "../ports/submissions.query";
import { SubmissionsCursor, SubmissionCursorState } from "../ports/submissions-cursor.port";
const ttlMs = 900000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function time(value: string): number {
  const at = Date.parse(value);
  if (!Number.isFinite(at) || new Date(at).toISOString() !== value) throw invalidReport();
  return at;
}
function validate(state: SubmissionCursorState): number {
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
export class SubmissionsService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly queries: SubmissionsQuery,
    private readonly cursors: SubmissionsCursor,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async page(input: SubmissionsInput): Promise<SubmissionPage> {
    if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100)
      throw invalidReport();
    const { actorId, examId, pageSize, publishedVersionId } = input,
      claims = { actorId, examId, pageSize, publishedVersionId };
    const opened = input.cursor ? this.cursors.read(input.cursor, claims, 0) : null;
    const watermarkTime = opened ? validate(opened) : null;
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(input.raw, "reporting.read");
      if (current.userId !== actorId) throw reportDenied();
      const page = await this.queries.page({
        examId,
        publishedVersionId,
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
        action: "reporting.submissions.read",
        resourceType: "EXAM",
        resourceId: examId,
        correlationId: input.correlationId,
      });
      const kept = page.rows.slice(0, pageSize),
        last = kept.at(-1);
      return {
        items: kept.map(({ startedAt: _at, ...row }) => row),
        metadata: {
          pageSize,
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
  async result(input: AdminReportInput & { attemptId: string }): Promise<AdminScore> {
    return this.uow.transaction(async () => {
      const current = await this.access.revalidate(input.raw, "reporting.read");
      if (current.userId !== input.actorId) throw reportDenied();
      const row = await this.queries.result(input.attemptId);
      if (!row) throw reportNotFound();
      if (row.status !== "COMPLETED") throw reportNotReady();
      if (!row.result || !row.result.sections?.length) throw new Error("RESULT_STATE_UNAVAILABLE");
      await this.security.audit({
        actorId: current.userId,
        action: "reporting.result.read",
        resourceType: "ATTEMPT",
        resourceId: input.attemptId,
        correlationId: input.correlationId,
      });
      return row.result;
    });
  }
}
