export function nextPollDelayMs(input: {
  attemptIndex: number;
  pollAfterSeconds: number;
  retryAfterSeconds: number | null;
  random: number;
}): number {
  const exponential = Math.min(10_000, 2_000 * 2 ** Math.max(0, input.attemptIndex));
  const serverMinimum = Math.max(
    0,
    Math.max(0, input.pollAfterSeconds) * 1000,
    (input.retryAfterSeconds ?? 0) * 1000,
  );
  return Math.max(serverMinimum, Math.round(exponential * (0.8 + 0.4 * clamp01(input.random))));
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
