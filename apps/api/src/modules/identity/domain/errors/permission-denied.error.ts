import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class PermissionDeniedError extends DomainError {
  readonly code = "PERMISSION_DENIED";
  readonly category = ErrorCategory.Forbidden;
  constructor() {
    super("Permission denied");
  }
}

export const forbidden = () => new PermissionDeniedError();
