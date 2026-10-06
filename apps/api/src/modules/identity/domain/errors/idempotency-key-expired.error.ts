import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class IdempotencyKeyExpiredError extends DomainError {
  readonly code = "IDEMPOTENCY_KEY_EXPIRED";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key expired");
  }
}
