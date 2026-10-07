export interface ClockSample {
  serverNowMs: number;
  monotonicAtSample: number;
  deadlineMs: number;
  rttMs: number;
  canSave: boolean;
}

export function remainingMs(sample: ClockSample, monotonicNow: number): number {
  const elapsed = Math.max(0, monotonicNow - sample.monotonicAtSample);
  const estimatedServer = sample.serverNowMs + elapsed;
  return Math.max(0, sample.deadlineMs - estimatedServer);
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clockMilestone(previousMs: number, nextMs: number): "five" | "one" | "zero" | null {
  if (previousMs > 5 * 60 * 1000 && nextMs <= 5 * 60 * 1000 && nextMs > 0) return "five";
  if (previousMs > 60 * 1000 && nextMs <= 60 * 1000 && nextMs > 0) return "one";
  if (previousMs > 0 && nextMs <= 0) return "zero";
  return null;
}
