import { DomainError } from "../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../shared/domain/exceptions/error-category";

export class AssessmentError extends DomainError {
  readonly code = "ASSESSMENT_RULE";
  readonly category = ErrorCategory.BusinessRule;
  constructor(message: string) {
    super(message);
  }
}
