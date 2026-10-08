import { AttemptStatus } from "../attempt";

export interface AttemptRecord {
  id: string;
  examId: string;
  publishedVersionId: string;
  userId: string;
  revision: number;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  expired: boolean;
  replayPending: boolean;
  submissionId: string | null;
}

export interface LockedAttempt extends AttemptRecord {
  /** Evaluated only after the row lock is acquired. */
  serverNow: string;
}

export interface AnswerWrite {
  questionId: string;
  version: number;
  marked: boolean;
  optionIds: readonly string[];
}

/**
 * Write side of an attempt. Every method joins the caller's transaction.
 * Selection sets are replaced; answer metadata is upserted using column-scoped grants.
 */
export interface AttemptRepository {
  lockActive(userId: string, examId: string): Promise<LockedAttempt | null>;
  lockOwned(attemptId: string, userId: string): Promise<LockedAttempt | null>;
  insert(input: {
    id: string;
    userId: string;
    examId: string;
    publishedVersionId: string;
    startedAt: string;
    deadline: string;
    attemptLimit: number;
  }): Promise<AttemptRecord | null>;
  versions(
    attemptId: string,
    questionIds: readonly string[],
  ): Promise<{ questionId: string; version: number }[]>;
  replaceAnswers(input: {
    attemptId: string;
    userId: string;
    publishedVersionId: string;
    answers: readonly AnswerWrite[];
  }): Promise<number | null>;
  submit(input: {
    attemptId: string;
    userId: string;
    status: "SUBMITTED" | "EXPIRED";
    submittedAt: string;
    submissionId: string;
    eventId: string;
    expired: boolean;
  }): Promise<AttemptRecord | null>;
}
