import { CandidateQuestionView, PageResult } from "../dto/assessment.dto";

/** Outer encoding supplies the complete response size; application owns cursor continuation. */
export interface QuestionPageSizer {
  bytes(page: PageResult<CandidateQuestionView>): number;
}
