export interface QuestionStatistic {
  questionId: string;
  completedAttempts: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  options: { optionId: string; selectedCount: number }[];
}
export interface QuestionStatisticsPage {
  items: QuestionStatistic[];
  metadata: { next: string | null; pageSize: number };
}
export interface QuestionStatisticsInput {
  raw: string;
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
  cursor: string | null;
  correlationId: string;
}
