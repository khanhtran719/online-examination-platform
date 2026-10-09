import { AttemptView, PageResult } from "../dto/assessment.dto";
import { HistoryItemView, ResultView, ReviewQuestionView } from "../dto/candidate-results.dto";
import { CandidateResultsQuery, ReviewPosition } from "../ports/candidate-results.query";
import { AssessmentCursor, AssessmentCursorClaims } from "../ports/assessment-cursor.port";
import { QuestionPageSizer } from "../ports/question-page-sizer.port";
import { invalidRequest, notFound, PermissionDeniedError } from "../../domain/assessment.error";
import { attemptView } from "./attempt-view";
import { canReleaseReview } from "../../domain/review-release";
const ttl = 900000,
  cap = 262144;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function bound(size: number) {
  if (!Number.isSafeInteger(size) || size < 1 || size > 100) throw invalidRequest();
  return size;
}
function time(value: string) {
  const n = Date.parse(value);
  if (!instant.test(value) || !Number.isFinite(n) || new Date(n).toISOString() !== value)
    throw invalidRequest();
  return n;
}
export class CandidateResultsService {
  constructor(
    private readonly queries: CandidateResultsQuery,
    private readonly cursors: AssessmentCursor,
    private readonly sizer: QuestionPageSizer,
  ) {}
  async result(
    actorId: string,
    attemptId: string,
  ): Promise<{ ready: true; body: ResultView } | { ready: false; body: AttemptView }> {
    const row = await this.queries.result(attemptId, actorId);
    if (!row) throw notFound();
    if (row.attempt.status !== "COMPLETED")
      return { ready: false, body: attemptView(row.attempt, row.attempt.serverNow) };
    if (!row.result) throw new Error("RESULT_STATE_UNAVAILABLE");
    return {
      ready: true,
      body: {
        ...row.result,
        review:
          row.reviewAllowed && canReleaseReview(row.release)
            ? { href: `/v1/attempts/${attemptId}/review` }
            : null,
      },
    };
  }
  async history(
    actorId: string,
    requested: number,
    cursor: string | null,
  ): Promise<PageResult<HistoryItemView>> {
    const size = bound(requested);
    const claims: AssessmentCursorClaims = {
      kind: "attempt.history",
      actorId,
      pageSize: size,
      filter: "startedAt.desc:id.desc",
    };
    // Verify signature/scope before SQL; expiry is checked again against the returned DB clock.
    const opened = cursor ? this.cursors.read(cursor, claims, 0) : null;
    if (
      opened &&
      (opened.position.length !== 2 ||
        !uuid.test(opened.position[1]!) ||
        time(opened.position[0]!) > time(opened.watermark))
    )
      throw invalidRequest();
    const page = await this.queries.history({
      userId: actorId,
      limit: size + 1,
      watermark: opened?.watermark ?? null,
      at: opened?.position[0] ?? null,
      id: opened?.position[1] ?? null,
    });
    const now = time(page.serverNow);
    if (cursor) this.cursors.read(cursor, claims, now);
    const kept = page.rows.slice(0, size),
      last = kept[kept.length - 1];
    return {
      items: kept,
      metadata: {
        pageSize: size,
        next:
          last && kept.length < page.rows.length
            ? this.cursors.sign(claims, page.watermark, [last.startedAt, last.attemptId], now + ttl)
            : null,
      },
    };
  }
  async review(
    actorId: string,
    attemptId: string,
    requested: number,
    cursor: string | null,
  ): Promise<PageResult<ReviewQuestionView>> {
    const size = bound(requested);
    const claims: AssessmentCursorClaims = {
      kind: "attempt.review",
      actorId,
      pageSize: size,
      filter: attemptId,
    };
    const opened = cursor ? this.cursors.read(cursor, claims, 0) : null;
    let position: ReviewPosition | null = null;
    if (opened) {
      const [section, question, id] = opened.position;
      if (
        opened.position.length !== 3 ||
        !section ||
        !question ||
        !id ||
        !uuid.test(id) ||
        !/^[1-9][0-9]*$/.test(section) ||
        !/^[1-9][0-9]*$/.test(question) ||
        Number(section) > 20 ||
        Number(question) > 500
      )
        throw invalidRequest();
      position = {
        sectionPosition: Number(section),
        questionPosition: Number(question),
        questionId: id,
      };
    }
    const page = await this.queries.review({
      attemptId,
      userId: actorId,
      position,
      limit: size + 1,
    });
    if (!page.present) throw notFound();
    if (!page.allowed || !page.release || !canReleaseReview(page.release))
      throw new PermissionDeniedError();
    const now = time(page.serverNow);
    if (cursor) {
      const fresh = this.cursors.read(cursor, claims, now);
      if (fresh.watermark !== page.versionId) throw invalidRequest();
    }
    const build = (count: number): PageResult<ReviewQuestionView> => {
      const rows = page.rows.slice(0, count),
        last = rows[rows.length - 1];
      const next =
        last && count < page.rows.length
          ? this.cursors.sign(
              claims,
              page.versionId,
              [String(last.sectionPosition), String(last.question.position), last.question.id],
              now + ttl,
            )
          : null;
      return {
        items: rows.map(
          ({ question, selectedOptionIds, correctOptionIds, correct, explanation }) => ({
            question,
            selectedOptionIds,
            correctOptionIds,
            correct,
            explanation,
          }),
        ),
        metadata: { next, pageSize: size },
      };
    };
    const maximum = Math.min(size, page.rows.length);
    const full = build(maximum);
    if (this.sizer.bytes(full) <= cap) return full;
    // Prefix encoding is monotone; binary search avoids quadratic repeated serialization.
    let low = 0,
      high = maximum - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.sizer.bytes(build(middle)) <= cap) low = middle;
      else high = middle - 1;
    }
    if (low === 0) throw new Error("REVIEW_PAYLOAD_UNAVAILABLE");
    return build(low);
  }
}
