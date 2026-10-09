import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { DeadlineSweep } from "./application/services/deadline-sweep";
import { ExpiryLoopTiming, runExpirySupervisor } from "./application/services/expiry-supervisor";
import { PostgresAttemptRepository } from "./infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "./infrastructure/persistence/postgres-submission-outbox";
import { PostgresSubmissionDispatch } from "./infrastructure/persistence/postgres-submission-dispatch";
import { QueuePublisher } from "../../shared/application/ports/queue-publisher.port";
import { PublisherPolicy, SubmissionPublisher } from "./application/services/submission-publisher";
import { PublisherLoop, runPublisherSupervisor } from "./application/services/publisher-supervisor";
import { createHash } from "node:crypto";
import { CatalogAccess } from "../catalog/application/facades/catalog.facade";
import { GradingConsumer } from "./application/services/grading-consumer";
import { PostgresGradingRepository } from "./infrastructure/persistence/postgres-grading.repository";
import { assertSubmittedEvent } from "./domain/assessment-policy";
import { GradingRecovery } from "./application/services/grading-recovery";
import { PostgresGradingFailureRepository } from "./infrastructure/persistence/postgres-grading-failure.repository";

/** Inbound settlement owns the root COMMIT boundary, including poison writes. */
function gradingInbound(
  db: PostgresDatabase,
  consume: (body: unknown, digest: string, generation: number) => Promise<string>,
) {
  return {
    consume: async (raw: string, generation: unknown = 0) => {
      db.assertOutsideTransaction();
      const digest = createHash("sha256").update(raw).digest("hex");
      let body: unknown = null;
      const validGeneration =
        typeof generation === "number" &&
        Number.isInteger(generation) &&
        generation >= 0 &&
        generation <= 1000;
      if (validGeneration && Buffer.byteLength(raw, "utf8") <= 16384) {
        try {
          body = JSON.parse(raw);
        } catch {
          /* malformed JSON */
        }
      }
      const outcome = await consume(body, digest, validGeneration ? generation : 0);
      let correlationId: string | undefined;
      try {
        assertSubmittedEvent(body);
        correlationId = body.correlationId.toLowerCase();
      } catch {
        /* no trusted trace identity */
      }
      return { outcome, ...(correlationId ? { correlationId } : {}) };
    },
  };
}
export function createGradingConsumer(
  db: PostgresDatabase,
  catalog: Pick<CatalogAccess, "getScoringSnapshot">,
) {
  const recovery = new GradingRecovery(new PostgresGradingFailureRepository(db), db);
  const consumer = new GradingConsumer(new PostgresGradingRepository(db), catalog, db, recovery);
  return gradingInbound(db, (body, digest, generation) =>
    consumer.consume(body, digest, generation),
  );
}
/** DLQ settlement has no Catalog/key access and cannot authorize its own replay. */
export function createGradingRecovery(db: PostgresDatabase) {
  const recovery = new GradingRecovery(new PostgresGradingFailureRepository(db), db);
  return gradingInbound(db, (body, digest, generation) =>
    recovery.consume(body, digest, generation, "RETRY_EXHAUSTED"),
  );
}
export function createGradingReplay(db: PostgresDatabase) {
  const repository = new PostgresGradingFailureRepository(db);
  return {
    replay: (
      attempt: string,
      revision: number,
      operator: string,
      reason: string,
      correlation: string,
    ) => {
      db.assertOutsideTransaction();
      return repository.replay(attempt, revision, operator, reason, correlation);
    },
  };
}

export interface ExpiryWorkerRuntime {
  runOnce(tickId: string, stopping?: () => boolean): Promise<void>;
  supervise(input: {
    timing: ExpiryLoopTiming;
    stopping: () => boolean;
    newTickId: () => string;
    log: (event: Record<string, unknown>) => void;
    onReady: (ready: boolean) => void;
    delay: (ms: number) => Promise<void>;
    random?: () => number;
  }): Promise<void>;
}

/** Public runtime composition. Private adapters stay inside Assessment. */
export function createExpiryWorker(db: PostgresDatabase, batchSize: number): ExpiryWorkerRuntime {
  const sweep = new DeadlineSweep(
    new PostgresAttemptRepository(db),
    new PostgresSubmissionOutbox(db),
    db,
    batchSize,
  );
  return {
    runOnce: async (tickId, stopping) => {
      await sweep.runOnce(tickId, stopping);
    },
    supervise: (input) =>
      runExpirySupervisor({
        ...input,
        runOnce: (tickId) => sweep.runOnce(tickId, input.stopping),
      }),
  };
}

/** Explicit public composition for submission delivery. No grading result is implied. */
export function createSubmissionPublisher(
  db: PostgresDatabase,
  queue: QueuePublisher,
  policy: PublisherPolicy,
  observe?: (event: Record<string, unknown>) => void,
) {
  const repository = new PostgresSubmissionDispatch(db);
  const publisher = new SubmissionPublisher(repository, queue, policy, Math.random, observe);
  return {
    runOnce: (stopping?: () => boolean) => publisher.runOnce(stopping),
    backlog: () => repository.backlog(),
    supervise: (input: {
      timing: PublisherLoop;
      stopping: () => boolean;
      delay: (ms: number) => Promise<void>;
      onReady: (ready: boolean) => void;
      observe: (result: Awaited<ReturnType<SubmissionPublisher["runOnce"]>> | null) => void;
    }) => runPublisherSupervisor({ ...input, runOnce: () => publisher.runOnce(input.stopping) }),
  };
}

/** Dedicated database operator authority; business submission identity stays frozen. */
export function createSubmissionReplay(db: PostgresDatabase) {
  const repository = new PostgresSubmissionDispatch(db);
  return {
    replay: (eventId: string, actor: string, reason: string, correlation: string) =>
      repository.replay(eventId, actor, reason, correlation),
  };
}
