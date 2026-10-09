import { AttemptState } from "../../domain/attempt";
import { Grade } from "../../domain/grading";
import { ScoringAnswer } from "../../domain/scoring";
import { SubmissionKind } from "../../domain/assessment-policy";

export interface GradingAttempt extends AttemptState {
  publishedVersionId: string;
  submissionId: string | null;
  submissionEventId: string | null;
  submissionKind: SubmissionKind | null;
  replayPending: boolean;
  resultPresent: boolean;
  gradingGeneration: number;
  failurePresent?: boolean;
}
export interface GradingRepository {
  lock(attemptId: string): Promise<GradingAttempt | null>;
  inbox(eventId: string, attemptId: string): Promise<void>;
  answers(attemptId: string): Promise<ScoringAnswer[]>;
  begin(attemptId: string): Promise<void>;
  complete(attempt: GradingAttempt, result: Grade): Promise<void>;
  quarantine(digest: string, code: "INVALID_SCHEMA" | "SUBMISSION_MISMATCH"): Promise<void>;
}
