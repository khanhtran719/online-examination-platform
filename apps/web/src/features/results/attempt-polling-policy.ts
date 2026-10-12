import type { Attempt } from "@web/shared/api/dto";

export const POLL_CAP_MS = 5 * 60 * 1000;

export function shouldStopPolling(attempt: Attempt, elapsedMs: number): boolean {
  if (attempt.status === "COMPLETED") return true;
  if (attempt.status === "FAILED" && !attempt.replayPending) return true;
  return elapsedMs >= POLL_CAP_MS;
}
