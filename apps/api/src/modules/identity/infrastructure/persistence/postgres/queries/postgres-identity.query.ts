import { PostgresDatabase } from "../../../../../../infrastructure/database/transaction/postgres-database";
import { SessionLookup } from "../../../../domain/entities/identity-state";
import { Principal } from "../../../../application/dto/identity.dto";
import { IdentityQuery } from "../../../../application/ports/identity-query.port";
import { livePrincipalSql } from "./live-principal.sql";
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
      `
      ${livePrincipalSql}
      `,
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
        `
        SELECT
          f.id
        FROM
          identity.sessions s
          JOIN identity.session_families f ON f.id = s.family_id
          JOIN identity.users u ON u.id = f.user_id
        WHERE
          s.id = $1
          AND f.id = $2
          AND u.id = $3
          AND s.refresh_hash = $4
          AND s.refresh_jti = $5
          AND s.signing_kid = $6
          AND (
            $7::boolean
            OR (
              u.enabled
              AND u.email_verified_at IS NOT NULL
              AND f.revoked_at IS NULL
              AND s.refresh_expires_at > clock_timestamp()
              AND f.absolute_expires_at > clock_timestamp()
            )
          )
        `,
        [c.sessionId, c.familyId, c.userId, Buffer.from(hash), c.jti, c.kid, allowRevoked],
      )
    ).rows[0];
    return row?.id ?? null;
  }
}
