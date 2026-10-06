import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class UnauthenticatedError extends DomainError {
  readonly code = "UNAUTHENTICATED";
  readonly category = ErrorCategory.Unauthorized;
  constructor() {
    super("Unauthenticated");
  }
}

export const unauthenticated = () => new UnauthenticatedError();
