import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { ActiveCandidatesQuery } from "../../application/ports/active-candidates.query";
export class PostgresActiveCandidatesQuery implements ActiveCandidatesQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<ActiveCandidatesQuery["page"]>[0]) {
    const result = await this.db.query<{
      present: boolean;
      serverNow: Date;
      candidateId: string | null;
      attemptId: string;
      status: "IN_PROGRESS";
      startedAt: Date;
      deadline: Date;
    }>(
      "reporting.read",
      `
      WITH clock AS MATERIALIZED (
        SELECT
          date_trunc('milliseconds', statement_timestamp()) AS now
      )
      SELECT
        e.id IS NOT NULL AS present,
        clock.now AS "serverNow",
        page.user_id AS "candidateId",
        page.id AS "attemptId",
        page.status,
        page.started_at AS "startedAt",
        page.deadline
      FROM
        clock
        LEFT JOIN catalog.exams e ON e.id = $1
        LEFT JOIN LATERAL (
          SELECT
            a.id,
            a.user_id,
            a.status,
            a.started_at,
            a.deadline
          FROM
            assessment.attempts a
          WHERE
            a.exam_id = e.id
            AND a.status = 'IN_PROGRESS'
            AND a.purged_at IS NULL
            AND a.deadline > clock.now
            AND a.started_at <= coalesce($3::timestamptz, clock.now)
            AND ($4::timestamptz IS NULL OR (a.started_at, a.id) < ($4, $5::uuid))
          ORDER BY
            a.started_at DESC,
            a.id DESC
          LIMIT
            $2
        ) page ON true
      ORDER BY
        page.started_at DESC,
        page.id DESC
    `,
      [
        input.examId,
        input.limit,
        input.watermark,
        input.position?.[0] ?? null,
        input.position?.[1] ?? null,
      ],
    );
    const first = result.rows[0]!;
    return {
      present: first.present,
      serverNow: first.serverNow.toISOString(),
      rows: result.rows
        .filter((r) => r.candidateId !== null)
        .map((r) => ({
          candidateId: r.candidateId!,
          attemptId: r.attemptId,
          status: r.status,
          startedAt: r.startedAt.toISOString(),
          deadline: r.deadline.toISOString(),
        })),
    };
  }
}
