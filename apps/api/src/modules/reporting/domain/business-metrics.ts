import { invalidReport } from "./reporting.error";
const maxWindowMs = 7 * 86400000;
export interface BusinessMetricCounters {
  startedAttempts: string;
  activeAttempts: string;
  submittedAttempts: string;
  completedAttempts: string;
  failedAttempts: string;
  expiredSubmissions: string;
  expiredCompletedAttempts: string;
  pendingAttempts: string;
  replayPendingAttempts: string;
}
function at(value: string): number {
  const n = Date.parse(value);
  if (
    value.startsWith("0000-") ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(n) ||
    new Date(n).toISOString() !== value
  )
    throw invalidReport();
  return n;
}
export function validateMetricWindow(from: string | null, to: string | null): void {
  if (from === null && to === null) return;
  if (from === null || to === null) throw invalidReport();
  const span = at(to) - at(from);
  if (span <= 0 || span > maxWindowMs) throw invalidReport();
}
function unavailable(): never {
  throw new Error("METRICS_STATE_UNAVAILABLE");
}
function count(value: string): number {
  if (!/^(0|[1-9][0-9]{0,9})$/.test(value)) unavailable();
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 2147483647) unavailable();
  return n;
}
export function businessMetricValues(value: {
  asOf: string;
  from: string;
  to: string;
  counts: BusinessMetricCounters;
  oldestSubmittedAt: string | null;
}) {
  let now: number, to: number;
  try {
    validateMetricWindow(value.from, value.to);
    now = at(value.asOf);
    to = at(value.to);
  } catch {
    unavailable();
  }
  if (to > now) unavailable();
  const c = value.counts,
    counts = {
      startedAttempts: count(c.startedAttempts),
      activeAttempts: count(c.activeAttempts),
      submittedAttempts: count(c.submittedAttempts),
      completedAttempts: count(c.completedAttempts),
      failedAttempts: count(c.failedAttempts),
      expiredSubmissions: count(c.expiredSubmissions),
      expiredCompletedAttempts: count(c.expiredCompletedAttempts),
    };
  const pendingAttempts = count(c.pendingAttempts),
    replayPendingAttempts = count(c.replayPendingAttempts);
  if (
    counts.activeAttempts + counts.submittedAttempts > counts.startedAttempts ||
    counts.completedAttempts + counts.failedAttempts > counts.submittedAttempts ||
    counts.expiredSubmissions > counts.submittedAttempts ||
    counts.expiredCompletedAttempts >
      Math.min(counts.completedAttempts, counts.expiredSubmissions) ||
    replayPendingAttempts > pendingAttempts
  )
    unavailable();
  let oldestAgeSeconds: number | null = null;
  if (pendingAttempts === 0) {
    if (value.oldestSubmittedAt !== null) unavailable();
  } else {
    if (value.oldestSubmittedAt === null) unavailable();
    let oldest: number;
    try {
      oldest = at(value.oldestSubmittedAt);
    } catch {
      unavailable();
    }
    if (oldest > now) unavailable();
    oldestAgeSeconds = Math.floor((now - oldest) / 1000);
    if (!Number.isSafeInteger(oldestAgeSeconds) || oldestAgeSeconds < 0) unavailable();
  }
  return {
    asOf: value.asOf,
    window: { from: value.from, to: value.to, basis: "ATTEMPT_STARTED_AT" as const },
    counts,
    backlog: {
      pendingAttempts,
      replayPendingAttempts,
      oldestSubmittedAt: value.oldestSubmittedAt,
      oldestAgeSeconds,
    },
  };
}
