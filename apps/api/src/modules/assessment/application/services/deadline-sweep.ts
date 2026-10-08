import { randomUUID } from "node:crypto";
import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { AttemptRepository } from "../../domain/repositories/attempt.repository";
import { SubmissionOutbox } from "../ports/submission-outbox";
import { acceptAttemptSubmission } from "./attempt-submission";

export interface SweepTickResult {
  processed: number;
  skipped: number;
  failed: number;
  /** True when the claim found no further eligible row in this tick. */
  empty: boolean;
  due: number | null;
  oldestDueAgeMs: number | null;
}

/**
 * Trusted internal sweep. One short transaction per attempt.
 * A failure excludes that id for the rest of the tick only and does not mark the attempt FAILED.
 * Counters increase only after the transaction resolves.
 */
export class DeadlineSweep {
  constructor(
    private readonly repo: Pick<AttemptRepository, "claimDue" | "submit" | "dueBacklog">,
    private readonly outbox: SubmissionOutbox,
    private readonly uow: UnitOfWork,
    private readonly batchSize: number,
  ) {}

  async runOnce(tickId: string, stopping: () => boolean = () => false): Promise<SweepTickResult> {
    const exclude: string[] = [];
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let empty = false;
    for (let index = 0; index < this.batchSize; index += 1) {
      if (stopping()) break;
      let claimedId: string | undefined;
      try {
        const outcome = await this.uow.transaction(async () => {
          const locked = await this.repo.claimDue(exclude);
          if (!locked) return "empty" as const;
          claimedId = locked.id;
          if (Date.parse(locked.serverNow) < Date.parse(locked.deadline)) return "before" as const;
          const accepted = await acceptAttemptSubmission(this.repo, this.outbox, {
            locked,
            kind: "DEADLINE",
            correlationId: randomUUID(),
            causationId: tickId,
          });
          return accepted.written ? ("accepted" as const) : ("already" as const);
        });
        if (outcome === "empty") {
          empty = true;
          break;
        }
        if (outcome === "accepted") processed += 1;
        else {
          skipped += 1;
          if (claimedId) exclude.push(claimedId);
        }
      } catch (error) {
        if (!claimedId) throw error;
        failed += 1;
        exclude.push(claimedId);
      }
    }
    let due: number | null = null;
    let oldestDueAgeMs: number | null = null;
    try {
      const backlog = await this.repo.dueBacklog();
      due = backlog.due;
      oldestDueAgeMs = backlog.oldestDueAgeMs;
    } catch {
      due = null;
      oldestDueAgeMs = null;
    }
    return { processed, skipped, failed, empty, due, oldestDueAgeMs };
  }
}
