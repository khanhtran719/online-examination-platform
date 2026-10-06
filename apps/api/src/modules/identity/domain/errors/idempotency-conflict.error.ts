import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class IdempotencyConflictError extends DomainError {
  readonly code = "IDEMPOTENCY_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key conflict");
  }
}
