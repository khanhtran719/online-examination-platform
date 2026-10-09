import assert from "node:assert/strict";
import { test } from "node:test";
import { calibrateClock, createExpiryLagRecorder } from "../expiry-lag.mjs";

test("calibrates database UTC to local wall clock with a round-trip uncertainty bound", async () => {
  const times = [1000, 1010];
  const calibration = await calibrateClock(
    async () => new Date(2005).toISOString(),
    () => times.shift(),
  );
  assert.equal(calibration.offsetMs, 1000);
  assert.equal(calibration.uncertaintyMs, 6);
  assert.equal(calibration.roundTripMs, 10);
});

test("commit acknowledgement includes persistence delay separately from acceptance lag", () => {
  const recorder = createExpiryLagRecorder({
    calibration: { offsetMs: 1000, uncertaintyMs: 6, roundTripMs: 10 },
    now: () => 1200,
  });
  recorder.committed({
    deadline: new Date(1000).toISOString(),
    acceptedAt: new Date(2000).toISOString(),
  });
  const result = recorder.summary();
  assert.equal(result.deadlineToAcceptanceLagMs.p99Ms, 1000);
  assert.equal(result.deadlineToCommitAckObservedLagMs.p99Ms, 1200);
  assert.equal(result.deadlineToCommitAckObservedLagMs.sampleCount, 1);
  assert.equal(result.clockCalibration.uncertaintyMs, 6);
  assert.equal(
    result.observationPoint,
    "Successful UnitOfWork COMMIT acknowledgement observed by caller; calibrated UTC estimate, not a physical WAL commit timestamp.",
  );
});

test("does not turn absent observations into zero latency", () => {
  const result = createExpiryLagRecorder({
    calibration: { offsetMs: 0, uncertaintyMs: 1, roundTripMs: 0 },
  }).summary();
  assert.equal(result.deadlineToCommitAckObservedLagMs.sampleCount, 0);
  assert.equal(result.deadlineToCommitAckObservedLagMs.p50Ms, null);
  assert.equal(result.deadlineToAcceptanceLagMs.p99Ms, null);
});
