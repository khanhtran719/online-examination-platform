-- Durable submission provenance for manual submit and the deadline sweep.
-- The attempt row is the acceptance authority. Migration 0006 freezes
-- submitted_at, submission_id, submission_event_id and expired, but it does
-- not store whether the winner was MANUAL or DEADLINE. The outbox payload
-- alone cannot be the source of truth: a later reader must not infer kind
-- from status, and a lost dispatcher must not invent it.
-- Existing accepted rows were written only by manual submit, so they backfill
-- to MANUAL. Unsubmitted rows have no kind. 0001-0010 are unchanged.

ALTER TABLE assessment.attempts
  ADD COLUMN submission_kind text;

UPDATE assessment.attempts
SET
  submission_kind = 'MANUAL'
WHERE
  submitted_at IS NOT NULL
  AND submission_kind IS NULL;

ALTER TABLE assessment.attempts
  ADD CONSTRAINT attempts_submission_kind_check CHECK (
    (
      submission_kind IS NULL
      AND submitted_at IS NULL
    )
    OR (
      submission_kind IN ('MANUAL', 'DEADLINE')
      AND submitted_at IS NOT NULL
      AND (
        submission_kind <> 'DEADLINE'
        OR expired
      )
    )
  );

CREATE FUNCTION assessment.guard_submission_kind() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL
    AND NEW.submission_kind IS DISTINCT FROM OLD.submission_kind THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Accepted submission is immutable';
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION assessment.guard_submission_kind() FROM PUBLIC;

CREATE TRIGGER immutable_submission_kind
  BEFORE UPDATE ON assessment.attempts
  FOR EACH ROW
  EXECUTE FUNCTION assessment.guard_submission_kind();

GRANT UPDATE (submission_kind) ON assessment.attempts TO examination_runtime;

GRANT USAGE ON SCHEMA assessment, platform TO examination_expiry_worker;

GRANT SELECT ON assessment.attempts TO examination_expiry_worker;

GRANT UPDATE (
  status,
  submitted_at,
  submission_id,
  submission_event_id,
  expired,
  revision,
  submission_kind
) ON assessment.attempts TO examination_expiry_worker;

GRANT INSERT ON platform.outbox TO examination_expiry_worker;

-- 0004 checks completion at COMMIT by reading assessment.results. The expiry
-- role must not receive that table: scores are outside this sweep. The
-- predicate is unchanged. SECURITY DEFINER lets an EXPIRED attempt commit
-- without a result row, while COMPLETED without a result still fails closed.
CREATE OR REPLACE FUNCTION assessment.validate_completion() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  attempt_key uuid;
  attempt_status text;
  has_result boolean;
BEGIN
  IF TG_TABLE_NAME = 'attempts' THEN
    attempt_key := NEW.id;
  ELSE
    attempt_key := NEW.attempt_id;
  END IF;
  SELECT
    status
  INTO
    attempt_status
  FROM
    assessment.attempts
  WHERE
    id = attempt_key;
  SELECT
    EXISTS(
      SELECT
      FROM
        assessment.results
      WHERE
        attempt_id = attempt_key
    )
  INTO
    has_result;
  IF attempt_status = 'PROCESSING'
    OR (attempt_status = 'COMPLETED') <> has_result THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Completion and result must commit together';
  END IF;
  RETURN NULL;
END
$$;

REVOKE ALL ON FUNCTION assessment.validate_completion() FROM PUBLIC;
