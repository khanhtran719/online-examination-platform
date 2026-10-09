import { AttemptStatus } from "../../domain/attempt";
import { CandidateQuestionView } from "./assessment.dto";

export interface SectionScoreView {
  sectionId: string;
  earned: number;
  possible: number;
  correct: number;
  total: number;
}
export interface ResultView {
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
  sections: SectionScoreView[];
  review: { href: string } | null;
}
export interface ReviewQuestionView {
  question: CandidateQuestionView;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  correct: boolean;
  explanation: string | null;
}
export interface HistoryItemView {
  attemptId: string;
  examId: string;
  publishedVersionId: string;
  startedAt: string;
  status: AttemptStatus;
  expired: boolean;
  earned: number | null;
  possible: number | null;
}
