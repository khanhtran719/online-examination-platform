import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class RevisionConflictError extends DomainError {
  readonly code = "REVISION_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Revision conflict");
  }
}
