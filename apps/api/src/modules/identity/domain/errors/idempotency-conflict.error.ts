import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class IdempotencyConflictError extends DomainError {
  readonly code = "IDEMPOTENCY_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key conflict");
  }
}
