-- Fixed online retention; caller cannot supply a cutoff or arbitrary target IDs.
CREATE FUNCTION platform.prune_audit(batch_size integer, correlation uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
SET TimeZone = UTC
AS $$
DECLARE
  cutoff timestamptz;
  removed integer;
BEGIN
  IF batch_size IS NULL
    OR batch_size < 1
    OR batch_size > 1000
    OR correlation IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid audit retention request';
  END IF;
  cutoff := date_trunc('milliseconds', statement_timestamp()) - interval '365 days';
  WITH due AS MATERIALIZED (
    SELECT
      id
    FROM
      platform.audit_logs
    WHERE
      isfinite(occurred_at)
      AND occurred_at < cutoff
    ORDER BY
      occurred_at,
      id
    LIMIT
      batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM platform.audit_logs a
  USING due
  WHERE
    a.id = due.id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  IF removed > 0 THEN
    INSERT INTO platform.audit_logs (
      id,
      actor_type,
      operator_identity,
      action,
      resource_type,
      resource_id,
      correlation_id,
      outcome,
      reason,
      changed_fields
    )
    VALUES (
      gen_random_uuid(),
      'SYSTEM',
      session_user,
      'platform.audit.prune',
      'AUDIT_LOG',
      '00000000-0000-4000-8000-000000000000',
      correlation,
      'SUCCESS',
      format('365-day audit retention; removed=%s; cutoff=%s', removed, cutoff),
      '["purgedRows"]'
    );
  END IF;
  RETURN removed;
END
$$;
REVOKE ALL ON FUNCTION platform.prune_audit(integer, uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA platform TO examination_audit_maintenance;
GRANT EXECUTE ON FUNCTION platform.prune_audit(integer, uuid)
  TO examination_audit_maintenance;
