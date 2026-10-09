export const RECEIPT_RETENTION_MS = 7 * 86400000;
export const ATTEMPT_RETENTION_MS = 365 * 86400000;
export interface RetentionState {
  id: string;
  status: string;
  submittedAt: number | null;
  completedAt: number | null;
  serverNow: number;
  resultPresent: boolean;
  inboxPresent: boolean;
  replayPending: boolean;
  outstandingDelivery: boolean;
  unresolvedFailure: boolean;
  recentReceipt: boolean;
  purged: boolean;
}

/** Completed payload withdrawal; compact quota/submission identity remains durable. */
export function canPurgeCompleted(s: RetentionState): boolean {
  return (
    s.status === "COMPLETED" &&
    !s.purged &&
    !s.replayPending &&
    s.resultPresent &&
    s.inboxPresent &&
    !s.outstandingDelivery &&
    !s.unresolvedFailure &&
    !s.recentReceipt &&
    s.submittedAt !== null &&
    s.completedAt !== null &&
    Number.isFinite(s.serverNow) &&
    Number.isFinite(s.submittedAt) &&
    Number.isFinite(s.completedAt) &&
    s.serverNow - s.submittedAt >= ATTEMPT_RETENTION_MS &&
    s.serverNow - s.completedAt >= RECEIPT_RETENTION_MS
  );
}
