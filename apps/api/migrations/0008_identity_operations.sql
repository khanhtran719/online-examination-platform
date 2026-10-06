-- Mail worker gets only the columns and mechanisms it uses, never password or JWT sessions.
GRANT USAGE ON SCHEMA identity,platform TO examination_mail_worker;
GRANT SELECT(id,email,enabled,email_verified_at) ON identity.users TO examination_mail_worker;
GRANT SELECT ON identity.verification_challenges TO examination_mail_worker;
GRANT UPDATE(ciphertext) ON identity.verification_challenges TO examination_mail_worker;
GRANT SELECT,UPDATE ON identity.email_intents TO examination_mail_worker;
GRANT SELECT,DELETE ON platform.request_limits,platform.rate_limit_buckets TO examination_mail_worker;
ALTER TABLE identity.verification_challenges ALTER COLUMN token_hash DROP NOT NULL;
CREATE INDEX verification_material_retention ON identity.verification_challenges((coalesce(consumed_at,cancelled_at,expires_at))) WHERE token_hash IS NOT NULL;
CREATE INDEX email_metadata_retention ON identity.email_intents(created_at);
CREATE INDEX pending_identity_retention ON identity.users(created_at) WHERE email_verified_at IS NULL AND email IS NOT NULL;
CREATE INDEX rate_bucket_retention ON platform.rate_limit_buckets(expires_at);
CREATE FUNCTION identity.verification_maintenance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  -- Lock users before challenges. Other maintenance statements never acquire user locks later.
  WITH pending AS (SELECT id FROM identity.users WHERE email_verified_at IS NULL AND email IS NOT NULL AND created_at<clock_timestamp()-interval '7 days' ORDER BY created_at LIMIT 500 FOR UPDATE SKIP LOCKED),
  purged AS (UPDATE identity.users u SET email=NULL,password_hash=NULL,display_name=NULL,enabled=false,leaderboard_opt_in=false,credential_version=credential_version+1 FROM pending WHERE u.id=pending.id RETURNING u.id)
  INSERT INTO platform.audit_logs(id,actor_type,action,resource_type,resource_id,reason,correlation_id,outcome,changed_fields)
  SELECT gen_random_uuid(),'SYSTEM','identity.pending.purge','USER',id,'Pending verification retention 7 days',gen_random_uuid(),'SUCCESS','["email","passwordHash","displayName"]' FROM purged;
  WITH expired AS (SELECT id FROM identity.verification_challenges WHERE ciphertext IS NOT NULL AND (expires_at<=clock_timestamp() OR consumed_at IS NOT NULL OR cancelled_at IS NOT NULL) ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED)
  UPDATE identity.verification_challenges c SET ciphertext=NULL FROM expired WHERE c.id=expired.id;
  WITH old AS (SELECT id FROM identity.verification_challenges WHERE token_hash IS NOT NULL AND coalesce(consumed_at,cancelled_at,expires_at)<clock_timestamp()-interval '24 hours' ORDER BY coalesce(consumed_at,cancelled_at,expires_at) LIMIT 500 FOR UPDATE SKIP LOCKED)
  UPDATE identity.verification_challenges c SET token_hash=NULL FROM old WHERE c.id=old.id;
  WITH old AS (SELECT id FROM identity.email_intents WHERE created_at<clock_timestamp()-interval '7 days' ORDER BY created_at LIMIT 500 FOR UPDATE SKIP LOCKED)
  DELETE FROM identity.email_intents i USING old WHERE i.id=old.id;
  WITH old AS (SELECT c.id FROM identity.verification_challenges c WHERE expires_at<clock_timestamp()-interval '7 days' AND NOT EXISTS(SELECT FROM identity.email_intents i WHERE i.challenge_id=c.id) ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED)
  DELETE FROM identity.verification_challenges c USING old WHERE c.id=old.id;
END $$;
REVOKE ALL ON FUNCTION identity.verification_maintenance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.verification_maintenance() TO examination_mail_worker;
CREATE FUNCTION identity.operator_revoke_key(key_id text, operator_name text, rationale text, correlation uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n integer;
BEGIN
  IF key_id IS NULL OR key_id !~ '^[A-Za-z0-9_-]{1,64}$' OR operator_name IS NULL OR rationale IS NULL OR length(btrim(operator_name)) NOT BETWEEN 1 AND 200 OR length(btrim(rationale)) NOT BETWEEN 1 AND 500 OR correlation IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid operator request'; END IF;
  WITH revoked AS (UPDATE identity.session_families f SET revoked_at=clock_timestamp() WHERE f.revoked_at IS NULL AND EXISTS(SELECT FROM identity.sessions s WHERE s.family_id=f.id AND s.signing_kid=key_id) RETURNING f.id)
  INSERT INTO platform.audit_logs(id,actor_type,operator_identity,action,resource_type,resource_id,reason,correlation_id,outcome,changed_fields)
  SELECT gen_random_uuid(),'OPERATOR',session_user||':'||operator_name,'identity.key.revoke','SESSION_FAMILY',id,rationale,correlation,'SUCCESS','["revokedAt"]' FROM revoked;
  GET DIAGNOSTICS n=ROW_COUNT;RETURN n;
END $$;
REVOKE ALL ON FUNCTION identity.operator_revoke_key(text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.operator_revoke_key(text,text,text,uuid) TO examination_operator;
CREATE FUNCTION identity.operator_replay_email(job_id uuid, operator_name text, rationale text, correlation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target uuid; challenge uuid;
BEGIN
  IF operator_name IS NULL OR rationale IS NULL OR length(btrim(operator_name)) NOT BETWEEN 1 AND 200 OR length(btrim(rationale)) NOT BETWEEN 1 AND 500 OR correlation IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid operator request'; END IF;
  SELECT c.user_id,c.id INTO target,challenge FROM identity.email_intents i JOIN identity.verification_challenges c ON c.id=i.challenge_id WHERE i.id=job_id;
  PERFORM id FROM identity.users WHERE id=target AND enabled AND email_verified_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Live pending account required'; END IF;
  PERFORM id FROM identity.verification_challenges WHERE id=challenge AND consumed_at IS NULL AND cancelled_at IS NULL AND ciphertext IS NOT NULL AND expires_at>clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Live challenge required'; END IF;
  UPDATE identity.email_intents SET parked_at=NULL,attempts=0,available_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,failure_code=NULL WHERE id=job_id AND parked_at IS NOT NULL AND cancelled_at IS NULL AND delivered_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Parked intent required'; END IF;
  INSERT INTO platform.audit_logs(id,actor_type,operator_identity,action,resource_type,resource_id,reason,correlation_id,outcome,changed_fields)
  VALUES(gen_random_uuid(),'OPERATOR',session_user||':'||operator_name,'identity.email.replay','EMAIL_INTENT',job_id,rationale,correlation,'SUCCESS','["availableAt","attempts"]');
END $$;
REVOKE ALL ON FUNCTION identity.operator_replay_email(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.operator_replay_email(uuid,text,text,uuid) TO examination_operator;
