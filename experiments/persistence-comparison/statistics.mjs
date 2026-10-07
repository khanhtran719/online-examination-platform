export function quantiles(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Object.fromEntries(
    [
      ["p50", 0.5],
      ["p95", 0.95],
      ["p99", 0.99],
    ].map(([key, rank]) => [key, sorted[Math.ceil(sorted.length * rank) - 1]]),
  );
}
export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function summarize(samples, elapsedMs) {
  const successes = samples.filter((sample) => sample.ok);
  return {
    samples: samples.length,
    errors: samples.length - successes.length,
    errorRate: samples.length ? 1 - successes.length / samples.length : 0,
    durationMs: elapsedMs,
    completedRps: (samples.length * 1000) / elapsedMs,
    successfulRps: (successes.length * 1000) / elapsedMs,
    latencyMs: quantiles(samples.map((sample) => sample.ms)),
    successLatencyMs: quantiles(successes.map((sample) => sample.ms)),
    failureLatencyMs: quantiles(samples.filter((sample) => !sample.ok).map((sample) => sample.ms)),
  };
}
