import { toSuccessEnvelope } from "../../../../shared/common/interceptors/api-response.interceptor";
import { CandidateQuestionView, PageResult } from "../../application/dto/assessment.dto";
import { QuestionPageSizer } from "../../application/ports/question-page-sizer.port";

export class HttpQuestionPageSizer implements QuestionPageSizer {
  bytes(page: PageResult<CandidateQuestionView>): number {
    return Buffer.byteLength(JSON.stringify(toSuccessEnvelope({ kind: "page", ...page })), "utf8");
  }
}
