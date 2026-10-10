export interface SubmittedAttemptSummary {
  attemptId: string;
  submittedAt: string;
  status: "SUBMITTED" | "PROCESSING" | "COMPLETED" | "EXPIRED" | "FAILED";
  expired: boolean;
  earned: number | null;
  possible: number | null;
}
export interface CandidateResultPair {
  candidateId: string;
  publishedVersionId: string;
  best: SubmittedAttemptSummary | null;
  latest: SubmittedAttemptSummary;
}
export interface CandidateResultsPage {
  items: CandidateResultPair[];
  metadata: { next: string | null; pageSize: number };
}
export interface CandidateResultsInput {
  raw: string;
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
  cursor: string | null;
  correlationId: string;
}
