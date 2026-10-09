import { toSuccessEnvelope } from "../../../../shared/common/interceptors/api-response.interceptor";
import { PageResult } from "../../application/dto/assessment.dto";
import { QuestionPageSizer } from "../../application/ports/question-page-sizer.port";

export class HttpQuestionPageSizer implements QuestionPageSizer {
  bytes<T>(page: PageResult<T>): number {
    return Buffer.byteLength(JSON.stringify(toSuccessEnvelope({ kind: "page", ...page })), "utf8");
  }
}
