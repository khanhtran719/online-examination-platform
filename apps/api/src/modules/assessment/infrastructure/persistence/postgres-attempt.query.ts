import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { AttemptStatus } from "../../domain/attempt";
import { AnswerRow, AttemptQuery, OwnedAttempt } from "../../application/ports/attempt-query.port";

const stamp = (column: string, alias: string) =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "${alias}"`;

function json<T>(value: T | string | null | undefined, empty: T): T {
  if (value === null || value === undefined) return empty;
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

export class PostgresAttemptQuery implements AttemptQuery {
  constructor(private readonly db: PostgresDatabase) {}

  async read(attemptId: string, userId: string): Promise<OwnedAttempt | null> {
    const row = (
      await this.db.query<OwnedAttempt>(
        "assessment.read",
        `
        SELECT
          id,
          exam_id AS "examId",
          version_id AS "publishedVersionId",
          user_id AS "userId",
          revision,
          status,
          ${stamp("started_at", "startedAt")},
          ${stamp("deadline", "deadline")},
          CASE
            WHEN submitted_at IS NULL THEN NULL
            ELSE to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          END AS "submittedAt",
          expired,
          replay_pending AS "replayPending",
          submission_id AS "submissionId",
          submission_kind AS "submissionKind",
          ${stamp("clock_timestamp()", "serverNow")}
        FROM
          assessment.attempts
        WHERE
          id = $1
          AND user_id = $2
        `,
        [attemptId, userId],
      )
    ).rows[0];
    if (!row) return null;
    return { ...row, revision: Number(row.revision), status: row.status as AttemptStatus };
  }

  async answers(input: {
    attemptId: string;
    userId: string;
    sectionPosition: number | null;
    questionPosition: number | null;
    questionId: string | null;
    limit: number;
  }): Promise<{ present: boolean; serverNow: string; rows: AnswerRow[] }> {
    const rows = (
      await this.db.query<AnswerRow & { present: boolean; serverNow: string }>(
        "assessment.read",
        `
        WITH
          owned AS (
            SELECT
              id,
              version_id
            FROM
              assessment.attempts
            WHERE
              id = $1
              AND user_id = $2
          ),
          clock AS (
            SELECT
              ${stamp("clock_timestamp()", "serverNow")}
          ),
          page AS (
            SELECT
              a.question_id AS "questionId",
              a.marked,
              a.version,
              ${stamp("a.updated_at", "updatedAt")},
              q.position,
              s.position AS "sectionPosition",
              coalesce(
                (
                  SELECT
                    json_agg(sel.option_id ORDER BY o.position)
                  FROM
                    assessment.answer_selections sel
                    JOIN catalog.published_options o
                      ON o.version_id = a.version_id
                      AND o.question_id = a.question_id
                      AND o.id = sel.option_id
                  WHERE
                    sel.attempt_id = a.attempt_id
                    AND sel.question_id = a.question_id
                ),
                '[]'::json
              ) AS "selectedOptionIds"
            FROM
              owned
              JOIN assessment.answers a ON a.attempt_id = owned.id
              JOIN catalog.published_questions q
                ON q.version_id = owned.version_id
                AND q.id = a.question_id
              JOIN catalog.published_sections s
                ON s.version_id = q.version_id
                AND s.id = q.section_id
            WHERE
              $3::smallint IS NULL
              OR (s.position, q.position, a.question_id) > ($3::smallint, $4::smallint, $5::uuid)
            ORDER BY
              s.position,
              q.position,
              a.question_id
            LIMIT
              $6
          )
        SELECT
          owned.id IS NOT NULL AS present,
          clock."serverNow",
          page."questionId",
          page.marked,
          page.version,
          page."updatedAt",
          page.position,
          page."sectionPosition",
          page."selectedOptionIds"
        FROM
          owned
          CROSS JOIN clock
          LEFT JOIN page ON true
        `,
        [
          input.attemptId,
          input.userId,
          input.sectionPosition,
          input.questionPosition,
          input.questionId,
          input.limit,
        ],
      )
    ).rows;
    if (rows.length === 0) return { present: false, serverNow: "", rows: [] };
    return {
      present: true,
      serverNow: rows[0]!.serverNow,
      rows: rows
        .filter((row) => row.questionId !== null)
        .map((row) => ({
          questionId: row.questionId,
          selectedOptionIds: json(row.selectedOptionIds, []),
          marked: row.marked,
          version: Number(row.version),
          updatedAt: row.updatedAt,
          sectionPosition: Number(row.sectionPosition),
          position: Number(row.position),
        })),
    };
  }
}
