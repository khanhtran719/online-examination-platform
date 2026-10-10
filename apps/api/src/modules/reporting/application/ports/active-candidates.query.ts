import { ActiveCandidate } from "../dto/active-candidates.dto";
/** Read-only primary sources: catalog.exams(id), assessment.attempts
 * (exam_id, id, user_id, status, started_at, deadline, purged_at).
 * Re-review when these source schemas/semantics change. No Identity PII join.
 */
export interface ActiveCandidatesQuery {
  page(input: {
    examId: string;
    limit: number;
    watermark: string | null;
    position: [string, string] | null;
  }): Promise<{
    present: boolean;
    serverNow: string;
    rows: ActiveCandidate[];
  }>;
}
