-- Bank questions own their points. Membership points stay on catalog.exam_questions.
-- Existing rows, if any, receive the minimum legal value so the column can be required.
ALTER TABLE catalog.questions
  ADD COLUMN points integer;

UPDATE catalog.questions
SET
  points = 1
WHERE
  points IS NULL;

ALTER TABLE catalog.questions
  ALTER COLUMN points SET NOT NULL;

ALTER TABLE catalog.questions
  ADD CONSTRAINT questions_points_range CHECK (points BETWEEN 1 AND 1000);
