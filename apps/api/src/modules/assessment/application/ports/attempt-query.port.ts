import { AttemptRecord } from "../../domain/repositories/attempt.repository";

export interface OwnedAttempt extends AttemptRecord {
  serverNow: string;
}

export interface AnswerRow {
  questionId: string;
  selectedOptionIds: string[];
  marked: boolean;
  version: number;
  updatedAt: string;
  sectionPosition: number;
  position: number;
}

export interface AttemptQuery {
  read(attemptId: string, userId: string): Promise<OwnedAttempt | null>;
  answers(input: {
    attemptId: string;
    userId: string;
    sectionPosition: number | null;
    questionPosition: number | null;
    questionId: string | null;
    limit: number;
  }): Promise<{ present: boolean; serverNow: string; rows: AnswerRow[] }>;
}
