import assert from "node:assert/strict";
import { test } from "node:test";
import { quantiles, summarize, median } from "../statistics.mjs";
test("nearest rank percentiles retain the tail without mutating samples", () => {
  const samples = [100, 1, 2, 3];
  assert.deepEqual(quantiles(samples), { p50: 2, p95: 100, p99: 100 });
  assert.equal(samples[0], 100);
});
test("failed requests count in achieved throughput and all-latency population", () => {
  const result = summarize(
    [
      { ms: 1, ok: true },
      { ms: 100, ok: false },
    ],
    1000,
  );
  assert.equal(result.successfulRps, 1);
  assert.equal(result.completedRps, 2);
  assert.equal(result.errorRate, 0.5);
  assert.equal(result.latencyMs.p99, 100);
  assert.equal(result.successLatencyMs.p99, 1);
});
test("empty and odd/even populations have explicit deterministic summaries", () => {
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(summarize([], 100).samples, 0);
  assert.equal(summarize([], 100).latencyMs, null);
});
