-- Scheduler-only metadata. Failed acceptance rolls back first; a subsequent
-- short locked transaction records cooldown without changing business status,
-- revision, accepted identity, answers or an outbox intent. A process restart
-- keeps this schedule. Counts saturate at 16; delay is capped at 30 seconds.
ALTER TABLE assessment.attempts
  ADD COLUMN expiry_retry_count integer NOT NULL DEFAULT 0
    CHECK (expiry_retry_count BETWEEN 0 AND 16),
  ADD COLUMN expiry_retry_after timestamptz(3)
    CHECK (expiry_retry_after IS NULL OR isfinite(expiry_retry_after));

GRANT UPDATE (
  expiry_retry_count,
  expiry_retry_after
) ON assessment.attempts TO examination_expiry_worker;
