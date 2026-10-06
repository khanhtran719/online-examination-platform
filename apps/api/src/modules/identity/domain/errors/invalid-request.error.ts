import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class InvalidRequestError extends DomainError {
  readonly code = "INVALID_REQUEST";
  readonly category = ErrorCategory.BadInput;
  constructor() {
    super("Invalid request");
  }
}

export const invalidRequest = () => new InvalidRequestError();
