import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class InvalidRequestError extends DomainError {
  readonly code = "INVALID_REQUEST";
  readonly category = ErrorCategory.BadInput;
  constructor() {
    super("Invalid request");
  }
}

export const invalidRequest = () => new InvalidRequestError();
