import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { assertSubmittedEvent } from "../../domain/assessment-policy";
import { Attempt } from "../../domain/attempt";
import { matchesSubmission } from "../../domain/grading-submission";
import {
  GradingFailureRepository,
  GradingFailureCode,
} from "../ports/grading-failure-repository.port";

export class GradingRecovery {
  constructor(
    private readonly repository: GradingFailureRepository,
    private readonly uow: UnitOfWork,
  ) {}
  async consume(body: unknown, digest: string, generation: number, code: GradingFailureCode) {
    try {
      assertSubmittedEvent(body);
    } catch {
      await this.repository.quarantine(digest, "INVALID_SCHEMA");
      return "quarantined" as const;
    }
    return this.uow.transaction(async () => {
      const attempt = await this.repository.lock(body.payload.attemptId);
      if (!attempt || !matchesSubmission(attempt, body) || generation > attempt.gradingGeneration) {
        await this.repository.quarantine(digest, "SUBMISSION_MISMATCH");
        return "quarantined" as const;
      }
      if (generation < attempt.gradingGeneration) return "stale" as const;
      if (attempt.status === "COMPLETED" && attempt.resultPresent) return "duplicate" as const;
      if (attempt.status === "FAILED" && !attempt.replayPending) {
        if (!attempt.failurePresent) throw new Error("GRADING_STATE_UNAVAILABLE");
        return "terminal" as const;
      }
      if (attempt.resultPresent || !["SUBMITTED", "EXPIRED", "FAILED"].includes(attempt.status))
        throw new Error("GRADING_STATE_UNAVAILABLE");
      const lifecycle = Attempt.restore(attempt);
      lifecycle.processing();
      lifecycle.fail();
      await this.repository.recordFailure(attempt, body, digest, code);
      return "terminal" as const;
    });
  }
}
