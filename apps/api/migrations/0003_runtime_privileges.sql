REVOKE ALL ON SCHEMA identity,catalog,assessment,platform FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA identity,catalog,assessment,platform FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA catalog FROM PUBLIC;
GRANT USAGE ON SCHEMA identity,catalog,assessment,platform TO examination_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON identity.users,identity.roles,identity.permissions,identity.role_permissions,
  identity.user_roles,identity.session_families,identity.sessions TO examination_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON catalog.exams,catalog.questions,catalog.question_options,catalog.exam_sections,catalog.exam_questions TO examination_runtime;
GRANT SELECT,INSERT ON catalog.published_versions,catalog.published_sections,catalog.published_questions,
  catalog.published_options,catalog.published_answer_keys TO examination_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA catalog TO examination_runtime;
GRANT SELECT,INSERT,UPDATE ON assessment.attempts TO examination_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON assessment.answers,assessment.answer_selections,
  assessment.leaderboard_entries,assessment.question_statistics,assessment.option_statistics TO examination_runtime;
GRANT SELECT,INSERT ON assessment.results,assessment.result_sections,assessment.result_questions TO examination_runtime;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA assessment TO examination_runtime;
GRANT SELECT,INSERT ON platform.idempotency_receipts,platform.inbox,platform.audit_logs,platform.import_reports TO examination_runtime;
GRANT SELECT,INSERT,UPDATE ON platform.outbox,platform.quarantined_jobs TO examination_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON platform.rate_limit_buckets TO examination_runtime;
-- No grant on schema_migrations; no default blanket grants to future tables.
-- Retention/purge is a separate audited operator capability, not runtime DDL.
