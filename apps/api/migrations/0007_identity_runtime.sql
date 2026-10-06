-- Expand only: existing accounts stay unverified; legacy opaque sessions remain unusable by JWT runtime.
ALTER TABLE identity.users ADD COLUMN email_verified_at timestamptz(3),
  ADD COLUMN credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version>0),
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision>0);
ALTER TABLE identity.sessions ADD COLUMN signing_kid text CHECK (length(signing_kid) BETWEEN 1 AND 64),
  ADD COLUMN access_jti uuid, ADD COLUMN refresh_jti uuid;
CREATE UNIQUE INDEX sessions_access_jti ON identity.sessions(access_jti) WHERE access_jti IS NOT NULL;
CREATE UNIQUE INDEX sessions_refresh_jti ON identity.sessions(refresh_jti) WHERE refresh_jti IS NOT NULL;
CREATE INDEX sessions_signing_kid ON identity.sessions(signing_kid,family_id) WHERE signing_kid IS NOT NULL;
CREATE TABLE identity.verification_challenges (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES identity.users(id),
  email text NOT NULL CHECK (length(email)<=254 AND email=lower(btrim(email))),
  purpose text NOT NULL DEFAULT 'VERIFY_EMAIL' CHECK (purpose='VERIFY_EMAIL'),
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash)=32),
  ciphertext text CHECK (octet_length(ciphertext)<=2048),
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz(3) NOT NULL,
  consumed_at timestamptz(3), cancelled_at timestamptz(3),
  CHECK (isfinite(expires_at)), CHECK (consumed_at IS NULL OR cancelled_at IS NULL)
);
CREATE INDEX verification_by_user ON identity.verification_challenges(user_id,created_at DESC);
CREATE INDEX verification_expiry ON identity.verification_challenges(expires_at);
CREATE TABLE identity.email_intents (
  id uuid PRIMARY KEY, challenge_id uuid NOT NULL REFERENCES identity.verification_challenges(id),
  created_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  available_at timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  lease_token uuid, lease_until timestamptz(3), delivered_at timestamptz(3),
  parked_at timestamptz(3), cancelled_at timestamptz(3), failure_code text CHECK (length(failure_code)<=80),
  CHECK ((lease_token IS NULL)=(lease_until IS NULL))
);
CREATE INDEX email_pending ON identity.email_intents(available_at,id) WHERE delivered_at IS NULL AND parked_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX email_by_challenge ON identity.email_intents(challenge_id,created_at DESC);
ALTER TABLE platform.audit_logs ADD COLUMN actor_type text NOT NULL DEFAULT 'USER' CHECK (actor_type IN ('USER','OPERATOR','SYSTEM')),
  ADD COLUMN operator_identity text CHECK (length(operator_identity) BETWEEN 1 AND 200),
  ADD COLUMN resource_type text NOT NULL DEFAULT 'UNSPECIFIED' CHECK (length(resource_type) BETWEEN 1 AND 80),
  ADD COLUMN reason text CHECK (length(reason) BETWEEN 1 AND 500),
  ADD COLUMN changed_fields jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(changed_fields)='array' AND octet_length(changed_fields::text)<=1000);
CREATE TABLE platform.request_limits (
  scope text NOT NULL CHECK (length(scope)<=80), subject_hash bytea NOT NULL CHECK (octet_length(subject_hash)=32),
  theoretical_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY(scope,subject_hash)
);
CREATE INDEX request_limits_expiry ON platform.request_limits(expires_at);
INSERT INTO identity.roles(id) VALUES ('CANDIDATE'),('ADMIN');
INSERT INTO identity.permissions(id) VALUES ('identity.self'),('catalog.read'),('assessment.take'),('assessment.result.read'),('leaderboard.read'),('catalog.manage'),('catalog.keys.read'),('catalog.import'),('reporting.read'),('assessment.review.admin'),('assessment.replay'),('audit.read'),('system.metrics.read');
INSERT INTO identity.role_permissions(role_id,permission_id)
SELECT 'CANDIDATE',id FROM identity.permissions WHERE id IN ('identity.self','catalog.read','assessment.take','assessment.result.read','leaderboard.read');
INSERT INTO identity.role_permissions(role_id,permission_id)
SELECT 'ADMIN',id FROM identity.permissions WHERE id NOT IN ('assessment.take','assessment.result.read');
REVOKE INSERT,UPDATE,DELETE ON identity.roles,identity.permissions,identity.role_permissions,identity.user_roles FROM examination_runtime;
GRANT SELECT,INSERT,UPDATE ON identity.verification_challenges,identity.email_intents TO examination_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON platform.request_limits TO examination_runtime;
CREATE FUNCTION identity.assign_candidate(target uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
  INSERT INTO identity.user_roles(user_id,role_id) SELECT id,'CANDIDATE' FROM identity.users WHERE id=target AND enabled AND email_verified_at IS NULL ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION identity.assign_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.assign_candidate(uuid) TO examination_runtime;
CREATE TABLE identity.operator_bootstrap (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), user_id uuid NOT NULL REFERENCES identity.users(id), granted_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE FUNCTION identity.operator_admin(target uuid, operator_name text, rationale text, correlation uuid, first_admin boolean, grant_admin boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF operator_name IS NULL OR rationale IS NULL OR first_admin IS NULL OR grant_admin IS NULL OR length(btrim(operator_name)) NOT BETWEEN 1 AND 200 OR length(btrim(rationale)) NOT BETWEEN 1 AND 500 OR correlation IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid operator request'; END IF;
  PERFORM pg_advisory_xact_lock(734219,2);
  PERFORM id FROM identity.users WHERE id=target AND enabled AND email_verified_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Verified account required'; END IF;
  IF first_admin THEN
    IF NOT grant_admin OR EXISTS(SELECT FROM identity.operator_bootstrap) THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Bootstrap already completed'; END IF;
    INSERT INTO identity.operator_bootstrap(singleton,user_id) VALUES(true,target);
  END IF;
  IF grant_admin THEN INSERT INTO identity.user_roles VALUES(target,'ADMIN') ON CONFLICT DO NOTHING;
  ELSE DELETE FROM identity.user_roles WHERE user_id=target AND role_id='ADMIN'; END IF;
  INSERT INTO platform.audit_logs(id,actor_type,operator_identity,action,resource_type,resource_id,reason,correlation_id,outcome,changed_fields)
  VALUES(gen_random_uuid(),'OPERATOR',session_user||':'||operator_name,CASE WHEN grant_admin THEN 'identity.admin.grant' ELSE 'identity.admin.revoke' END,'USER',target,rationale,correlation,'SUCCESS','["permissions"]');
END $$;
REVOKE ALL ON FUNCTION identity.operator_admin(uuid,text,text,uuid,boolean,boolean) FROM PUBLIC;
GRANT USAGE ON SCHEMA identity TO examination_operator;
GRANT EXECUTE ON FUNCTION identity.operator_admin(uuid,text,text,uuid,boolean,boolean) TO examination_operator;
