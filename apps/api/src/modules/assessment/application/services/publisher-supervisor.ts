import { PublishResult } from "./submission-publisher";

export interface PublisherLoop {
  concurrency: number;
  pollIntervalMs: number;
  backoffInitialMs: number;
  backoffMaxMs: number;
}

export async function runPublisherSupervisor(input: {
  timing: PublisherLoop;
  stopping: () => boolean;
  runOnce: () => Promise<PublishResult>;
  delay: (ms: number) => Promise<void>;
  onReady: (ready: boolean) => void;
  observe: (result: PublishResult | null) => void;
  random?: () => number;
}): Promise<void> {
  const random = input.random ?? Math.random;
  let failures = 0;
  while (!input.stopping()) {
    let result: PublishResult | null = null;
    try {
      result = await input.runOnce();
      failures = result.retried > 0 && result.delivered === 0 ? failures + 1 : 0;
      input.onReady(failures === 0);
    } catch {
      failures += 1;
      input.onReady(false);
    }
    try {
      input.observe(result);
    } catch {
      /* Metrics cannot drive another send. */
    }
    const jitter = Math.min(1, Math.max(0, random()));
    const delay = failures
      ? Math.floor(
          Math.min(
            input.timing.backoffMaxMs,
            input.timing.backoffInitialMs * 2 ** Math.min(20, failures - 1),
          ) *
            (0.5 + 0.5 * jitter),
        )
      : result?.claimed === input.timing.concurrency
        ? 0
        : Math.floor(input.timing.pollIntervalMs * (0.8 + 0.4 * jitter));
    await input.delay(delay);
  }
}
