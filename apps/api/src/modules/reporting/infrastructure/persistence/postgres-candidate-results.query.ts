import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { CandidateResultPair } from "../../application/dto/candidate-results.dto";
import { CandidateResultsQuery } from "../../application/ports/candidate-results.query";
const stamp = (column: string) =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
// Identifiers below are fixed adapter-owned fragments, never caller data.
const summary = (alias: "best" | "latest") => `json_build_object(
          'attemptId', ${alias}.id,
          'submittedAt', ${stamp(`${alias}.submitted_at`)},
          'status', ${alias}.status,
          'expired', ${alias}.expired,
          'earned', ${alias}.earned,
          'possible', ${alias}.possible
        )`;
export class PostgresCandidateResultsQuery implements CandidateResultsQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<CandidateResultsQuery["page"]>[0]) {
    const result = await this.db.query<
      CandidateResultPair & { present: boolean; serverNow: string }
    >(
      "reporting.read",
      `
      WITH
        clock AS MATERIALIZED (
          SELECT
            date_trunc('milliseconds', statement_timestamp()) AS now
        ),
        scope AS MATERIALIZED (
          SELECT
            v.id
          FROM
            catalog.published_versions v
          WHERE
            v.id = $2
            AND v.exam_id = $1
        ),
        page AS MATERIALIZED (
          SELECT
            a.user_id
          FROM
            assessment.attempts a
            JOIN scope s ON s.id = a.version_id
            CROSS JOIN clock
          WHERE
            a.exam_id = $1
            AND a.purged_at IS NULL
            AND a.submitted_at IS NOT NULL
            AND a.started_at <= coalesce($3::timestamptz, clock.now)
            AND ($4::uuid IS NULL OR a.user_id > $4::uuid)
          GROUP BY
            a.user_id
          ORDER BY
            a.user_id
          LIMIT
            $5
        )
      SELECT
        EXISTS (
          SELECT
            1
          FROM
            scope
        ) AS present,
        ${stamp("clock.now")} AS "serverNow",
        p.user_id AS "candidateId",
        $2::uuid AS "publishedVersionId",
        CASE
          WHEN best.id IS NOT NULL THEN ${summary("best")}
          ELSE NULL
        END AS best,
        CASE
          WHEN latest.id IS NOT NULL THEN ${summary("latest")}
          ELSE NULL
        END AS latest
      FROM
        clock
        LEFT JOIN page p ON true
        LEFT JOIN LATERAL (
          SELECT
            a.id,
            a.submitted_at,
            a.status,
            a.expired,
            r.earned_points AS earned,
            r.possible_points AS possible
          FROM
            assessment.attempts a
            LEFT JOIN assessment.results r
              ON r.attempt_id = a.id
              AND r.version_id = a.version_id
              AND r.user_id = a.user_id
          WHERE
            a.user_id = p.user_id
            AND a.exam_id = $1
            AND a.version_id = $2
            AND a.purged_at IS NULL
            AND a.submitted_at IS NOT NULL
            AND a.started_at <= coalesce($3::timestamptz, clock.now)
            AND a.status = 'COMPLETED'
          ORDER BY
            r.earned_points DESC NULLS FIRST,
            a.submitted_at ASC,
            a.id ASC
          LIMIT
            1
        ) best ON true
        LEFT JOIN LATERAL (
          SELECT
            a.id,
            a.submitted_at,
            a.status,
            a.expired,
            CASE WHEN a.status = 'COMPLETED' THEN r.earned_points ELSE NULL END AS earned,
            CASE WHEN a.status = 'COMPLETED' THEN r.possible_points ELSE NULL END AS possible
          FROM
            assessment.attempts a
            LEFT JOIN assessment.results r
              ON r.attempt_id = a.id
              AND r.version_id = a.version_id
              AND r.user_id = a.user_id
          WHERE
            a.user_id = p.user_id
            AND a.exam_id = $1
            AND a.version_id = $2
            AND a.purged_at IS NULL
            AND a.submitted_at IS NOT NULL
            AND a.started_at <= coalesce($3::timestamptz, clock.now)
          ORDER BY
            a.submitted_at DESC,
            a.id DESC
          LIMIT
            1
        ) latest ON true
      ORDER BY
        p.user_id
      `,
      [input.examId, input.versionId, input.watermark, input.position, input.limit],
    );
    const first = result.rows[0]!;
    return {
      present: first.present,
      serverNow: first.serverNow,
      rows: result.rows
        .filter((row) => row.candidateId !== null)
        .map(({ present: _present, serverNow: _now, ...row }) => {
          if (!row.latest) throw new Error("RESULT_STATE_UNAVAILABLE");
          return row;
        }),
    };
  }
}
