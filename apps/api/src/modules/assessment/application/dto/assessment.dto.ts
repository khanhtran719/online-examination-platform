import { AttemptStatus } from "../../domain/attempt";

export interface AttemptView {
  id: string;
  examId: string;
  publishedVersionId: string;
  revision: number;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  expired: boolean;
  serverNow: string;
  canSave: boolean;
  resultAvailable: boolean;
  pollAfterSeconds: number;
  replayPending: boolean;
}

export interface SaveReceipt {
  attemptId: string;
  acceptedAt: string;
  answers: { questionId: string; version: number }[];
}

export interface SubmitReceipt {
  attemptId: string;
  submissionId: string;
  acceptedAt: string;
  acceptanceState: "SUBMITTED" | "EXPIRED";
  expired: boolean;
}

export interface PageResult<T> {
  items: T[];
  metadata: { next: string | null; pageSize: number };
}

export interface Commit<T> {
  replayed: boolean;
  httpStatus: number;
  body: T;
}

export interface CandidateQuestionView {
  id: string;
  sectionId: string;
  position: number;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  prompt: string;
  points: number;
  options: { id: string; position: number; text: string }[];
}

export interface AnswerView {
  questionId: string;
  selectedOptionIds: string[];
  marked: boolean;
  version: number;
  updatedAt: string | null;
}
