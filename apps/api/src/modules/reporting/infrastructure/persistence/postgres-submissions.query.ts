import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { AdminScore, AdminSubmission } from "../../application/dto/submissions.dto";
import { SubmissionsQuery } from "../../application/ports/submissions.query";
const stamp = (column: string) =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
export class PostgresSubmissionsQuery implements SubmissionsQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<SubmissionsQuery["page"]>[0]) {
    const result = await this.db.query<
      AdminSubmission & { present: boolean; serverNow: string; startedAt: string }
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
            e.id
          FROM
            catalog.exams e
          WHERE
            e.id = $1
            AND (
              $2::uuid IS NULL
              OR EXISTS (
                SELECT
                  1
                FROM
                  catalog.published_versions v
                WHERE
                  v.id = $2
                  AND v.exam_id = e.id
              )
            )
        ),
        page AS MATERIALIZED (
          SELECT
            a.id,
            a.user_id,
            a.version_id,
            a.started_at,
            a.submitted_at,
            a.status,
            a.expired
          FROM
            assessment.attempts a
            JOIN scope s ON s.id = a.exam_id
            CROSS JOIN clock
          WHERE
            ($2::uuid IS NULL OR a.version_id = $2)
            AND a.purged_at IS NULL
            AND a.started_at <= coalesce($3::timestamptz, clock.now)
            AND (
              $4::timestamptz IS NULL
              OR (a.started_at, a.id) < ($4::timestamptz, $5::uuid)
            )
          ORDER BY
            a.started_at DESC,
            a.id DESC
          LIMIT
            $6
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
        p.id AS "attemptId",
        p.version_id AS "publishedVersionId",
        ${stamp("p.started_at")} AS "startedAt",
        ${stamp("p.submitted_at")} AS "submittedAt",
        p.status,
        p.expired,
        CASE WHEN p.status = 'COMPLETED' THEN r.earned_points ELSE NULL END AS earned,
        CASE WHEN p.status = 'COMPLETED' THEN r.possible_points ELSE NULL END AS possible
      FROM
        clock
        LEFT JOIN page p ON true
        LEFT JOIN assessment.results r ON r.attempt_id = p.id
      ORDER BY
        p.started_at DESC,
        p.id DESC
    `,
      [
        input.examId,
        input.publishedVersionId,
        input.watermark,
        input.position?.[0] ?? null,
        input.position?.[1] ?? null,
        input.limit,
      ],
    );
    const first = result.rows[0]!;
    return {
      present: first.present,
      serverNow: first.serverNow,
      rows: result.rows
        .filter((r) => r.attemptId !== null)
        .map(({ present: _present, serverNow: _now, ...item }) => {
          if (item.status === "COMPLETED" && (item.earned === null || item.possible === null))
            throw new Error("RESULT_STATE_UNAVAILABLE");
          return item;
        }),
    };
  }
  async result(attemptId: string) {
    return (
      (
        await this.db.query<{ status: string; result: AdminScore | null }>(
          "reporting.read",
          `
      SELECT
        a.status,
        CASE
          WHEN a.status = 'COMPLETED' AND r.attempt_id IS NOT NULL
          THEN json_build_object(
            'attemptId', a.id,
            'publishedVersionId', a.version_id,
            'submissionId', a.submission_id,
            'completedAt', ${stamp("r.completed_at")},
            'earned', r.earned_points,
            'possible', r.possible_points,
            'correct', r.correct_count,
            'total', r.question_count,
            'percentageBasisPoints', r.percentage_basis_points,
            'expired', a.expired,
            'scoringPolicy', v.scoring_policy,
            'review', NULL,
            'sections', (
              SELECT
                json_agg(
                  json_build_object(
                    'sectionId', summary.section_id,
                    'earned', summary.earned_points,
                    'possible', summary.possible_points,
                    'correct', summary.correct,
                    'total', summary.total
                  )
                  ORDER BY summary.position
                )
              FROM (
                SELECT
                  rs.section_id,
                  rs.earned_points,
                  rs.possible_points,
                  s.position,
                  count(*) FILTER (WHERE rq.correct)::int AS correct,
                  count(*)::int AS total
                FROM
                  assessment.result_sections rs
                  JOIN catalog.published_sections s
                    ON s.version_id = rs.version_id
                    AND s.id = rs.section_id
                  JOIN catalog.published_questions q
                    ON q.version_id = rs.version_id
                    AND q.section_id = rs.section_id
                  JOIN assessment.result_questions rq
                    ON rq.attempt_id = rs.attempt_id
                    AND rq.question_id = q.id
                WHERE
                  rs.attempt_id = a.id
                GROUP BY
                  rs.section_id,
                  rs.earned_points,
                  rs.possible_points,
                  s.position
              ) summary
            )
          )
          ELSE NULL
        END AS result
      FROM
        assessment.attempts a
        JOIN catalog.published_versions v ON v.id = a.version_id
        LEFT JOIN assessment.results r ON r.attempt_id = a.id
      WHERE
        a.id = $1
        AND a.purged_at IS NULL
    `,
          [attemptId],
        )
      ).rows[0] ?? null
    );
  }
}
