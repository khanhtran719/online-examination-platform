-- 0011 CHECK admitted UNKNOWN for an accepted NULL kind. Do not infer a missing
-- winner from EXPIRED/SUBMITTED: an invalid existing row must stop migration for
-- reviewed provenance recovery. The runner applies this replacement atomically.
ALTER TABLE assessment.attempts
  DROP CONSTRAINT attempts_submission_kind_check;

ALTER TABLE assessment.attempts
  ADD CONSTRAINT attempts_submission_kind_check CHECK (
    (
      submitted_at IS NULL
      AND submission_kind IS NULL
    )
    OR (
      submitted_at IS NOT NULL
      AND submission_kind IS NOT NULL
      AND submission_kind IN ('MANUAL', 'DEADLINE')
      AND (
        submission_kind <> 'DEADLINE'
        OR expired
      )
    )
  );
