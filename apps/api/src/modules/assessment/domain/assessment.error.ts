import { DomainError } from "../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../platform/domain/error-category";

export class AssessmentError extends DomainError {
  readonly code = "ASSESSMENT_RULE";
  readonly category = ErrorCategory.BusinessRule;
  constructor(message: string) {
    super(message);
  }
}
