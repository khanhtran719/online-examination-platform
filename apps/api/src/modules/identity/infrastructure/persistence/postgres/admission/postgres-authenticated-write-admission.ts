import { PostgresDatabase } from "../../../../../../infrastructure/database/transaction/postgres-database";
import {
  AuthenticatedWriteAdmission,
  WriteAdmissionInput,
  WriteAdmissionResult,
} from "../../../../application/ports/authenticated-write-admission.port";
import { livePrincipalSql } from "../queries/live-principal.sql";

export class PostgresAuthenticatedWriteAdmission implements AuthenticatedWriteAdmission {
  constructor(private readonly db: PostgresDatabase) {}
  async admit(input: WriteAdmissionInput): Promise<WriteAdmissionResult> {
    const a = input.access.claims;
    const r = input.refresh?.claims;
    const row = (
      await this.db.query<WriteAdmissionResult>(
        "security.rate",
        `
      WITH
        principal AS MATERIALIZED (
          ${livePrincipalSql}
        ),
        refresh AS MATERIALIZED (
          SELECT
            f.id
          FROM
            identity.sessions s
            JOIN identity.session_families f ON f.id = s.family_id
            JOIN identity.users u ON u.id = f.user_id
          WHERE
            s.id = $7
            AND f.id = $8
            AND u.id = $9
            AND s.refresh_hash = $10
            AND s.refresh_jti = $11
            AND s.signing_kid = $12
            AND u.enabled
            AND u.email_verified_at IS NOT NULL
            AND f.revoked_at IS NULL
            AND s.refresh_expires_at > clock_timestamp()
            AND f.absolute_expires_at > clock_timestamp()
        ),
        decision AS MATERIALIZED (
          SELECT
            coalesce(
              (SELECT id::text FROM refresh),
              (SELECT "familyId"::text FROM principal),
              'anonymous'
            ) = $13 AS "csrfValid"
        ),
        admitted AS (
          INSERT INTO
            platform.request_limits (scope, subject_hash, theoretical_at, expires_at)
          SELECT
            'actor.write',
            $15,
            clock_timestamp() + $16 * interval '1 millisecond',
            clock_timestamp() + $16 * $17 * interval '1 millisecond' + interval '1 hour'
          FROM
            principal,
            decision
          WHERE
            decision."csrfValid"
            AND $14 = ANY (principal.permissions)
          ON CONFLICT (scope, subject_hash) DO UPDATE
          SET
            theoretical_at = greatest(platform.request_limits.theoretical_at, clock_timestamp())
              + $16 * interval '1 millisecond',
            expires_at = clock_timestamp() + $16 * $17 * interval '1 millisecond' + interval '1 hour'
          WHERE
            platform.request_limits.theoretical_at <= clock_timestamp() + ($17 - 1) * $16 * interval '1 millisecond'
          RETURNING scope
        )
      SELECT
        (SELECT row_to_json(principal) FROM principal) AS principal,
        decision."csrfValid",
        EXISTS (SELECT 1 FROM admitted) AS allowed
      FROM
        decision
      `,
        [
          a.sessionId,
          a.familyId,
          a.userId,
          Buffer.from(input.access.hash),
          a.jti,
          a.kid,
          r?.sessionId ?? null,
          r?.familyId ?? null,
          r?.userId ?? null,
          input.refresh ? Buffer.from(input.refresh.hash) : null,
          r?.jti ?? null,
          r?.kid ?? null,
          input.csrfFamily,
          input.permission,
          Buffer.from(input.subjectHash),
          input.intervalMs,
          input.burst,
        ],
      )
    ).rows[0];
    if (!row) throw new Error("Admission unavailable");
    return row;
  }
}
