export interface AdminSubmission {
  candidateId: string;
  attemptId: string;
  publishedVersionId: string;
  submittedAt: string | null;
  status:
    "CREATED" | "IN_PROGRESS" | "SUBMITTED" | "PROCESSING" | "COMPLETED" | "EXPIRED" | "FAILED";
  expired: boolean;
  earned: number | null;
  possible: number | null;
}
export interface AdminScore {
  attemptId: string;
  publishedVersionId: string;
  submissionId: string;
  completedAt: string;
  earned: number;
  possible: number;
  correct: number;
  total: number;
  percentageBasisPoints: number;
  expired: boolean;
  scoringPolicy: "EXACT_MATCH_V1";
  sections: {
    sectionId: string;
    earned: number;
    possible: number;
    correct: number;
    total: number;
  }[];
  review: null;
}
export interface SubmissionPage {
  items: AdminSubmission[];
  metadata: { next: string | null; pageSize: number };
}
export interface AdminReportInput {
  raw: string;
  actorId: string;
  correlationId: string;
}
export interface SubmissionsInput extends AdminReportInput {
  examId: string;
  publishedVersionId: string | null;
  pageSize: number;
  cursor: string | null;
}
