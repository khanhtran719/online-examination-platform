-- Digest-only poison evidence has no FK to an untrusted claimed attempt.
CREATE TABLE platform.invalid_submission_messages (
  body_digest text PRIMARY KEY CHECK (body_digest ~ '^[0-9a-f]{64}$'),
  failure_code text NOT NULL CHECK (failure_code IN ('INVALID_SCHEMA', 'SUBMISSION_MISMATCH')),
  received_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);

GRANT USAGE ON SCHEMA assessment, catalog, platform TO examination_grading_worker;
GRANT SELECT ON assessment.attempts, assessment.answers, assessment.answer_selections,
  assessment.results, platform.inbox TO examination_grading_worker;
GRANT UPDATE (status, replay_pending, failure_code, revision) ON assessment.attempts
  TO examination_grading_worker;
GRANT SELECT ON catalog.published_versions, catalog.published_sections,
  catalog.published_questions, catalog.published_options, catalog.published_answer_keys
  TO examination_grading_worker;
GRANT INSERT ON assessment.results, assessment.result_sections, assessment.result_questions,
  platform.inbox, platform.invalid_submission_messages TO examination_grading_worker;
GRANT SELECT (body_digest) ON platform.invalid_submission_messages TO examination_grading_worker;
GRANT USAGE ON SEQUENCE assessment.results_completion_sequence_seq TO examination_grading_worker;
GRANT SELECT, INSERT ON assessment.leaderboard_entries,
  assessment.question_statistics, assessment.option_statistics TO examination_grading_worker;
GRANT UPDATE (attempt_id, earned_points, submitted_at, completion_sequence)
  ON assessment.leaderboard_entries TO examination_grading_worker;
GRANT UPDATE (completed_count, correct_count, incorrect_count, unanswered_count)
  ON assessment.question_statistics TO examination_grading_worker;
GRANT UPDATE (selected_count) ON assessment.option_statistics TO examination_grading_worker;
