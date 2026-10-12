import { ActiveCandidate } from "./active-candidates.dto";
import { AdminScore, AdminSubmission } from "./submissions.dto";
import { CandidateResultPair, SubmittedAttemptSummary } from "./candidate-results.dto";

// Query ports are typed contracts, not runtime field allowlists. Construct DTOs
// explicitly so an adapter's extra columns cannot expand the public response.
export function activeCandidateResponse(row: ActiveCandidate): ActiveCandidate {
  return {
    candidateId: row.candidateId,
    attemptId: row.attemptId,
    status: row.status,
    startedAt: row.startedAt,
    deadline: row.deadline,
  };
}
export function submissionResponse(row: AdminSubmission): AdminSubmission {
  return {
    candidateId: row.candidateId,
    attemptId: row.attemptId,
    publishedVersionId: row.publishedVersionId,
    submittedAt: row.submittedAt,
    status: row.status,
    expired: row.expired,
    earned: row.earned,
    possible: row.possible,
  };
}
export function scoreResponse(row: AdminScore): AdminScore {
  if (!Array.isArray(row.sections) || row.sections.length < 1 || row.sections.length > 20)
    throw new Error("RESULT_STATE_UNAVAILABLE");
  return {
    attemptId: row.attemptId,
    publishedVersionId: row.publishedVersionId,
    submissionId: row.submissionId,
    completedAt: row.completedAt,
    earned: row.earned,
    possible: row.possible,
    correct: row.correct,
    total: row.total,
    percentageBasisPoints: row.percentageBasisPoints,
    expired: row.expired,
    scoringPolicy: row.scoringPolicy,
    sections: row.sections.map((section) => ({
      sectionId: section.sectionId,
      earned: section.earned,
      possible: section.possible,
      correct: section.correct,
      total: section.total,
    })),
    review: null,
  };
}
function selectionResponse(row: SubmittedAttemptSummary): SubmittedAttemptSummary {
  return {
    attemptId: row.attemptId,
    submittedAt: row.submittedAt,
    status: row.status,
    expired: row.expired,
    earned: row.earned,
    possible: row.possible,
  };
}
export function candidateResultResponse(row: CandidateResultPair): CandidateResultPair {
  return {
    candidateId: row.candidateId,
    publishedVersionId: row.publishedVersionId,
    best: row.best ? selectionResponse(row.best) : null,
    latest: selectionResponse(row.latest),
  };
}
export function assertReportRows(rows: unknown, maximum: number): asserts rows is unknown[] {
  if (!Array.isArray(rows) || rows.length > maximum)
    throw new Error("REPORT_PROJECTION_UNAVAILABLE");
}
