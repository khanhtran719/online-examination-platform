import { DomainError } from "../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../shared/domain/exceptions/error-category";

export class InvalidRequestError extends DomainError {
  readonly code = "INVALID_REQUEST";
  readonly category = ErrorCategory.BadInput;
  constructor() {
    super("Invalid request");
  }
}

export const invalidRequest = () => new InvalidRequestError();

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly category = ErrorCategory.NotFound;
  constructor() {
    super("Not found");
  }
}

export const notFound = () => new NotFoundError();

export class RevisionConflictError extends DomainError {
  readonly code = "REVISION_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Revision conflict");
  }
}

export class IdempotencyConflictError extends DomainError {
  readonly code = "IDEMPOTENCY_CONFLICT";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key conflict");
  }
}

export class IdempotencyKeyExpiredError extends DomainError {
  readonly code = "IDEMPOTENCY_KEY_EXPIRED";
  readonly category = ErrorCategory.Conflict;
  constructor() {
    super("Idempotency key expired");
  }
}

export class PublicationIncompleteError extends DomainError {
  readonly code = "PUBLICATION_INCOMPLETE";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Publication incomplete");
  }
}

export class ExamClosedError extends DomainError {
  readonly code = "EXAM_CLOSED";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Exam is closed");
  }
}

export class ExamArchivedError extends DomainError {
  readonly code = "EXAM_ARCHIVED";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Exam is archived");
  }
}

export class ExamNotPublishedError extends DomainError {
  readonly code = "EXAM_NOT_PUBLISHED";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Exam is not published");
  }
}

export class QuestionArchivedError extends DomainError {
  readonly code = "QUESTION_ARCHIVED";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Question is archived");
  }
}
