-- Initial pre-production bundle only: adding NOT NULL fails closed if an older
-- incomplete schema has publications. Never infer historical category from a later draft.
ALTER TABLE catalog.published_versions ADD COLUMN category text NOT NULL
  CHECK (category IN ('TOEIC','IELTS','IT_CERTIFICATION','UNIVERSITY','RECRUITMENT','CORPORATE'));
CREATE OR REPLACE FUNCTION catalog.set_publication_xid() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.publication_xid := pg_current_xact_id();
  IF NEW.category IS NULL THEN SELECT category INTO NEW.category FROM catalog.exams WHERE id=NEW.exam_id; END IF;
  RETURN NEW;
END $$;
-- Candidate category comes from the frozen version, never from the mutable draft.
-- Browse uses the logical-exam cursor index and PK join to the current version.
-- A publication-category index is a future measured candidate, not provisioned speculatively.
DROP INDEX catalog.exams_browse;
