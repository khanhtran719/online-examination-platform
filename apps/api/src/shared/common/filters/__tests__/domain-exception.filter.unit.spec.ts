import { HttpException, NotFoundException } from "@nestjs/common";
import { DomainError } from "../../../domain/exceptions/domain-error";
import { ErrorCategory } from "../../../domain/exceptions/error-category";
import { UnavailableError } from "../../../application/errors/unavailable.error";
import { toTransportError } from "../domain-exception.filter";

class MissingError extends DomainError {
  readonly code = "MISSING";
  readonly category = ErrorCategory.NotFound;
  constructor() {
    super("Not found");
  }
}

class ClosedError extends DomainError {
  readonly code = "CLOSED";
  readonly category = ErrorCategory.BusinessRule;
  constructor() {
    super("Attempt is closed");
  }
}

class SampleError extends DomainError {
  readonly code: string;
  readonly category: ErrorCategory;
  constructor(code: string, category: ErrorCategory, message: string) {
    super(message);
    this.code = code;
    this.category = category;
  }
}

describe("domain exception filter", () => {
  it("maps each semantic category to its transport status", () => {
    const cases: [ErrorCategory, number, string][] = [
      [ErrorCategory.BadInput, 400, "Invalid request"],
      [ErrorCategory.Unauthorized, 401, "Unauthenticated"],
      [ErrorCategory.Forbidden, 403, "Permission denied"],
      [ErrorCategory.NotFound, 404, "Not found"],
      [ErrorCategory.Conflict, 409, "Revision conflict"],
      [ErrorCategory.BusinessRule, 422, "Attempt is closed"],
      [ErrorCategory.RateLimited, 429, "Too many requests"],
    ];
    for (const [category, status, message] of cases) {
      expect(toTransportError(new SampleError(category, category, message))).toEqual({
        status,
        body: { data: null, errorCode: message, message, status: false },
      });
    }
    expect(new MissingError().category).toBe(ErrorCategory.NotFound);
    expect(toTransportError(new ClosedError()).status).toBe(422);
    expect(toTransportError(new UnavailableError("Service busy"))).toEqual({
      status: 503,
      body: { data: null, errorCode: "Service busy", message: "Service busy", status: false },
    });
  });

  it("collapses framework and unknown failures to safe text", () => {
    expect(toTransportError(new NotFoundException("missing route")).body.message).toBe("Not found");
    expect(toTransportError(new HttpException("raw parser detail", 400)).body).toEqual({
      data: null,
      errorCode: "Invalid request",
      message: "Invalid request",
      status: false,
    });
    expect(toTransportError(new Error("relation secret does not exist"))).toEqual({
      status: 503,
      body: {
        data: null,
        errorCode: "Service unavailable",
        message: "Service unavailable",
        status: false,
      },
    });
  });
});
