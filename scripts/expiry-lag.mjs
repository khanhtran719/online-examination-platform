/** Local diagnostics only; one bounded DB clock calibration outside the timed population. */
export async function calibrateClock(readServerNow, now = Date.now) {
  const started = now();
  const server = Date.parse(await readServerNow());
  const ended = now();
  if (!Number.isFinite(server) || ended < started) throw new Error("Clock calibration failed");
  // +/-1ms includes timestamp serialization resolution. Network asymmetry remains
  // within the round-trip interval; this is an estimate, not a WAL commit timestamp.
  const lower = server - ended - 1;
  const upper = server - started + 1;
  return {
    offsetMs: (lower + upper) / 2,
    uncertaintyMs: (upper - lower) / 2,
    roundTripMs: ended - started,
  };
}

function distribution(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const percentile = (ratio) =>
    sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)]
      : null;
  return {
    sampleCount: sorted.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    minMs: sorted.length ? sorted[0] : null,
    maxMs: sorted.length ? sorted.at(-1) : null,
  };
}

export function createExpiryLagRecorder({ calibration, now = Date.now }) {
  const acceptance = [];
  const commitAck = [];
  return {
    committed({ deadline, acceptedAt }) {
      const observed = now();
      const due = Date.parse(deadline);
      const accepted = Date.parse(acceptedAt);
      if (!Number.isFinite(due) || !Number.isFinite(accepted))
        throw new Error("Invalid observed timestamp");
      acceptance.push(accepted - due);
      commitAck.push(observed + calibration.offsetMs - due);
    },
    summary() {
      return {
        deadlineToAcceptanceLagMs: distribution(acceptance),
        deadlineToCommitAckObservedLagMs: distribution(commitAck),
        clockCalibration: { ...calibration },
        observationPoint:
          "Successful UnitOfWork COMMIT acknowledgement observed by caller; calibrated UTC estimate, not a physical WAL commit timestamp.",
      };
    },
  };
}
