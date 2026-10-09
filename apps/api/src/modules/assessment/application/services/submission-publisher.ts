import {
  QueuePublisher,
  QueuePublishError,
} from "../../../../shared/application/ports/queue-publisher.port";
import { assertSubmittedEvent } from "../../domain/assessment-policy";
import { SubmissionClaim, SubmissionDispatch } from "../ports/submission-dispatch.port";

export interface PublisherPolicy {
  concurrency: number;
  leaseMs: number;
  maxAttempts: number;
  maxAgeMs: number;
  backoffInitialMs: number;
  backoffMaxMs: number;
}

export interface PublishResult {
  claimed: number;
  delivered: number;
  retried: number;
  parked: number;
  fenced: number;
}

export class SubmissionPublisher {
  constructor(
    private readonly repository: SubmissionDispatch,
    private readonly queue: QueuePublisher,
    private readonly policy: PublisherPolicy,
    private readonly random: () => number = Math.random,
    private readonly observe: (event: Record<string, unknown>) => void = () => undefined,
  ) {}

  async runOnce(stopping: () => boolean = () => false): Promise<PublishResult> {
    const result: PublishResult = { claimed: 0, delivered: 0, retried: 0, parked: 0, fenced: 0 };
    if (stopping()) return result;
    const rows = await this.repository.claim(this.policy.concurrency, this.policy.leaseMs);
    result.claimed = rows.length;
    // All claimed slots start now: there is no local queue consuming the lease.
    // Settle every admitted send before shutdown/rethrow, even if one DB ACK fails.
    const outcomes = await Promise.allSettled(rows.map((row) => this.publish(row, result)));
    const failed = outcomes.find((outcome) => outcome.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    return result;
  }

  private async publish(row: SubmissionClaim, result: PublishResult): Promise<void> {
    let body: string;
    try {
      assertSubmittedEvent(row.payload);
      const event = row.payload;
      if (
        event.eventId !== row.eventId ||
        event.aggregateId !== row.aggregateId ||
        event.correlationId !== row.correlationId ||
        event.causationId !== row.causationId
      ) {
        throw new Error("Invalid event identity");
      }
      body = JSON.stringify(event);
    } catch {
      await this.fail(row, result, "INVALID_EVENT", true);
      return;
    }
    if (row.ageMs >= this.policy.maxAgeMs) {
      await this.fail(row, result, "EVENT_TOO_OLD", true);
      return;
    }
    if (row.attempts > this.policy.maxAttempts) {
      await this.fail(row, result, "RETRY_EXHAUSTED", true);
      return;
    }
    const started = Date.now();
    try {
      await this.queue.publish(body, row.generation ?? 0);
    } catch (error) {
      const permanent = error instanceof QueuePublishError && error.permanent;
      const exhausted = row.attempts >= this.policy.maxAttempts;
      await this.fail(
        row,
        result,
        exhausted ? "RETRY_EXHAUSTED" : permanent ? "QUEUE_REJECTED" : "QUEUE_UNAVAILABLE",
        permanent || exhausted,
      );
      return;
    }
    // A failed/lost database ACK stays leased; recovery may send a duplicate.
    const marked = await this.repository.delivered(row);
    if (marked) result.delivered += 1;
    else result.fenced += 1;
    this.emit({
      event: marked ? "submission.published" : "submission.publish.fenced",
      durationMs: Date.now() - started,
      eventId: row.eventId,
      correlationId: row.correlationId,
    });
  }

  private async fail(row: SubmissionClaim, result: PublishResult, code: string, park: boolean) {
    const ceiling = Math.min(
      this.policy.backoffMaxMs,
      this.policy.backoffInitialMs * 2 ** Math.min(20, row.attempts - 1),
    );
    const delay = park ? 0 : Math.floor(ceiling * (0.5 + 0.5 * this.random()));
    const changed = await this.repository.failed(row, code, delay, park);
    if (!changed) result.fenced += 1;
    else if (park) result.parked += 1;
    else result.retried += 1;
    this.emit({
      event: "submission.publish.failure",
      code,
      park,
      fenced: !changed,
      eventId: row.eventId,
      correlationId: row.correlationId,
    });
  }

  private emit(event: Record<string, unknown>): void {
    try {
      this.observe(event);
    } catch {
      /* Observability cannot change durable semantics. */
    }
  }
}
