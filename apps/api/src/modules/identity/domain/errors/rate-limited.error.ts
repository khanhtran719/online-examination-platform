import { DomainError } from "../../../../platform/domain/domain-error";
import { ErrorCategory } from "../../../../platform/domain/error-category";

export class RateLimitedError extends DomainError {
  readonly code = "RATE_LIMITED";
  readonly category = ErrorCategory.RateLimited;
  constructor() {
    super("Too many requests");
  }
}

export const rateLimited = () => new RateLimitedError();
