import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class PermissionDeniedError extends DomainError {
  readonly code = "PERMISSION_DENIED";
  readonly category = ErrorCategory.Forbidden;
  constructor() {
    super("Permission denied");
  }
}

export const forbidden = () => new PermissionDeniedError();
