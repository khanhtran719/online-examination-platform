import { IdentityAccess } from "../../../identity/application/facades/identity.facade";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { invalidReport, reportDenied, reportNotFound } from "../../domain/reporting.error";
import { QuestionStatisticsInput, QuestionStatisticsPage } from "../dto/question-statistics.dto";
import { QuestionStatisticsQuery } from "../ports/question-statistics.query";
import {
  QuestionStatisticsCursor,
  QuestionStatisticsCursorState,
} from "../ports/question-statistics-cursor.port";
import { statisticCounts, selectedCount } from "../../domain/question-statistics";
const ttlMs = 900000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function time(value: string): number {
  const at = Date.parse(value);
  if (!Number.isFinite(at) || new Date(at).toISOString() !== value) throw invalidReport();
  return at;
}
function validate(state: QuestionStatisticsCursorState): number {
  const watermark = time(state.watermark);
  if (
    state.position.length !== 3 ||
    !Number.isInteger(state.position[0]) ||
    state.position[0] < 1 ||
    state.position[0] > 20 ||
    !Number.isInteger(state.position[1]) ||
    state.position[1] < 1 ||
    state.position[1] > 500 ||
    !uuid.test(state.position[2]) ||
    !Number.isSafeInteger(state.expiresAt) ||
    state.expiresAt !== watermark + ttlMs
  )
    throw invalidReport();
  return watermark;
}
export class QuestionStatisticsService {
  constructor(
    private readonly access: IdentityAccess,
    private readonly queries: QuestionStatisticsQuery,
    private readonly cursors: QuestionStatisticsCursor,
    private readonly security: Pick<SecurityControls, "audit">,
    private readonly uow: UnitOfWork,
  ) {}
  async page(input: QuestionStatisticsInput): Promise<QuestionStatisticsPage> {
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
        position: opened?.position ?? null,
      });
      if (!page.present) throw reportNotFound();
      const now = time(page.serverNow);
      if (input.cursor) this.cursors.read(input.cursor, claims, now);
      if (watermarkTime !== null && watermarkTime > now) throw invalidReport();
      await this.security.audit({
        actorId: current.userId,
        action: "reporting.question-statistics.read",
        resourceType: "EXAM_VERSION",
        resourceId: versionId,
        correlationId: input.correlationId,
      });
      const kept = page.rows.slice(0, pageSize),
        last = kept.at(-1);
      return {
        items: kept.map((row) => {
          const counts = statisticCounts(row.counters);
          return {
            questionId: row.questionId,
            ...counts,
            options: row.options.map((option) => ({
              optionId: option.optionId,
              selectedCount: selectedCount(option.selectedCount, counts.answered),
            })),
          };
        }),
        metadata: {
          pageSize,
          next:
            last && page.rows.length > kept.length
              ? this.cursors.sign(claims, {
                  watermark: opened?.watermark ?? page.serverNow,
                  position: [last.sectionPosition, last.questionPosition, last.questionId],
                  expiresAt: opened?.expiresAt ?? now + ttlMs,
                })
              : null,
        },
      };
    });
  }
}
