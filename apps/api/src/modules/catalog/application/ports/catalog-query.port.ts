import {
  AdminExam,
  AdminExamRow,
  AdminQuestion,
  AdminQuestionRow,
  BrowseRow,
  FrozenRow,
  ImportReport,
  PublicExam,
  ScoringItem,
} from "../dto/catalog.dto";

export interface KeysetInput {
  limit: number;
  watermark: string | null;
  at: string | null;
  id: string | null;
}

export interface BrowseInput extends KeysetInput {
  category: string | null;
}

export interface FrozenInput {
  versionId: string;
  limit: number;
  sectionPosition: number | null;
  questionPosition: number | null;
  questionId: string | null;
}

export interface CatalogQuery {
  browse(input: BrowseInput): Promise<{ watermark: string; rows: BrowseRow[] }>;
  publishedExam(examId: string): Promise<PublicExam | null>;
  adminExams(input: KeysetInput): Promise<{ watermark: string; rows: AdminExamRow[] }>;
  adminExam(examId: string): Promise<AdminExam | null>;
  questions(input: KeysetInput): Promise<{ watermark: string; rows: AdminQuestionRow[] }>;
  question(questionId: string): Promise<AdminQuestion | null>;
  importReport(id: string, actorId: string): Promise<ImportReport | null>;
  frozenPage(input: FrozenInput): Promise<{ present: boolean; rows: FrozenRow[] }>;
  scoring(versionId: string): Promise<ScoringItem[] | null>;
}
