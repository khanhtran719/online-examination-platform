-- Bootstrap examination_dispatch_worker via infra/database/roles.sql first.
-- Existing event content and original age are immutable to worker/API roles.
ALTER TABLE platform.outbox
  ADD COLUMN replay_at timestamptz(3);

REVOKE UPDATE (
  available_at,
  attempts,
  lease_token,
  lease_until,
  delivered_at,
  parked_at,
  failure_code
) ON platform.outbox FROM examination_runtime;

GRANT USAGE ON SCHEMA platform TO examination_dispatch_worker;
GRANT SELECT ON platform.outbox TO examination_dispatch_worker;
GRANT UPDATE (
  available_at,
  attempts,
  lease_token,
  lease_until,
  delivered_at,
  parked_at,
  failure_code
) ON platform.outbox TO examination_dispatch_worker;

-- Dedicated operator login is the authority, never a candidate HTTP identity.
-- The operation owns one atomic delivery-replay + audit transaction. It cannot
-- replay delivered/live rows or edit identity/body/business result state.
CREATE FUNCTION platform.operator_replay_submission(
  target uuid,
  operator_name text,
  rationale text,
  correlation uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF target IS NULL
    OR correlation IS NULL
    OR operator_name IS NULL
    OR rationale IS NULL
    OR length(btrim(operator_name)) < 1
    OR length(session_user || ':' || operator_name) > 200
    OR length(btrim(rationale)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid operator request';
  END IF;

  UPDATE platform.outbox
  SET
    parked_at = NULL,
    attempts = 0,
    available_at = clock_timestamp(),
    replay_at = clock_timestamp(),
    lease_token = NULL,
    lease_until = NULL,
    failure_code = NULL
  WHERE
    event_id = target
    AND parked_at IS NOT NULL
    AND delivered_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Parked event required';
  END IF;

  INSERT INTO platform.audit_logs (
    id,
    actor_type,
    operator_identity,
    action,
    resource_type,
    resource_id,
    reason,
    correlation_id,
    outcome,
    changed_fields
  )
  VALUES (
    gen_random_uuid(),
    'OPERATOR',
    session_user || ':' || operator_name,
    'assessment.outbox.replay',
    'SUBMISSION_EVENT',
    target,
    rationale,
    correlation,
    'SUCCESS',
    '["parkedAt","attempts","availableAt","replayAt"]'::jsonb
  );
END
$$;

REVOKE ALL ON FUNCTION platform.operator_replay_submission(uuid, text, text, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA platform TO examination_operator;
GRANT EXECUTE ON FUNCTION platform.operator_replay_submission(uuid, text, text, uuid)
  TO examination_operator;
