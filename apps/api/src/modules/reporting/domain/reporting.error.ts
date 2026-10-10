import { DomainError } from "../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../shared/domain/exceptions/error-category";
export class ReportingError extends DomainError {
  readonly code = "REPORTING_REQUEST";
  constructor(
    readonly category: ErrorCategory,
    message: string,
  ) {
    super(message);
  }
}
export const invalidReport = () => new ReportingError(ErrorCategory.BadInput, "Invalid request");
export const reportNotFound = () => new ReportingError(ErrorCategory.NotFound, "Not found");
export const reportDenied = () => new ReportingError(ErrorCategory.Forbidden, "Permission denied");

export const reportNotReady = () => new ReportingError(ErrorCategory.Conflict, "Result not ready");
