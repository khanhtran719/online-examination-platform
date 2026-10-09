import { SubmittedEvent } from "../../domain/assessment-policy";
import { GradingAttempt, GradingRepository } from "./grading-repository.port";
export type GradingFailureCode = "SCORING_INVALID" | "RETRY_EXHAUSTED";
export interface GradingFailureRepository extends Pick<GradingRepository, "lock" | "quarantine"> {
  recordFailure(
    attempt: GradingAttempt,
    event: SubmittedEvent,
    digest: string,
    code: GradingFailureCode,
  ): Promise<void>;
}
