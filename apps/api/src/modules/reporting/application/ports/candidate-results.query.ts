import { CandidateResultPair } from "../dto/candidate-results.dto";
/** Primary read-only sources: catalog.published_versions(id,exam_id);
 * assessment.attempts(id,exam_id,user_id,version_id,started_at,submitted_at,status,
 * expired,purged_at); results(attempt_id,version_id,user_id,earned_points,possible_points).
 * Best: earned DESC/submitted ASC/id ASC; latest: submitted DESC/id DESC.
 * Assessment owns atomic grading/replay/retention. Re-review source migrations.
 * No Identity PII, leaderboard consent filter, answers, keys or review joins.
 */
export interface CandidateResultsQuery {
  page(input: {
    examId: string;
    versionId: string;
    limit: number;
    watermark: string | null;
    position: string | null;
  }): Promise<{
    present: boolean;
    serverNow: string;
    rows: CandidateResultPair[];
  }>;
}
