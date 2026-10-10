import { DomainError } from "../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../shared/domain/exceptions/error-category";
export class RankingError extends DomainError {
  readonly code = "RANKING_REQUEST";
  constructor(
    readonly category: ErrorCategory,
    message: string,
  ) {
    super(message);
  }
}
export const invalidRanking = () => new RankingError(ErrorCategory.BadInput, "Invalid request");
export const rankingNotFound = () => new RankingError(ErrorCategory.NotFound, "Not found");
export const rankingDenied = () => new RankingError(ErrorCategory.Forbidden, "Permission denied");
