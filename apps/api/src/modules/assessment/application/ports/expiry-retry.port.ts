/** Durable scheduler workflow metadata; independent of an attempt's business failure state. */
export interface ExpiryRetry {
  /** Recheck IN_PROGRESS under a row lock, then persist a bounded retry cooldown. */
  deferExpiry(attemptId: string): Promise<void>;
}
