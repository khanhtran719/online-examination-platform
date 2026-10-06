import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class RevisionConflictError extends DomainError {
  readonly code = "REVISION_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Revision conflict");
  }
}
