import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { QuestionStatisticsQuery } from "../../application/ports/question-statistics.query";
export class PostgresQuestionStatisticsQuery implements QuestionStatisticsQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<QuestionStatisticsQuery["page"]>[0]) {
    const result = await this.db.query<{
      present: boolean;
      serverNow: Date;
      questionId: string | null;
      sectionPosition: number;
      questionPosition: number;
      completed: string;
      correct: string;
      incorrect: string;
      unanswered: string;
      options: { optionId: string; selectedCount: string }[];
    }>(
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
            q.version_id,
            q.id,
            s.position AS section_position,
            q.position AS question_position
          FROM
            scope v
            JOIN catalog.published_sections s ON s.version_id = v.id
            JOIN catalog.published_questions q
              ON q.version_id = s.version_id
              AND q.section_id = s.id
          WHERE
            $3::smallint IS NULL
            OR (s.position, q.position, q.id) > ($3::smallint, $4::smallint, $5::uuid)
          ORDER BY
            s.position,
            q.position,
            q.id
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
        clock.now AS "serverNow",
        p.id AS "questionId",
        p.section_position AS "sectionPosition",
        p.question_position AS "questionPosition",
        coalesce(stats.completed_count, 0)::text AS completed,
        coalesce(stats.correct_count, 0)::text AS correct,
        coalesce(stats.incorrect_count, 0)::text AS incorrect,
        coalesce(stats.unanswered_count, 0)::text AS unanswered,
        coalesce(options.items, '[]'::json) AS options
      FROM
        clock
        LEFT JOIN page p ON true
        LEFT JOIN assessment.question_statistics stats
          ON stats.version_id = p.version_id
          AND stats.question_id = p.id
        LEFT JOIN LATERAL (
          SELECT
            json_agg(
              json_build_object(
                'optionId', o.id,
                'selectedCount', coalesce(selection.selected_count, 0)::text
              )
              ORDER BY o.position
            ) AS items
          FROM
            catalog.published_options o
            LEFT JOIN assessment.option_statistics selection
              ON selection.version_id = o.version_id
              AND selection.question_id = o.question_id
              AND selection.option_id = o.id
          WHERE
            o.version_id = p.version_id
            AND o.question_id = p.id
        ) options ON true
      ORDER BY
        p.section_position,
        p.question_position,
        p.id
    `,
      [
        input.examId,
        input.versionId,
        input.position?.[0] ?? null,
        input.position?.[1] ?? null,
        input.position?.[2] ?? null,
        input.limit,
      ],
    );
    const first = result.rows[0]!;
    return {
      present: first.present,
      serverNow: first.serverNow.toISOString(),
      rows: result.rows
        .filter((row) => row.questionId !== null)
        .map((row) => ({
          questionId: row.questionId!,
          sectionPosition: row.sectionPosition,
          questionPosition: row.questionPosition,
          counters: {
            completed: row.completed,
            correct: row.correct,
            incorrect: row.incorrect,
            unanswered: row.unanswered,
          },
          options: row.options,
        })),
    };
  }
}
