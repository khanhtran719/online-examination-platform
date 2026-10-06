CREATE SCHEMA identity;
CREATE SCHEMA catalog;
CREATE SCHEMA assessment;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY,
  email text UNIQUE CHECK (length(email) BETWEEN 3 AND 254 AND email=lower(btrim(email)) AND email !~ '[^\x00-\x7F]'),
  password_hash text,
  display_name text CHECK (length(display_name) BETWEEN 1 AND 80),
  enabled boolean NOT NULL DEFAULT true,
  leaderboard_opt_in boolean NOT NULL DEFAULT false,
  privacy_requested_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  CHECK ((email IS NULL) = (password_hash IS NULL)),
  CHECK (email IS NOT NULL OR (NOT enabled AND NOT leaderboard_opt_in AND display_name IS NULL)),
  CHECK (isfinite(created_at))
);
CREATE TABLE identity.roles (id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 80));
CREATE TABLE identity.permissions (id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 100));
CREATE TABLE identity.role_permissions (
  role_id text REFERENCES identity.roles(id), permission_id text REFERENCES identity.permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE identity.user_roles (
  user_id uuid REFERENCES identity.users(id), role_id text REFERENCES identity.roles(id),
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE identity.session_families (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES identity.users(id),
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  absolute_expires_at timestamptz(3) NOT NULL,
  revoked_at timestamptz(3), CHECK (absolute_expires_at > created_at AND isfinite(absolute_expires_at))
);
CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY, family_id uuid NOT NULL REFERENCES identity.session_families(id),
  access_hash bytea NOT NULL UNIQUE CHECK (octet_length(access_hash)=32),
  refresh_hash bytea NOT NULL UNIQUE CHECK (octet_length(refresh_hash)=32),
  access_expires_at timestamptz(3) NOT NULL, refresh_expires_at timestamptz(3) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), consumed_at timestamptz(3),
  CHECK (created_at < access_expires_at AND access_expires_at <= refresh_expires_at AND isfinite(refresh_expires_at))
);

CREATE TABLE catalog.exams (
  id uuid PRIMARY KEY, title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  category text NOT NULL CHECK (category IN ('TOEIC','IELTS','IT_CERTIFICATION','UNIVERSITY','RECRUITMENT','CORPORATE')),
  description text NOT NULL DEFAULT '' CHECK (length(description)<=8000),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 60 AND 14400),
  attempt_limit smallint NOT NULL CHECK (attempt_limit BETWEEN 1 AND 10),
  opens_at timestamptz(3) NOT NULL, closes_at timestamptz(3) NOT NULL,
  display_timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' CHECK (length(display_timezone) BETWEEN 1 AND 100),
  explanation_policy text NOT NULL DEFAULT 'NEVER' CHECK (explanation_policy IN ('NEVER','AFTER_COMPLETION','AFTER_EXAM_CLOSE')),
  leaderboard_enabled boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false, archived_at timestamptz(3), current_version_id uuid,
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  CHECK (opens_at<closes_at AND isfinite(opens_at) AND isfinite(closes_at)),
  CHECK (NOT published OR (current_version_id IS NOT NULL AND archived_at IS NULL))
);
CREATE TABLE catalog.questions (
  id uuid PRIMARY KEY, type text NOT NULL CHECK (type IN ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE')),
  prompt text NOT NULL CHECK (length(prompt) BETWEEN 1 AND 8000),
  explanation text NOT NULL DEFAULT '' CHECK (length(explanation)<=8000),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0), archived_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE catalog.question_options (
  question_id uuid REFERENCES catalog.questions(id), id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 2000), is_correct boolean NOT NULL,
  PRIMARY KEY (question_id,id), UNIQUE (question_id,position)
);
CREATE TABLE catalog.exam_sections (
  exam_id uuid REFERENCES catalog.exams(id), id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), position smallint NOT NULL CHECK (position BETWEEN 1 AND 20),
  PRIMARY KEY (exam_id,id), UNIQUE (exam_id,position)
);
CREATE TABLE catalog.exam_questions (
  exam_id uuid NOT NULL, section_id uuid NOT NULL, question_id uuid NOT NULL REFERENCES catalog.questions(id),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 500), points integer NOT NULL CHECK (points BETWEEN 1 AND 1000),
  PRIMARY KEY (exam_id,question_id), UNIQUE (exam_id,section_id,position),
  FOREIGN KEY (exam_id,section_id) REFERENCES catalog.exam_sections(exam_id,id)
);
CREATE TABLE catalog.published_versions (
  id uuid PRIMARY KEY, exam_id uuid NOT NULL REFERENCES catalog.exams(id),
  version integer NOT NULL CHECK (version>0), title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(description)<=8000),
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 60 AND 14400),
  attempt_limit smallint NOT NULL CHECK (attempt_limit BETWEEN 1 AND 10),
  opens_at timestamptz(3) NOT NULL, closes_at timestamptz(3) NOT NULL,
  display_timezone text NOT NULL,
  scoring_policy text NOT NULL DEFAULT 'EXACT_MATCH_V1' CHECK (scoring_policy='EXACT_MATCH_V1'),
  explanation_policy text NOT NULL CHECK (explanation_policy IN ('NEVER','AFTER_COMPLETION','AFTER_EXAM_CLOSE')),
  leaderboard_enabled boolean NOT NULL DEFAULT false,
  published_by uuid NOT NULL REFERENCES identity.users(id), published_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  publication_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
  UNIQUE (exam_id,version), UNIQUE (exam_id,id),
  CHECK (opens_at<closes_at AND isfinite(opens_at) AND isfinite(closes_at))
);
ALTER TABLE catalog.exams ADD FOREIGN KEY (id,current_version_id) REFERENCES catalog.published_versions(exam_id,id);
CREATE TABLE catalog.published_sections (
  version_id uuid REFERENCES catalog.published_versions(id), id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200), position smallint NOT NULL CHECK (position BETWEEN 1 AND 20),
  PRIMARY KEY (version_id,id), UNIQUE (version_id,position)
);
CREATE TABLE catalog.published_questions (
  version_id uuid NOT NULL, id uuid NOT NULL, section_id uuid NOT NULL,
  source_question_id uuid NOT NULL, source_revision integer NOT NULL CHECK (source_revision>0),
  type text NOT NULL CHECK (type IN ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE')),
  prompt text NOT NULL CHECK (length(prompt) BETWEEN 1 AND 8000), explanation text NOT NULL CHECK (length(explanation)<=8000),
  points integer NOT NULL CHECK (points BETWEEN 1 AND 1000), position smallint NOT NULL CHECK (position BETWEEN 1 AND 500),
  PRIMARY KEY (version_id,id), UNIQUE (version_id,source_question_id), UNIQUE (version_id,section_id,position),
  FOREIGN KEY (version_id,section_id) REFERENCES catalog.published_sections(version_id,id)
);
CREATE TABLE catalog.published_options (
  version_id uuid NOT NULL, question_id uuid NOT NULL, id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 10), text text NOT NULL CHECK (length(text) BETWEEN 1 AND 2000),
  PRIMARY KEY (version_id,question_id,id), UNIQUE (version_id,question_id,position),
  FOREIGN KEY (version_id,question_id) REFERENCES catalog.published_questions(version_id,id)
);
CREATE TABLE catalog.published_answer_keys (
  version_id uuid NOT NULL, question_id uuid NOT NULL, option_id uuid NOT NULL,
  PRIMARY KEY (version_id,question_id,option_id),
  FOREIGN KEY (version_id,question_id,option_id) REFERENCES catalog.published_options(version_id,question_id,id)
);

-- Snapshots can only be assembled in the transaction that creates the publication.
-- The INSERT trigger overwrites a supplied xid, so runtime cannot forge a mutable publication.
CREATE FUNCTION catalog.set_publication_xid() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.publication_xid := pg_current_xact_id(); RETURN NEW; END $$;
CREATE TRIGGER publication_xid BEFORE INSERT ON catalog.published_versions FOR EACH ROW EXECUTE FUNCTION catalog.set_publication_xid();
CREATE FUNCTION catalog.guard_snapshot_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM catalog.published_versions WHERE id=NEW.version_id AND publication_xid=pg_current_xact_id()) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Publication is sealed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sealed_sections BEFORE INSERT ON catalog.published_sections FOR EACH ROW EXECUTE FUNCTION catalog.guard_snapshot_insert();
CREATE TRIGGER sealed_questions BEFORE INSERT ON catalog.published_questions FOR EACH ROW EXECUTE FUNCTION catalog.guard_snapshot_insert();
CREATE TRIGGER sealed_options BEFORE INSERT ON catalog.published_options FOR EACH ROW EXECUTE FUNCTION catalog.guard_snapshot_insert();
CREATE TRIGGER sealed_keys BEFORE INSERT ON catalog.published_answer_keys FOR EACH ROW EXECUTE FUNCTION catalog.guard_snapshot_insert();
CREATE FUNCTION catalog.validate_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE section_count integer; question_count integer;
BEGIN
  SELECT count(*) INTO section_count FROM catalog.published_sections WHERE version_id=NEW.id;
  SELECT count(*) INTO question_count FROM catalog.published_questions WHERE version_id=NEW.id;
  IF section_count NOT BETWEEN 1 AND 20 OR question_count NOT BETWEEN 1 AND 500
    OR EXISTS (SELECT FROM catalog.published_sections s WHERE s.version_id=NEW.id AND NOT EXISTS (SELECT FROM catalog.published_questions q WHERE q.version_id=s.version_id AND q.section_id=s.id))
    OR EXISTS (
      SELECT FROM catalog.published_questions q
      LEFT JOIN LATERAL (SELECT count(*) AS n FROM catalog.published_options o WHERE o.version_id=q.version_id AND o.question_id=q.id) o ON true
      LEFT JOIN LATERAL (SELECT count(*) AS n FROM catalog.published_answer_keys k WHERE k.version_id=q.version_id AND k.question_id=q.id) k ON true
      WHERE q.version_id=NEW.id AND (o.n NOT BETWEEN 2 AND 10 OR k.n<1 OR
        (q.type IN ('SINGLE_CHOICE','TRUE_FALSE') AND k.n<>1) OR (q.type='TRUE_FALSE' AND o.n<>2))) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Invalid publication';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER complete_publication AFTER INSERT ON catalog.published_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION catalog.validate_publication();

CREATE TABLE assessment.attempts (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES identity.users(id), exam_id uuid NOT NULL,
  version_id uuid NOT NULL, status text NOT NULL CHECK (status IN ('CREATED','IN_PROGRESS','SUBMITTED','PROCESSING','COMPLETED','EXPIRED','FAILED')),
  started_at timestamptz(3) NOT NULL, deadline timestamptz(3) NOT NULL, submitted_at timestamptz(3),
  submission_id uuid UNIQUE, submission_event_id uuid UNIQUE, expired boolean NOT NULL DEFAULT false,
  replay_pending boolean NOT NULL DEFAULT false, failure_code text CHECK (length(failure_code)<=80),
  UNIQUE (id,version_id), UNIQUE (id,version_id,user_id),
  FOREIGN KEY (exam_id,version_id) REFERENCES catalog.published_versions(exam_id,id),
  CHECK (isfinite(started_at) AND isfinite(deadline) AND started_at<deadline),
  CHECK ((status IN ('CREATED','IN_PROGRESS') AND submitted_at IS NULL AND submission_id IS NULL AND submission_event_id IS NULL AND NOT expired AND NOT replay_pending) OR
    (status NOT IN ('CREATED','IN_PROGRESS') AND submitted_at IS NOT NULL AND submission_id IS NOT NULL AND submission_event_id IS NOT NULL AND submitted_at>=started_at AND isfinite(submitted_at))),
  CHECK (submitted_at IS NULL OR (expired=(submitted_at>=deadline))),
  CHECK (status<>'SUBMITTED' OR NOT expired), CHECK (status<>'EXPIRED' OR expired),
  CHECK (NOT replay_pending OR status='FAILED'), CHECK (status='FAILED' OR failure_code IS NULL)
);
CREATE TABLE assessment.answers (
  attempt_id uuid NOT NULL, version_id uuid NOT NULL, question_id uuid NOT NULL,
  version integer NOT NULL CHECK (version>0), marked boolean NOT NULL DEFAULT false,
  updated_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (attempt_id,question_id), UNIQUE (attempt_id,version_id,question_id),
  FOREIGN KEY (attempt_id,version_id) REFERENCES assessment.attempts(id,version_id),
  FOREIGN KEY (version_id,question_id) REFERENCES catalog.published_questions(version_id,id)
);
CREATE TABLE assessment.answer_selections (
  attempt_id uuid NOT NULL, version_id uuid NOT NULL, question_id uuid NOT NULL, option_id uuid NOT NULL,
  PRIMARY KEY (attempt_id,question_id,option_id),
  FOREIGN KEY (attempt_id,version_id,question_id) REFERENCES assessment.answers(attempt_id,version_id,question_id),
  FOREIGN KEY (version_id,question_id,option_id) REFERENCES catalog.published_options(version_id,question_id,id)
);
CREATE TABLE assessment.results (
  attempt_id uuid PRIMARY KEY, version_id uuid NOT NULL, user_id uuid NOT NULL,
  earned_points integer NOT NULL CHECK (earned_points>=0), possible_points integer NOT NULL CHECK (possible_points BETWEEN 1 AND 500000),
  percentage_basis_points integer GENERATED ALWAYS AS (earned_points*10000::bigint/possible_points) STORED,
  correct_count smallint NOT NULL CHECK (correct_count>=0), question_count smallint NOT NULL CHECK (question_count BETWEEN 1 AND 500),
  completed_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), completion_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  UNIQUE (attempt_id,version_id), UNIQUE (attempt_id,version_id,user_id),
  FOREIGN KEY (attempt_id,version_id,user_id) REFERENCES assessment.attempts(id,version_id,user_id),
  CHECK (earned_points<=possible_points AND correct_count<=question_count)
);
CREATE TABLE assessment.result_sections (
  attempt_id uuid NOT NULL, version_id uuid NOT NULL, section_id uuid NOT NULL,
  earned_points integer NOT NULL CHECK (earned_points>=0), possible_points integer NOT NULL CHECK (possible_points>0),
  PRIMARY KEY (attempt_id,section_id), CHECK (earned_points<=possible_points),
  FOREIGN KEY (attempt_id,version_id) REFERENCES assessment.results(attempt_id,version_id),
  FOREIGN KEY (version_id,section_id) REFERENCES catalog.published_sections(version_id,id)
);
CREATE TABLE assessment.result_questions (
  attempt_id uuid NOT NULL, version_id uuid NOT NULL, question_id uuid NOT NULL,
  earned_points integer NOT NULL CHECK (earned_points BETWEEN 0 AND 1000), correct boolean NOT NULL, answered boolean NOT NULL,
  PRIMARY KEY (attempt_id,question_id),
  FOREIGN KEY (attempt_id,version_id) REFERENCES assessment.results(attempt_id,version_id),
  FOREIGN KEY (version_id,question_id) REFERENCES catalog.published_questions(version_id,id),
  CHECK (NOT correct OR answered)
);
CREATE TABLE assessment.leaderboard_entries (
  version_id uuid NOT NULL, user_id uuid NOT NULL, attempt_id uuid NOT NULL,
  earned_points integer NOT NULL CHECK (earned_points BETWEEN 0 AND 500000), submitted_at timestamptz(3) NOT NULL,
  completion_sequence bigint NOT NULL,
  PRIMARY KEY (version_id,user_id),
  FOREIGN KEY (attempt_id,version_id,user_id) REFERENCES assessment.results(attempt_id,version_id,user_id)
);
CREATE TABLE assessment.question_statistics (
  version_id uuid NOT NULL, question_id uuid NOT NULL,
  completed_count bigint NOT NULL DEFAULT 0, correct_count bigint NOT NULL DEFAULT 0,
  incorrect_count bigint NOT NULL DEFAULT 0, unanswered_count bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (version_id,question_id),
  FOREIGN KEY (version_id,question_id) REFERENCES catalog.published_questions(version_id,id),
  CHECK (correct_count>=0 AND incorrect_count>=0 AND unanswered_count>=0 AND completed_count=correct_count+incorrect_count+unanswered_count)
);
CREATE TABLE assessment.option_statistics (
  version_id uuid NOT NULL, question_id uuid NOT NULL, option_id uuid NOT NULL, selected_count bigint NOT NULL DEFAULT 0 CHECK (selected_count>=0),
  PRIMARY KEY (version_id,question_id,option_id),
  FOREIGN KEY (version_id,question_id,option_id) REFERENCES catalog.published_options(version_id,question_id,id)
);

CREATE TABLE platform.idempotency_receipts (
  actor_id uuid NOT NULL REFERENCES identity.users(id), key uuid NOT NULL,
  fingerprint bytea NOT NULL CHECK (octet_length(fingerprint)=32), operation text NOT NULL CHECK (length(operation) BETWEEN 1 AND 100),
  resource_id uuid, http_status smallint NOT NULL CHECK (http_status BETWEEN 200 AND 299), response jsonb NOT NULL,
  accepted_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor_id,key), CHECK (jsonb_typeof(response)='object' AND octet_length(response::text)<=16384)
);
CREATE TABLE platform.outbox (
  event_id uuid PRIMARY KEY, aggregate_id uuid NOT NULL REFERENCES assessment.attempts(id),
  type text NOT NULL CHECK (type='attempt.submitted.v1'), payload jsonb NOT NULL,
  correlation_id uuid NOT NULL, causation_id uuid,
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), available_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0), lease_token uuid, lease_until timestamptz(3),
  delivered_at timestamptz(3), parked_at timestamptz(3), failure_code text CHECK (length(failure_code)<=80),
  CHECK (jsonb_typeof(payload)='object' AND octet_length(payload::text)<=16384),
  CHECK ((lease_token IS NULL)=(lease_until IS NULL)), CHECK (delivered_at IS NULL OR parked_at IS NULL)
);
CREATE TABLE platform.inbox (
  consumer text NOT NULL CHECK (length(consumer) BETWEEN 1 AND 100), event_id uuid NOT NULL,
  attempt_id uuid NOT NULL REFERENCES assessment.attempts(id), completed_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (consumer,event_id)
);
CREATE TABLE platform.quarantined_jobs (
  event_id uuid PRIMARY KEY, attempt_id uuid NOT NULL REFERENCES assessment.attempts(id),
  failure_code text NOT NULL CHECK (length(failure_code) BETWEEN 1 AND 80),
  received_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), resolved_at timestamptz(3)
);
CREATE TABLE platform.audit_logs (
  id uuid PRIMARY KEY, actor_id uuid REFERENCES identity.users(id), action text NOT NULL CHECK (length(action) BETWEEN 1 AND 100),
  resource_id uuid, correlation_id uuid NOT NULL, occurred_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILURE'))
);
CREATE TABLE platform.rate_limit_buckets (
  scope text NOT NULL CHECK (length(scope) BETWEEN 1 AND 80), subject_hash bytea NOT NULL CHECK (octet_length(subject_hash)=32),
  window_start timestamptz(3) NOT NULL, expires_at timestamptz(3) NOT NULL,
  count integer NOT NULL CHECK (count>0), PRIMARY KEY (scope,subject_hash,window_start), CHECK (expires_at>window_start)
);
CREATE TABLE platform.import_reports (
  id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES identity.users(id), dry_run boolean NOT NULL,
  valid boolean NOT NULL, committed boolean NOT NULL, report jsonb NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  CHECK (NOT committed OR (valid AND NOT dry_run)), CHECK (jsonb_typeof(report)='object' AND octet_length(report::text)<=262144)
);
