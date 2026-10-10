import { AdminScore, AdminSubmission } from "../dto/submissions.dto";
/** Primary read-only sources: catalog.exams(id), published_versions(id,exam_id,
 * scoring_policy), published_sections(version_id,id,position), published_questions
 * (version_id,id,section_id); assessment.attempts(id,exam_id,user_id,version_id,
 * started_at,submitted_at,submission_id,status,expired,purged_at), results,
 * result_sections and result_questions aggregate score columns. No PII/keys/answers.
 * Source schema/lifecycle changes require report regression review.
 */
export interface SubmissionsQuery {
  page(input: {
    examId: string;
    publishedVersionId: string | null;
    limit: number;
    watermark: string | null;
    position: [string, string] | null;
  }): Promise<{
    present: boolean;
    serverNow: string;
    rows: (AdminSubmission & { startedAt: string })[];
  }>;
  result(attemptId: string): Promise<{ status: string; result: AdminScore | null } | null>;
}
