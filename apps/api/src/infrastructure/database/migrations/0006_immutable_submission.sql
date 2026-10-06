CREATE FUNCTION assessment.guard_submission_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL AND
    (NEW.submitted_at IS DISTINCT FROM OLD.submitted_at OR
     NEW.submission_id IS DISTINCT FROM OLD.submission_id OR
     NEW.submission_event_id IS DISTINCT FROM OLD.submission_event_id OR
     NEW.expired IS DISTINCT FROM OLD.expired) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Accepted submission is immutable';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION assessment.guard_submission_identity() FROM PUBLIC;
CREATE TRIGGER immutable_submission BEFORE UPDATE ON assessment.attempts FOR EACH ROW EXECUTE FUNCTION assessment.guard_submission_identity();
