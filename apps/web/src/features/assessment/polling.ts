import type { Attempt } from "../../shared/api/dto";

export const POLL_CAP_MS = 5 * 60 * 1000;

export function nextPollDelayMs(input: {
  attemptIndex: number;
  pollAfterSeconds: number;
  retryAfterSeconds: number | null;
  random: number;
}): number {
  const exponential = Math.min(10_000, 2_000 * 2 ** Math.max(0, input.attemptIndex));
  const hinted = Math.max(
    exponential,
    Math.max(0, input.pollAfterSeconds) * 1000,
    (input.retryAfterSeconds ?? 0) * 1000,
  );
  const capped = Math.min(10_000, Math.max(2_000, hinted));
  return Math.round(capped * (0.8 + 0.4 * clamp01(input.random)));
}

export function shouldStopPolling(attempt: Attempt, elapsedMs: number): boolean {
  if (attempt.status === "COMPLETED") return true;
  if (attempt.status === "FAILED" && !attempt.replayPending) return true;
  return elapsedMs >= POLL_CAP_MS;
}

export function canRestartPoll(input: {
  hidden: boolean;
  cancelled: boolean;
  stopped: boolean;
  inFlight: boolean;
}): boolean {
  return !input.hidden && !input.cancelled && !input.stopped && !input.inFlight;
}

export function monitorDelayMs(random: number): number {
  return Math.round(12_500 * (0.8 + 0.4 * clamp01(random)));
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
