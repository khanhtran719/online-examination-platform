/** Shared live-session predicates for readonly principal and outer write admission. */
export const livePrincipalSql = `
      SELECT
        u.id AS "userId",
        f.id AS "familyId",
        s.id AS "sessionId",
        ARRAY(
          SELECT DISTINCT
            rp.permission_id
          FROM
            identity.user_roles ur
            JOIN identity.role_permissions rp ON rp.role_id = ur.role_id
          WHERE
            ur.user_id = u.id
        ) AS permissions,
        jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'emailVerifiedAt', to_char(
            u.email_verified_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
          ),
          'displayName', u.display_name,
          'leaderboardOptIn', u.leaderboard_opt_in,
          'revision', u.revision
        ) AS profile
      FROM
        identity.sessions s
        JOIN identity.session_families f ON f.id = s.family_id
        JOIN identity.users u ON u.id = f.user_id
      WHERE
        s.id = $1
        AND f.id = $2
        AND u.id = $3
        AND s.access_hash = $4
        AND s.access_jti = $5
        AND s.signing_kid = $6
        AND u.enabled
        AND u.email_verified_at IS NOT NULL
        AND s.consumed_at IS NULL
        AND f.revoked_at IS NULL
        AND s.access_expires_at > clock_timestamp()
        AND f.absolute_expires_at > clock_timestamp()
`;
