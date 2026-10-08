-- Durable attempt revision required by the HTTP attempt contract.
-- No default: start inserts 1, and each committed save or first submit must increment it.
-- Existing rows, if any, receive 1 before the column becomes required.
-- Column UPDATE is granted alone. Table-level INSERT already covers the initial value.
-- 0004 keeps the other attempt columns restricted.

ALTER TABLE assessment.attempts
  ADD COLUMN revision integer;

UPDATE assessment.attempts
SET
  revision = 1
WHERE
  revision IS NULL;

ALTER TABLE assessment.attempts
  ALTER COLUMN revision SET NOT NULL;

ALTER TABLE assessment.attempts
  ADD CONSTRAINT attempts_revision_positive CHECK (revision >= 1);

GRANT UPDATE (revision) ON assessment.attempts TO examination_runtime;
