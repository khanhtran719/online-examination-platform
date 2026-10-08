import { SweepTickResult } from "./deadline-sweep";

export interface ExpiryLoopTiming {
  pollIntervalMs: number;
  jitterPercent: number;
  backoffInitialMs: number;
  backoffMaxMs: number;
}

export interface SweepDelayInput extends ExpiryLoopTiming {
  continueImmediately: boolean;
  failures: number;
  random: () => number;
}

/** Idle poll stays near the configured interval. A full batch does not sleep. Connection failures back off. */
export function sweepDelay(input: SweepDelayInput): number {
  const random = Math.min(1, Math.max(0, input.random()));
  if (input.failures > 0) {
    const exponent = Math.min(16, input.failures - 1);
    const base = Math.min(input.backoffMaxMs, input.backoffInitialMs * 2 ** exponent);
    return Math.round(base + base * (input.jitterPercent / 100) * random);
  }
  if (input.continueImmediately) return 0;
  const spread = input.pollIntervalMs * (input.jitterPercent / 100);
  return Math.max(0, Math.round(input.pollIntervalMs + spread * (random * 2 - 1)));
}

export async function runExpirySupervisor(input: {
  timing: ExpiryLoopTiming;
  stopping: () => boolean;
  runOnce: (tickId: string) => Promise<SweepTickResult>;
  newTickId: () => string;
  log: (event: Record<string, unknown>) => void;
  onReady: (ready: boolean) => void;
  delay: (ms: number) => Promise<void>;
  random?: () => number;
}): Promise<void> {
  const random = input.random ?? Math.random;
  let failures = 0;
  while (!input.stopping()) {
    const started = Date.now();
    try {
      const result = await input.runOnce(input.newTickId());
      const stalled = result.failed > 0 && result.processed === 0 && result.skipped === 0;
      failures = stalled ? failures + 1 : 0;
      input.onReady(!stalled);
      writeSweep(input.log, result, Date.now() - started);
      await input.delay(
        sweepDelay({
          ...input.timing,
          continueImmediately: !result.empty && !stalled,
          failures: stalled ? failures : 0,
          random,
        }),
      );
    } catch {
      failures += 1;
      input.onReady(false);
      try {
        input.log({ event: "expiry.poll.failed" });
      } catch {
        /* telemetry must not submit again */
      }
      await input.delay(
        sweepDelay({
          ...input.timing,
          continueImmediately: false,
          failures,
          random,
        }),
      );
    }
  }
}

function writeSweep(
  log: (event: Record<string, unknown>) => void,
  result: SweepTickResult,
  durationMs: number,
): void {
  try {
    log({
      event: "expiry.sweep",
      processed: result.processed,
      skipped: result.skipped,
      failed: result.failed,
      due: result.due,
      oldestDueAgeMs: result.oldestDueAgeMs,
      durationMs,
    });
  } catch {
    /* a log failure must not cause another submission write */
  }
}
