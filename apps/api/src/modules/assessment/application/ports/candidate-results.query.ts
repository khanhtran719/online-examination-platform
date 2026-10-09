import { OwnedAttempt } from "./attempt-query.port";
import { ReviewRelease } from "../../domain/review-release";
import { HistoryItemView, ResultView, ReviewQuestionView } from "../dto/candidate-results.dto";
export interface ReviewRow extends ReviewQuestionView {
  sectionPosition: number;
}
export interface ReviewPosition {
  sectionPosition: number;
  questionPosition: number;
  questionId: string;
}
/**
 * READ projection: Assessment owns attempt/results/sections/details/answers.
 * Immutable Catalog versions/sections/questions/options/keys are declared snapshot
 * dependencies. SQL is private Infrastructure; no Catalog repository is exposed.
 * Every projection applies current actor scope. Review release precedes key rows.
 */
export interface CandidateResultsQuery {
  result(
    attemptId: string,
    userId: string,
  ): Promise<{
    attempt: OwnedAttempt;
    result: Omit<ResultView, "review"> | null;
    reviewAllowed: boolean;
    release: ReviewRelease;
  } | null>;
  review(input: {
    attemptId: string;
    userId: string;
    position: ReviewPosition | null;
    limit: number;
  }): Promise<{
    present: boolean;
    allowed: boolean;
    release: ReviewRelease | null;
    versionId: string;
    serverNow: string;
    rows: ReviewRow[];
  }>;
  history(input: {
    userId: string;
    watermark: string | null;
    at: string | null;
    id: string | null;
    limit: number;
  }): Promise<{
    serverNow: string;
    watermark: string;
    rows: HistoryItemView[];
  }>;
}
