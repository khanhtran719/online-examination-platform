import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { DeadlineSweep } from "./application/services/deadline-sweep";
import { ExpiryLoopTiming, runExpirySupervisor } from "./application/services/expiry-supervisor";
import { PostgresAttemptRepository } from "./infrastructure/persistence/postgres-attempt.repository";
import { PostgresSubmissionOutbox } from "./infrastructure/persistence/postgres-submission-outbox";

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
