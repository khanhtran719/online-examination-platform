import { ExamDraft, QuestionDraft, QuestionType } from "../catalog-policy";

export interface LockedQuestion {
  id: string;
  archived: boolean;
  type: QuestionType;
  revision: number;
  optionCount: number;
  keyCount: number;
}

export interface LockedExam {
  id: string;
  revision: number;
  published: boolean;
  archived: boolean;
  durationSeconds: number;
  attemptLimit: number;
  opensAt: number;
  closesAt: number;
  displayTimezone: string;
  sections: {
    position: number;
    questions: { bankQuestionId: string; position: number; points: number }[];
  }[];
}

export interface ImportedQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  points: number;
  options: { id: string; position: number; text: string; correct: boolean }[];
}

/**
 * Write side of Catalog. Every method joins the caller's transaction.
 * Snapshot children must be inserted in that same transaction: the publication
 * seal trigger rejects a row whose version xid is not the current transaction.
 */
export interface CatalogRepository {
  now(): Promise<number>;
  lockQuestions(ids: string[]): Promise<LockedQuestion[]>;
  lockExam(id: string): Promise<LockedExam | null>;
  lockQuestion(id: string): Promise<{ id: string; revision: number; archived: boolean } | null>;
  insertExam(draft: ExamDraft): Promise<{ id: string; revision: number }>;
  replaceExam(id: string, expectedRevision: number, draft: ExamDraft): Promise<number | null>;
  archiveExam(id: string, expectedRevision: number): Promise<number | null>;
  insertQuestion(draft: QuestionDraft): Promise<{ id: string; revision: number }>;
  replaceQuestion(
    id: string,
    expectedRevision: number,
    draft: QuestionDraft,
  ): Promise<number | null>;
  archiveQuestion(id: string, expectedRevision: number): Promise<number | null>;
  publish(
    examId: string,
    actorId: string,
    expectedRevision: number,
  ): Promise<{ revision: number } | null>;
  unpublish(examId: string, expectedRevision: number): Promise<number | null>;
  insertImported(rows: ImportedQuestion[]): Promise<void>;
  saveImportReport(input: {
    id: string;
    actorId: string;
    dryRun: boolean;
    valid: boolean;
    committed: boolean;
    report: object;
    createdAt: string;
  }): Promise<void>;
}
