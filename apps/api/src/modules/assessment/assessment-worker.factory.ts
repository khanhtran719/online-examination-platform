import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { DeadlineSweep } from "./application/services/deadline-sweep";
import { ExpiryLoopTiming, runExpirySupervisor } from "./application/services/expiry-supervisor";
import { PostgresAttemptRepository } from "./infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "./infrastructure/persistence/postgres-submission-outbox";
import { PostgresSubmissionDispatch } from "./infrastructure/persistence/postgres-submission-dispatch";
import { QueuePublisher } from "../../shared/application/ports/queue-publisher.port";
import { PublisherPolicy, SubmissionPublisher } from "./application/services/submission-publisher";
import { PublisherLoop, runPublisherSupervisor } from "./application/services/publisher-supervisor";

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
