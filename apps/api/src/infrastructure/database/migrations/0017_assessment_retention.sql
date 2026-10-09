-- Forward-only: enable jobs after API/source/DLQ images understand purged identities.
ALTER TABLE assessment.attempts
  ADD COLUMN purged_at timestamptz(3),
  ADD CONSTRAINT completed_retention_marker CHECK (
    purged_at IS NULL
    OR (
      status = 'COMPLETED'
      AND NOT replay_pending
      AND isfinite(purged_at)
      AND purged_at >= submitted_at + interval '365 days'
    )
  );
CREATE INDEX attempts_retention_due
  ON assessment.attempts(submitted_at, id)
  WHERE status = 'COMPLETED' AND purged_at IS NULL;
CREATE INDEX assessment_receipts_resource
  ON platform.idempotency_receipts(resource_id, accepted_at)
  WHERE operation IN (
    'assessment.attempt.start',
    'assessment.answer.save',
    'assessment.attempt.submit'
  );
GRANT SELECT (purged_at) ON assessment.attempts TO examination_grading_recovery;

-- Purged COMPLETED is a compact identity, never a result with fabricated scores.
CREATE OR REPLACE FUNCTION assessment.validate_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
DECLARE
  attempt_key uuid;
  attempt_status text;
  marker timestamptz;
  has_result boolean;
BEGIN
  IF TG_TABLE_NAME = 'attempts' THEN
    attempt_key := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    attempt_key := OLD.attempt_id;
  ELSE
    attempt_key := NEW.attempt_id;
  END IF;
  SELECT
    status,
    purged_at
  INTO attempt_status, marker
  FROM
    assessment.attempts
  WHERE
    id = attempt_key;
  SELECT EXISTS (
    SELECT 1
    FROM
      assessment.results
    WHERE
      attempt_id = attempt_key
  ) INTO has_result;
  IF attempt_status = 'PROCESSING'
    OR (marker IS NULL AND (attempt_status = 'COMPLETED') <> has_result)
    OR (marker IS NOT NULL AND (attempt_status <> 'COMPLETED' OR has_result)) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Completion and result must commit together';
  END IF;
  RETURN NULL;
END
$$;
REVOKE ALL ON FUNCTION assessment.validate_completion() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER durable_result_removal
  AFTER DELETE ON assessment.results DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assessment.validate_completion();

-- Private facts and fixed-policy guard. Callers cannot supply age/status/evidence.
CREATE FUNCTION assessment.retention_facts(target uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
  SELECT jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'submittedAt', extract(epoch FROM a.submitted_at) * 1000,
    'completedAt', CASE
      WHEN isfinite(r.completed_at) THEN extract(epoch FROM r.completed_at) * 1000
      ELSE NULL
    END,
    'serverNow', extract(epoch FROM clock_timestamp()) * 1000,
    'resultPresent', r.attempt_id IS NOT NULL,
    'purged', a.purged_at IS NOT NULL,
    'replayPending', a.replay_pending,
    'inboxPresent', EXISTS (
      SELECT 1
      FROM
        platform.inbox i
      WHERE
        i.consumer = 'assessment.grading.v1'
        AND i.event_id = a.submission_event_id
        AND i.attempt_id = a.id
    ),
    'outstandingDelivery', EXISTS (
      SELECT 1
      FROM
        platform.outbox o
      WHERE
        o.aggregate_id = a.id
        AND (
          o.delivered_at IS NULL
          OR o.parked_at IS NOT NULL
          OR o.lease_token IS NOT NULL
        )
    ),
    'unresolvedFailure', EXISTS (
      SELECT 1
      FROM
        platform.quarantined_jobs q
      WHERE
        q.attempt_id = a.id
        AND q.resolved_at IS NULL
    ),
    'recentReceipt', EXISTS (
      SELECT 1
      FROM
        platform.idempotency_receipts receipt
      WHERE
        receipt.resource_id = a.id
        AND receipt.actor_id = a.user_id
        AND receipt.operation IN (
          'assessment.attempt.start',
          'assessment.answer.save',
          'assessment.attempt.submit'
        )
        AND receipt.accepted_at > clock_timestamp() - interval '7 days'
    )
  )
  FROM
    assessment.attempts a
    LEFT JOIN assessment.results r ON r.attempt_id = a.id
  WHERE
    a.id = target
$$;
CREATE FUNCTION assessment.retention_allowed(facts jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
  SELECT coalesce(
    facts->>'status' = 'COMPLETED'
    AND NOT (facts->>'purged')::boolean
    AND NOT (facts->>'replayPending')::boolean
    AND (facts->>'resultPresent')::boolean
    AND (facts->>'inboxPresent')::boolean
    AND NOT (facts->>'outstandingDelivery')::boolean
    AND NOT (facts->>'unresolvedFailure')::boolean
    AND NOT (facts->>'recentReceipt')::boolean
    AND (facts->>'serverNow')::numeric - (facts->>'submittedAt')::numeric >= 31536000000
    AND (facts->>'serverNow')::numeric - (facts->>'completedAt')::numeric >= 604800000,
    false
  )
$$;
CREATE FUNCTION assessment.lock_retention_candidate() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
DECLARE
  target uuid;
  facts jsonb;
BEGIN
  -- Indexed coarse age range; protected rows filter before LIMIT, preventing starvation.
  SELECT
    a.id
  INTO target
  FROM
    assessment.attempts a
  WHERE
    a.status = 'COMPLETED'
    AND a.purged_at IS NULL
    AND a.submitted_at <= statement_timestamp() - interval '365 days'
    AND assessment.retention_allowed(assessment.retention_facts(a.id))
  ORDER BY
    a.submitted_at,
    a.id
  LIMIT 1
  FOR UPDATE OF a SKIP LOCKED;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  -- Fresh statement after locking, independent of the discovery snapshot.
  facts := assessment.retention_facts(target);
  IF NOT assessment.retention_allowed(facts) THEN
    RETURN NULL;
  END IF;
  RETURN facts;
END
$$;

CREATE FUNCTION assessment.prune_retention_receipts(batch integer, correlation uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
DECLARE
  removed_count integer;
BEGIN
  IF batch IS NULL OR batch NOT BETWEEN 1 AND 1000 OR correlation IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid maintenance request';
  END IF;
  WITH
    candidates AS MATERIALIZED (
      SELECT
        receipt.actor_id,
        receipt.key
      FROM
        platform.idempotency_receipts receipt
        JOIN assessment.attempts a
          ON a.id = receipt.resource_id AND a.user_id = receipt.actor_id
      WHERE
        receipt.operation IN (
          'assessment.attempt.start',
          'assessment.answer.save',
          'assessment.attempt.submit'
        )
        AND receipt.accepted_at <= statement_timestamp() - interval '7 days'
        AND a.status = 'COMPLETED'
        AND NOT a.replay_pending
        AND NOT EXISTS (
          SELECT 1
          FROM
            platform.quarantined_jobs q
          WHERE
            q.attempt_id = a.id
            AND q.resolved_at IS NULL
        )
        AND NOT EXISTS (
          SELECT 1
          FROM
            platform.outbox o
          WHERE
            o.aggregate_id = a.id
            AND (
              o.delivered_at IS NULL
              OR o.parked_at IS NOT NULL
              OR o.lease_token IS NOT NULL
            )
        )
      ORDER BY
        receipt.accepted_at,
        receipt.actor_id,
        receipt.key
      LIMIT batch
      FOR UPDATE OF receipt SKIP LOCKED
    ),
    removed AS (
      DELETE FROM platform.idempotency_receipts receipt
      USING candidates
      WHERE
        receipt.actor_id = candidates.actor_id
        AND receipt.key = candidates.key
        AND receipt.accepted_at <= clock_timestamp() - interval '7 days'
      RETURNING receipt.key
    )
  SELECT count(*)::int
  INTO removed_count
  FROM removed;
  IF removed_count > 0 THEN
    INSERT INTO platform.audit_logs (
      id,
      actor_type,
      action,
      resource_type,
      reason,
      correlation_id,
      outcome,
      changed_fields
    )
    VALUES (
      gen_random_uuid(),
      'SYSTEM',
      'assessment.receipts.prune',
      'RETENTION_BATCH',
      'Assessment receipts past minimum7days',
      correlation,
      'SUCCESS',
      '["receipts"]'
    );
  END IF;
  RETURN removed_count;
END
$$;

CREATE FUNCTION assessment.purge_retained_attempt(target uuid, correlation uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
DECLARE
  attempt assessment.attempts%ROWTYPE;
  expected integer;
  changed integer;
  answer_count integer;
  selection_count integer;
BEGIN
  IF target IS NULL OR correlation IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid maintenance request';
  END IF;
  SELECT *
  INTO attempt
  FROM assessment.attempts a
  WHERE a.id = target
  FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR NOT assessment.retention_allowed(assessment.retention_facts(target)) THEN
    RETURN jsonb_build_object('purged', false, 'answers', 0, 'selections', 0);
  END IF;
  SELECT question_count
  INTO expected
  FROM assessment.results
  WHERE attempt_id = target;
  IF expected <> (
    SELECT count(*)
    FROM assessment.result_questions
    WHERE attempt_id = target
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Retention projection unavailable';
  END IF;
  -- Grader lock order: all question counters, then option counters, then leaderboard.
  PERFORM 1
  FROM
    assessment.question_statistics stats
    JOIN assessment.result_questions detail
      ON detail.version_id = stats.version_id AND detail.question_id = stats.question_id
  WHERE
    detail.attempt_id = target
  ORDER BY stats.question_id
  FOR UPDATE OF stats;
  UPDATE assessment.question_statistics stats
  SET
    completed_count = stats.completed_count - 1,
    correct_count = stats.correct_count - detail.correct::int,
    incorrect_count = stats.incorrect_count - (detail.answered AND NOT detail.correct)::int,
    unanswered_count = stats.unanswered_count - (NOT detail.answered)::int
  FROM
    assessment.result_questions detail
  WHERE
    detail.attempt_id = target
    AND detail.version_id = stats.version_id
    AND detail.question_id = stats.question_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> expected THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Retention projection unavailable';
  END IF;
  SELECT count(*)
  INTO expected
  FROM assessment.answer_selections
  WHERE attempt_id = target;
  PERFORM 1
  FROM
    assessment.option_statistics stats
    JOIN assessment.answer_selections selection
      ON selection.version_id = stats.version_id
      AND selection.question_id = stats.question_id
      AND selection.option_id = stats.option_id
  WHERE
    selection.attempt_id = target
  ORDER BY
    stats.question_id,
    stats.option_id
  FOR UPDATE OF stats;
  UPDATE assessment.option_statistics stats
  SET selected_count = stats.selected_count - 1
  FROM
    assessment.answer_selections selection
  WHERE
    selection.attempt_id = target
    AND selection.version_id = stats.version_id
    AND selection.question_id = stats.question_id
    AND selection.option_id = stats.option_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> expected THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Retention projection unavailable';
  END IF;
  DELETE FROM assessment.leaderboard_entries
  WHERE attempt_id = target;
  INSERT INTO assessment.leaderboard_entries AS best (
    version_id,
    user_id,
    attempt_id,
    earned_points,
    submitted_at,
    completion_sequence
  )
  SELECT
    r.version_id,
    a.user_id,
    a.id,
    r.earned_points,
    a.submitted_at,
    r.completion_sequence
  FROM
    assessment.attempts a
    JOIN assessment.results r ON r.attempt_id = a.id
  WHERE
    a.user_id = attempt.user_id
    AND a.exam_id = attempt.exam_id
    AND a.version_id = attempt.version_id
    AND a.status = 'COMPLETED'
    AND a.purged_at IS NULL
    AND a.id <> target
  ORDER BY
    r.earned_points DESC,
    a.submitted_at,
    a.id
  LIMIT 1
  ON CONFLICT (version_id, user_id) DO UPDATE
  SET
    attempt_id = EXCLUDED.attempt_id,
    earned_points = EXCLUDED.earned_points,
    submitted_at = EXCLUDED.submitted_at,
    completion_sequence = EXCLUDED.completion_sequence;
  DELETE FROM assessment.answer_selections
  WHERE attempt_id = target;
  GET DIAGNOSTICS selection_count = ROW_COUNT;
  DELETE FROM assessment.answers
  WHERE attempt_id = target;
  GET DIAGNOSTICS answer_count = ROW_COUNT;
  DELETE FROM assessment.result_questions
  WHERE attempt_id = target;
  DELETE FROM assessment.result_sections
  WHERE attempt_id = target;
  DELETE FROM assessment.results
  WHERE attempt_id = target;
  UPDATE assessment.attempts
  SET purged_at = clock_timestamp()
  WHERE id = target;
  INSERT INTO platform.audit_logs (
    id,
    actor_type,
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
    'SYSTEM',
    'assessment.payload.purge',
    'ATTEMPT',
    target,
    'Completed retention365days and7day grace; compact identity preserved',
    correlation,
    'SUCCESS',
    '["answers","results","statistics","leaderboard","purgedAt"]'
  );
  RETURN jsonb_build_object(
    'purged', true,
    'answers', answer_count,
    'selections', selection_count
  );
END
$$;

REVOKE ALL ON FUNCTION assessment.retention_facts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION assessment.retention_allowed(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION assessment.lock_retention_candidate() FROM PUBLIC;
REVOKE ALL ON FUNCTION assessment.prune_retention_receipts(integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION assessment.purge_retained_attempt(uuid, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA assessment TO examination_assessment_maintenance;
GRANT EXECUTE ON FUNCTION
  assessment.lock_retention_candidate(),
  assessment.prune_retention_receipts(integer, uuid),
  assessment.purge_retained_attempt(uuid, uuid)
TO examination_assessment_maintenance;
