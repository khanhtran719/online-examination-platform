import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";

export class RateLimitedError extends DomainError {
  readonly code = "RATE_LIMITED";
  readonly category = ErrorCategory.RateLimited;
  constructor() {
    super("Too many requests");
  }
}

export const rateLimited = () => new RateLimitedError();
