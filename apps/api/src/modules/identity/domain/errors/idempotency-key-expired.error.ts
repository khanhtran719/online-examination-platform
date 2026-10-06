import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class IdempotencyKeyExpiredError extends DomainError {
  readonly code = "IDEMPOTENCY_KEY_EXPIRED";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key expired");
  }
}
