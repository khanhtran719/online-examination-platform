export async function seedIdentity(fixture, passwordHash) {
  await fixture.query(
    "INSERT INTO identity.users(id,email,password_hash,display_name,email_verified_at) SELECT md5('user-'||i)::uuid,'seed-'||i||'@example.test',$1,'Synthetic candidate',clock_timestamp() FROM generate_series(1,100000) i",
    [passwordHash],
  );
  await fixture.query("INSERT INTO identity.user_roles SELECT id,'CANDIDATE' FROM identity.users");
  await fixture.query(
    "INSERT INTO identity.session_families(id,user_id,absolute_expires_at) SELECT md5('family-'||i)::uuid,md5('user-'||i)::uuid,clock_timestamp()+interval '30 days' FROM generate_series(1,100000) i",
  );
  await fixture.query(`INSERT INTO identity.sessions(id,family_id,access_hash,refresh_hash,access_expires_at,refresh_expires_at,signing_kid,access_jti,refresh_jti)
    SELECT md5('session-'||i)::uuid,md5('family-'||i)::uuid,decode(md5('access-'||i)||md5('access2-'||i),'hex'),decode(md5('refresh-'||i)||md5('refresh2-'||i),'hex'),clock_timestamp()+interval '1 day',clock_timestamp()+interval '7 days','synthetic-dataset',md5('access-jti-'||i)::uuid,md5('refresh-jti-'||i)::uuid FROM generate_series(1,100000) i`);
  await fixture.query("ANALYZE identity.users");
  await fixture.query("ANALYZE identity.user_roles");
  await fixture.query("ANALYZE identity.session_families");
  await fixture.query("ANALYZE identity.sessions");
}
export async function cleanIdentities(fixture, ids) {
  await fixture.query("DELETE FROM platform.idempotency_receipts WHERE actor_id=ANY($1::uuid[])", [
    ids,
  ]);
  await fixture.query("DELETE FROM platform.audit_logs WHERE actor_id=ANY($1::uuid[])", [ids]);
  await fixture.query(
    "DELETE FROM identity.sessions WHERE family_id IN (SELECT id FROM identity.session_families WHERE user_id=ANY($1::uuid[]))",
    [ids],
  );
  await fixture.query("DELETE FROM identity.session_families WHERE user_id=ANY($1::uuid[])", [ids]);
  await fixture.query("DELETE FROM identity.user_roles WHERE user_id=ANY($1::uuid[])", [ids]);
  await fixture.query("DELETE FROM identity.users WHERE id=ANY($1::uuid[])", [ids]);
}
