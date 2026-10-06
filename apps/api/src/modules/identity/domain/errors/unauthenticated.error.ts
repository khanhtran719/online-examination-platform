import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class UnauthenticatedError extends DomainError {
  readonly code = "UNAUTHENTICATED";
  readonly category = ErrorCategory.Unauthorized;
  constructor() {
    super("Unauthenticated");
  }
}

export const unauthenticated = () => new UnauthenticatedError();
