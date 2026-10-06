import { PostgresDatabase } from "../../../../../../infrastructure/database/transaction/postgres-database";
import { SessionLookup } from "../../../../domain/entities/identity-state";
import { Principal } from "../../../../application/dto/identity.dto";
import { IdentityQuery } from "../../../../application/ports/identity-query.port";
export class PostgresIdentityQuery implements IdentityQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async principal(c: SessionLookup, hash: Uint8Array): Promise<Principal | null> {
    const r = await this.db.query<{
      userId: string;
      familyId: string;
      sessionId: string;
      permissions: string[];
      profile: Principal["profile"];
    }>(
      "identity.read",
      `SELECT u.id AS "userId",f.id AS "familyId",s.id AS "sessionId",
      ARRAY(SELECT DISTINCT rp.permission_id FROM identity.user_roles ur JOIN identity.role_permissions rp ON rp.role_id=ur.role_id WHERE ur.user_id=u.id) AS permissions,
      jsonb_build_object('id',u.id,'email',u.email,'emailVerifiedAt',to_char(u.email_verified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'displayName',u.display_name,'leaderboardOptIn',u.leaderboard_opt_in,'revision',u.revision) AS profile
      FROM identity.sessions s JOIN identity.session_families f ON f.id=s.family_id JOIN identity.users u ON u.id=f.user_id
      WHERE s.id=$1 AND f.id=$2 AND u.id=$3 AND s.access_hash=$4 AND s.access_jti=$5 AND s.signing_kid=$6
      AND u.enabled AND u.email_verified_at IS NOT NULL AND s.consumed_at IS NULL AND f.revoked_at IS NULL
      AND s.access_expires_at>clock_timestamp() AND f.absolute_expires_at>clock_timestamp()`,
      [c.sessionId, c.familyId, c.userId, Buffer.from(hash), c.jti, c.kid],
    );
    return r.rows[0] ?? null;
  }
  async csrfFamily(
    c: SessionLookup,
    hash: Uint8Array,
    allowRevoked: boolean,
  ): Promise<string | null> {
    const row = (
      await this.db.query<{ id: string }>(
        "identity.read",
        `SELECT f.id FROM identity.sessions s JOIN identity.session_families f ON f.id=s.family_id JOIN identity.users u ON u.id=f.user_id
      WHERE s.id=$1 AND f.id=$2 AND u.id=$3 AND s.refresh_hash=$4 AND s.refresh_jti=$5 AND s.signing_kid=$6
      AND ($7::boolean OR (u.enabled AND u.email_verified_at IS NOT NULL AND f.revoked_at IS NULL AND s.refresh_expires_at>clock_timestamp() AND f.absolute_expires_at>clock_timestamp()))`,
        [c.sessionId, c.familyId, c.userId, Buffer.from(hash), c.jti, c.kid, allowRevoked],
      )
    ).rows[0];
    return row?.id ?? null;
  }
}
