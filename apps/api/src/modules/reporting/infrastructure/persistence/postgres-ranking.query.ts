import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { RankingQuery, RankingSlice } from "../../application/ports/ranking.query";
export class PostgresRankingQuery implements RankingQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<RankingQuery["page"]>[0]): Promise<RankingSlice> {
    const result = await this.db.query<RankingSlice & Record<string, unknown>>(
      "reporting.read",
      `
      WITH policy AS MATERIALIZED (
        SELECT
          v.id,
          v.leaderboard_enabled,
          coalesce(e.epoch, 0)::text AS epoch
        FROM
          catalog.published_versions v
          LEFT JOIN assessment.leaderboard_epochs e ON e.version_id = v.id
        WHERE
          v.exam_id = $1
          AND v.id = $2
      ), boundary AS MATERIALIZED (
        SELECT
          coalesce($3::bigint, (
            SELECT
              max(b.completion_sequence)
            FROM
              assessment.leaderboard_entries b
              JOIN policy p ON p.id = b.version_id
            WHERE
              p.leaderboard_enabled
              AND b.version_id = $2
          ), 0) AS watermark
      ), visible AS NOT MATERIALIZED (
        SELECT
          b.user_id AS "userId",
          b.attempt_id AS "attemptId",
          b.earned_points AS earned,
          r.possible_points AS possible,
          r.completed_at,
          b.submitted_at,
          b.attempt_id
        FROM
          policy p
          JOIN assessment.leaderboard_entries b ON b.version_id = p.id
          JOIN identity.users u ON u.id = b.user_id
          JOIN assessment.results r ON r.attempt_id = b.attempt_id
          JOIN assessment.attempts a ON a.id = b.attempt_id
          CROSS JOIN boundary w
        WHERE
          p.leaderboard_enabled
          AND b.version_id = $2
          AND ($4::text IS NULL OR p.epoch = $4)
          AND b.completion_sequence <= w.watermark
          AND u.enabled
          AND u.email_verified_at IS NOT NULL
          AND u.leaderboard_opt_in
          AND u.privacy_requested_at IS NULL
          AND a.status = 'COMPLETED'
          AND a.purged_at IS NULL
          AND a.version_id = b.version_id
          AND a.user_id = b.user_id
          AND r.version_id = b.version_id
          AND r.user_id = b.user_id
          AND r.earned_points = b.earned_points
          AND r.completion_sequence = b.completion_sequence
          AND a.submitted_at = b.submitted_at
      ), limited AS (
        SELECT
          "userId",
          "attemptId",
          earned,
          possible,
          submitted_at,
          attempt_id,
          completed_at
        FROM
          visible
        WHERE
          $5::int IS NULL
          OR earned < $5
          OR (earned = $5 AND (submitted_at, attempt_id) > ($6::timestamptz, $7::uuid))
        ORDER BY
          earned DESC,
          submitted_at,
          attempt_id
        LIMIT $8
      ), prefix AS (
        -- Live sequential rank requires the visible prefix count, not a total.
        -- First page skips this scan; continuation count uses the same snapshot.
        SELECT
          count(*) AS size
        FROM
          visible
        WHERE
          $5::int IS NOT NULL
          AND (
            earned > $5
            OR (earned = $5 AND (submitted_at, attempt_id) <= ($6::timestamptz, $7::uuid))
          )
      ), page AS (
        SELECT
          (row_number() OVER (
            ORDER BY earned DESC, submitted_at, attempt_id
          ) + (SELECT size FROM prefix))::int AS rank,
          "userId",
          "attemptId",
          earned,
          possible,
          to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            AS "submittedAt",
          to_char(completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            AS "completedAt"
        FROM
          limited
      )
      SELECT
        EXISTS (SELECT 1 FROM policy) AS present,
        coalesce((SELECT leaderboard_enabled FROM policy), false) AS enabled,
        coalesce((SELECT epoch FROM policy), '0') AS epoch,
        (SELECT watermark::text FROM boundary) AS watermark,
        to_char(statement_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          AS "serverNow",
        coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY rank) FROM page), '[]'::jsonb)
          AS rows
      `,
      [
        input.examId,
        input.versionId,
        input.watermark,
        input.epoch,
        input.position?.[0] ?? null,
        input.position?.[1] ?? null,
        input.position?.[2] ?? null,
        input.limit,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("RANKING_UNAVAILABLE");
    return row;
  }
}
