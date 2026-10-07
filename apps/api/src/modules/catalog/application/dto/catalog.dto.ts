import { Category, ExplanationPolicy, QuestionType } from "../../domain/catalog-policy";

export interface PageMetadata {
  next: string | null;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  metadata: PageMetadata;
}

export interface SectionSummary {
  id: string;
  title: string;
  position: number;
  questionCount: number;
  possible: number;
}

export interface PublicExam {
  id: string;
  title: string;
  category: Category;
  publishedVersionId: string;
  version: number;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  questionCount: number;
  scoringPolicy: "EXACT_MATCH_V1";
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionSummary[];
}

export interface QuestionReference {
  bankQuestionId: string;
  position: number;
  points: number;
}

export interface SectionInput {
  title: string;
  position: number;
  questions: QuestionReference[];
}

export interface AdminExam {
  id: string;
  revision: number;
  published: boolean;
  archived: boolean;
  publishedVersionId: string | null;
  title: string;
  category: Category;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionInput[];
}

export interface QuestionOptionInput {
  position: number;
  text: string;
}

export interface AdminQuestion {
  id: string;
  revision: number;
  archived: boolean;
  type: QuestionType;
  prompt: string;
  options: QuestionOptionInput[];
  correctOptionPositions: number[];
  points: number;
  explanation: string;
}

export interface CandidateOption {
  id: string;
  position: number;
  text: string;
}

export interface CandidateQuestion {
  id: string;
  sectionId: string;
  position: number;
  type: QuestionType;
  prompt: string;
  points: number;
  options: CandidateOption[];
}

export interface ScoringItem {
  questionId: string;
  sectionId: string;
  position: number;
  type: QuestionType;
  points: number;
  correctOptionIds: string[];
}

export interface ImportIssue {
  clientRef: string;
  field: string;
  message: string;
}

export interface ImportReport {
  id: string;
  valid: boolean;
  committed: boolean;
  issues: ImportIssue[];
  questions: { clientRef: string; questionId: string }[];
  createdAt: string;
}

export interface MutationReceipt {
  resourceId: string;
  revision: number;
  acceptedAt: string;
}

export interface Commit<T> {
  replayed: boolean;
  httpStatus: number;
  body: T;
}

export interface BrowseRow extends PublicExam {
  publishedAt: string;
}

export interface AdminExamRow extends AdminExam {
  updatedAt: string;
}

export interface AdminQuestionRow extends AdminQuestion {
  createdAt: string;
}

export interface FrozenRow extends CandidateQuestion {
  sectionPosition: number;
}
