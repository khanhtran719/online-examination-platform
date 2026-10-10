-- Destructive best-entry movement can repeat a previously seen candidate in keyset paging.
-- Assessment owns this compact invalidation metadata; Reporting only reads it.
CREATE TABLE assessment.leaderboard_epochs (
  version_id uuid PRIMARY KEY REFERENCES catalog.published_versions(id),
  epoch bigint NOT NULL CHECK (epoch > 0)
);
GRANT SELECT ON assessment.leaderboard_epochs TO examination_runtime;
-- A best row belongs permanently to one candidate/version; UPSERT changes only its winner.
REVOKE UPDATE ON assessment.leaderboard_entries FROM examination_runtime;
GRANT UPDATE (attempt_id, earned_points, submitted_at, completion_sequence)
  ON assessment.leaderboard_entries TO examination_runtime;

CREATE FUNCTION assessment.invalidate_leaderboard_cursor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO
    assessment.leaderboard_epochs AS current (version_id, epoch)
  VALUES
    (OLD.version_id, 1)
  ON CONFLICT (version_id) DO UPDATE
  SET
    epoch = current.epoch + 1;
  RETURN NULL;
END
$$;
REVOKE ALL ON FUNCTION assessment.invalidate_leaderboard_cursor() FROM PUBLIC;

CREATE TRIGGER leaderboard_cursor_removal
  AFTER DELETE ON assessment.leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION assessment.invalidate_leaderboard_cursor();
-- The normal grading INSERT / improving UPSERT never executes this function.
CREATE TRIGGER leaderboard_cursor_downgrade
  AFTER UPDATE ON assessment.leaderboard_entries
  FOR EACH ROW WHEN (
    NEW.earned_points < OLD.earned_points
    OR (
      NEW.earned_points = OLD.earned_points
      AND (NEW.submitted_at, NEW.attempt_id) > (OLD.submitted_at, OLD.attempt_id)
    )
  ) EXECUTE FUNCTION assessment.invalidate_leaderboard_cursor();
