-- Enforce stable ownership/identity with column privileges; update only mutable state.
REVOKE UPDATE ON assessment.attempts,assessment.answers,assessment.answer_selections,platform.outbox FROM examination_runtime;
GRANT UPDATE (status,submitted_at,submission_id,submission_event_id,expired,replay_pending,failure_code) ON assessment.attempts TO examination_runtime;
GRANT UPDATE (version,marked,updated_at) ON assessment.answers TO examination_runtime;
GRANT UPDATE (available_at,attempts,lease_token,lease_until,delivered_at,parked_at,failure_code) ON platform.outbox TO examination_runtime;

-- PROCESSING is transaction-local in v1. Completion and its result must be durable together.
CREATE FUNCTION assessment.validate_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt_key uuid; attempt_status text; has_result boolean;
BEGIN
  IF TG_TABLE_NAME='attempts' THEN attempt_key:=NEW.id; ELSE attempt_key:=NEW.attempt_id; END IF;
  SELECT status INTO attempt_status FROM assessment.attempts WHERE id=attempt_key;
  SELECT EXISTS(SELECT FROM assessment.results WHERE attempt_id=attempt_key) INTO has_result;
  IF attempt_status='PROCESSING' OR (attempt_status='COMPLETED')<>has_result THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Completion and result must commit together';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION assessment.validate_completion() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER durable_attempt_completion AFTER INSERT OR UPDATE ON assessment.attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment.validate_completion();
CREATE CONSTRAINT TRIGGER durable_result_completion AFTER INSERT ON assessment.results DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assessment.validate_completion();
