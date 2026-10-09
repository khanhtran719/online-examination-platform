-- Recovery authority is separate from grading/key access. Bootstrap roles first.
ALTER TABLE assessment.attempts
  ADD COLUMN grading_generation integer NOT NULL DEFAULT 0
    CHECK (grading_generation BETWEEN 0 AND 1000);
ALTER TABLE platform.outbox
  ADD COLUMN grading_generation integer NOT NULL DEFAULT 0
    CHECK (grading_generation BETWEEN 0 AND 1000);
ALTER TABLE platform.quarantined_jobs
  ADD COLUMN generation integer NOT NULL DEFAULT 0 CHECK (generation BETWEEN 0 AND 1000),
  ADD COLUMN payload jsonb CHECK (
    payload IS NULL OR (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 16384)
  ),
  ADD COLUMN body_digest text CHECK (body_digest IS NULL OR body_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE platform.quarantined_jobs
  DROP CONSTRAINT quarantined_jobs_pkey,
  ADD PRIMARY KEY (event_id, generation);

-- API cannot fabricate/resolve worker failure evidence; replay is an operator capability.
REVOKE INSERT, UPDATE ON platform.quarantined_jobs FROM examination_runtime;
GRANT INSERT, SELECT ON platform.quarantined_jobs TO examination_grading_worker;
GRANT UPDATE (resolved_at) ON platform.quarantined_jobs TO examination_grading_worker;
GRANT INSERT ON platform.audit_logs TO examination_grading_worker;
GRANT USAGE ON SCHEMA assessment, platform TO examination_grading_recovery;
GRANT SELECT (
  id, exam_id, version_id, user_id, status, started_at, deadline, submitted_at,
  submission_id, submission_event_id, submission_kind, expired, replay_pending, grading_generation, revision
) ON assessment.attempts TO examination_grading_recovery;
GRANT UPDATE (status, replay_pending, failure_code, revision)
  ON assessment.attempts TO examination_grading_recovery;
GRANT SELECT (attempt_id) ON assessment.results TO examination_grading_recovery;
GRANT SELECT (event_id, attempt_id, generation) ON platform.quarantined_jobs
  TO examination_grading_recovery;
GRANT INSERT ON platform.quarantined_jobs, platform.audit_logs,
  platform.invalid_submission_messages TO examination_grading_recovery;
GRANT SELECT (body_digest) ON platform.invalid_submission_messages TO examination_grading_recovery;

CREATE FUNCTION assessment.operator_replay_grading(
  target uuid, expected_revision integer, operator_name text, rationale text, correlation uuid
) RETURNS TABLE (revision integer, generation integer, replay_pending boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  attempt assessment.attempts%ROWTYPE;
  failure platform.quarantined_jobs%ROWTYPE;
BEGIN
  IF target IS NULL OR expected_revision IS NULL OR expected_revision < 1
    OR correlation IS NULL OR operator_name IS NULL OR rationale IS NULL
    OR length(btrim(operator_name)) < 1 OR length(session_user || ':' || operator_name) > 200
    OR length(btrim(rationale)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid operator request';
  END IF;
  SELECT
    *
  INTO attempt
  FROM
    assessment.attempts
  WHERE
    id = target
  FOR UPDATE;
  IF NOT FOUND OR attempt.status <> 'FAILED' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Failed attempt required';
  END IF;
  IF attempt.replay_pending AND expected_revision IN (attempt.revision, attempt.revision - 1) THEN
    RETURN QUERY SELECT attempt.revision, attempt.grading_generation, true;
    RETURN;
  END IF;
  IF attempt.replay_pending OR attempt.revision <> expected_revision
    OR attempt.grading_generation >= 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Replay revision conflict';
  END IF;
  SELECT
    *
  INTO failure
  FROM
    platform.quarantined_jobs q
  WHERE q.event_id = attempt.submission_event_id
    AND q.generation = attempt.grading_generation
    AND q.attempt_id = target
    AND q.resolved_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR failure.payload IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Recovery evidence required';
  END IF;
  -- Only a validated frozen submission envelope is replayable, never arbitrary operator JSON.
  IF (failure.payload->>'eventId')::uuid IS DISTINCT FROM attempt.submission_event_id
    OR (failure.payload->>'aggregateId')::uuid IS DISTINCT FROM target
    OR failure.payload->>'eventType' IS DISTINCT FROM 'attempt.submitted.v1'
    OR failure.payload->>'source' IS DISTINCT FROM 'online-examination-platform.assessment'
    OR (failure.payload->>'version')::integer IS DISTINCT FROM 1
    OR (failure.payload->>'occurredAt')::timestamptz IS DISTINCT FROM attempt.submitted_at
    OR (failure.payload#>>'{payload,attemptId}')::uuid IS DISTINCT FROM target
    OR (failure.payload#>>'{payload,examId}')::uuid IS DISTINCT FROM attempt.exam_id
    OR (failure.payload#>>'{payload,publishedVersionId}')::uuid IS DISTINCT FROM attempt.version_id
    OR (failure.payload#>>'{payload,submissionId}')::uuid IS DISTINCT FROM attempt.submission_id
    OR (failure.payload#>>'{payload,deadline}')::timestamptz IS DISTINCT FROM attempt.deadline
    OR (failure.payload#>>'{payload,expired}')::boolean IS DISTINCT FROM attempt.expired
    OR failure.payload#>>'{payload,submissionKind}' IS DISTINCT FROM attempt.submission_kind THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Recovery identity conflict';
  END IF;
  INSERT INTO platform.outbox AS existing (
    event_id,
    aggregate_id,
    type,
    payload,
    correlation_id,
    causation_id,
    created_at,
    replay_at,
    grading_generation
  )
  VALUES (
    attempt.submission_event_id, target, 'attempt.submitted.v1', failure.payload,
    (failure.payload->>'correlationId')::uuid, (failure.payload->>'causationId')::uuid,
    attempt.submitted_at, clock_timestamp(), attempt.grading_generation + 1
  )
  ON CONFLICT (event_id) DO UPDATE
  SET
    grading_generation = EXCLUDED.grading_generation,
    replay_at = clock_timestamp(),
    available_at = clock_timestamp(),
    attempts = 0,
    delivered_at = NULL,
    parked_at = NULL,
    failure_code = NULL,
    lease_token = NULL,
    lease_until = NULL
  WHERE
    existing.aggregate_id = target
    AND existing.payload = failure.payload;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Outbox identity conflict';
  END IF;
  UPDATE assessment.attempts
  SET
    replay_pending = true,
    grading_generation = grading_generation + 1,
    revision = assessment.attempts.revision + 1
  WHERE id = target;
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
    gen_random_uuid(), 'OPERATOR', session_user || ':' || operator_name,
    'assessment.grading.replay', 'ATTEMPT', target, rationale, correlation, 'SUCCESS',
    '["replayPending","gradingGeneration","revision","outbox"]'::jsonb
  );
  RETURN QUERY SELECT attempt.revision + 1, attempt.grading_generation + 1, true;
END
$$;
REVOKE ALL ON FUNCTION assessment.operator_replay_grading(uuid, integer, text, text, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA assessment TO examination_operator;
GRANT EXECUTE ON FUNCTION assessment.operator_replay_grading(uuid, integer, text, text, uuid)
  TO examination_operator;
