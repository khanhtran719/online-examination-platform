import { CatalogAccess } from "../../../catalog/application/facades/catalog.facade";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { assertSubmittedEvent } from "../../domain/assessment-policy";
import { matchesSubmission } from "../../domain/grading-submission";
import { AssessmentError } from "../../domain/assessment.error";
import { GradingRecovery } from "./grading-recovery";
import { Attempt } from "../../domain/attempt";
import { grade } from "../../domain/grading";
import { GradingRepository } from "../ports/grading-repository.port";

export type GradingOutcome = "completed" | "duplicate" | "quarantined" | "stale" | "terminal";
export class GradingConsumer {
  constructor(
    private readonly repository: GradingRepository,
    private readonly catalog: Pick<CatalogAccess, "getScoringSnapshot">,
    private readonly uow: UnitOfWork,
    private readonly recovery: GradingRecovery,
  ) {}

  async consume(body: unknown, digest: string, generation = 0): Promise<GradingOutcome> {
    try {
      assertSubmittedEvent(body);
    } catch {
      await this.repository.quarantine(digest, "INVALID_SCHEMA");
      return "quarantined";
    }
    try {
      return await this.uow.transaction(async () => {
        const attempt = await this.repository.lock(body.payload.attemptId);
        if (
          !attempt ||
          !matchesSubmission(attempt, body, true) ||
          generation > attempt.gradingGeneration
        ) {
          await this.repository.quarantine(digest, "SUBMISSION_MISMATCH");
          return "quarantined";
        }
        if (generation < attempt.gradingGeneration) return "stale";
        if (attempt.status === "COMPLETED" && attempt.purged) return "duplicate";
        if (attempt.status === "COMPLETED" && attempt.resultPresent) {
          await this.repository.inbox(body.eventId, attempt.id);
          return "duplicate";
        }
        if (attempt.status === "FAILED" && !attempt.replayPending && attempt.failurePresent)
          return "terminal";
        if (
          attempt.resultPresent ||
          !["SUBMITTED", "EXPIRED", "FAILED"].includes(attempt.status) ||
          (attempt.status === "FAILED" && !attempt.replayPending)
        )
          throw new Error("GRADING_STATE_UNAVAILABLE");
        const lifecycle = Attempt.restore(attempt);
        lifecycle.processing();
        await this.repository.begin(attempt.id);
        const snapshot = await this.catalog.getScoringSnapshot(attempt.publishedVersionId);
        const answers = await this.repository.answers(attempt.id);
        const result = grade(
          snapshot.map((q) => ({
            id: q.questionId,
            sectionId: q.sectionId,
            type: q.type,
            points: q.points,
            optionIds: q.optionIds,
            correctIds: q.correctOptionIds,
          })),
          answers,
        );
        lifecycle.complete();
        await this.repository.complete(attempt, result);
        await this.repository.inbox(body.eventId, attempt.id);
        return "completed";
      });
    } catch (error) {
      if (error instanceof AssessmentError)
        return this.recovery.consume(body, digest, generation, "SCORING_INVALID");
      throw error;
    }
  }
}
