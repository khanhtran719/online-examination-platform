import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { CandidateResultsQuery, ReviewRow } from "../../application/ports/candidate-results.query";
import { HistoryItemView, ResultView } from "../../application/dto/candidate-results.dto";
import { OwnedAttempt } from "../../application/ports/attempt-query.port";
import { ReviewRelease } from "../../domain/review-release";

const stamp = (column: string) =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const ownedColumns = `
  a.id,
  a.exam_id AS "examId",
  a.version_id AS "publishedVersionId",
  a.user_id AS "userId",
  a.revision,
  a.status,
  ${stamp("a.started_at")} AS "startedAt",
  ${stamp("a.deadline")} AS deadline,
  ${stamp("a.submitted_at")} AS "submittedAt",
  a.expired,
  a.replay_pending AS "replayPending",
  a.submission_id AS "submissionId",
  a.submission_kind AS "submissionKind",
  ${stamp("statement_timestamp()")} AS "serverNow"
`;
// Read-only frozen Catalog projection dependencies are declared by the query port.
// Gate uses this statement's DB clock and frozen policy; never current draft/exam visibility.
const released = `
  a.status = 'COMPLETED'
  AND r.attempt_id IS NOT NULL
  AND (
    v.explanation_policy = 'AFTER_COMPLETION'
    OR (
      v.explanation_policy = 'AFTER_EXAM_CLOSE'
      AND statement_timestamp() >= v.closes_at
    )
  )
`;

export class PostgresCandidateResultsQuery implements CandidateResultsQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async result(attemptId: string, userId: string) {
    const row = (
      await this.db.query<
        OwnedAttempt & {
          result: Omit<ResultView, "review"> | null;
          reviewAllowed: boolean;
          release: ReviewRelease;
        }
      >(
        "assessment.read",
        `
      SELECT
        ${ownedColumns},
        (${released}) AS "reviewAllowed",
        json_build_object(
          'policy', v.explanation_policy,
          'completed', a.status = 'COMPLETED' AND r.attempt_id IS NOT NULL,
          'closesAt', extract(epoch FROM v.closes_at) * 1000,
          'serverNow', extract(epoch FROM statement_timestamp()) * 1000
        ) AS release,
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
        AND a.user_id = $2
        AND a.purged_at IS NULL
    `,
        [attemptId, userId],
      )
    ).rows[0];
    if (!row) return null;
    const { result, reviewAllowed, release, ...attempt } = row;
    return { attempt, result, reviewAllowed, release };
  }

  async history(input: Parameters<CandidateResultsQuery["history"]>[0]) {
    const rows = (
      await this.db.query<HistoryItemView & { serverNow: string; watermark: string }>(
        "assessment.read",
        `
      WITH
        clock AS MATERIALIZED (
          SELECT
            statement_timestamp() AS now,
            coalesce($2::timestamptz, statement_timestamp()) AS watermark
        ),
        page AS (
          SELECT
            a.id AS "attemptId",
            a.exam_id AS "examId",
            a.version_id AS "publishedVersionId",
            ${stamp("a.started_at")} AS "startedAt",
            a.status,
            a.expired,
            CASE WHEN a.status = 'COMPLETED' THEN r.earned_points ELSE NULL END AS earned,
            CASE WHEN a.status = 'COMPLETED' THEN r.possible_points ELSE NULL END AS possible
          FROM
            assessment.attempts a
            CROSS JOIN clock
            LEFT JOIN assessment.results r ON r.attempt_id = a.id
          WHERE
            a.user_id = $1
            AND a.purged_at IS NULL
            AND a.started_at <= clock.watermark
            AND (
              $3::timestamptz IS NULL
              OR (a.started_at, a.id) < ($3::timestamptz, $4::uuid)
            )
          ORDER BY
            a.started_at DESC,
            a.id DESC
          LIMIT
            $5
        )
      SELECT
        ${stamp("clock.now")} AS "serverNow",
        ${stamp("clock.watermark")} AS watermark,
        page.*
      FROM
        clock
        LEFT JOIN page ON true
      ORDER BY
        page."startedAt" DESC,
        page."attemptId" DESC
    `,
        [input.userId, input.watermark, input.at, input.id, input.limit],
      )
    ).rows;
    const first = rows[0]!;
    return {
      serverNow: first.serverNow,
      watermark: first.watermark,
      rows: rows
        .filter((r) => r.attemptId !== null)
        .map(({ serverNow: _now, watermark: _watermark, ...item }) => {
          if (item.status === "COMPLETED" && (item.earned === null || item.possible === null))
            throw new Error("RESULT_STATE_UNAVAILABLE");
          return item;
        }),
    };
  }

  async review(input: Parameters<CandidateResultsQuery["review"]>[0]) {
    const rows = (
      await this.db.query<{
        present: boolean;
        allowed: boolean;
        release: ReviewRelease;
        versionId: string;
        serverNow: string;
        item: Omit<ReviewRow, "sectionPosition"> | null;
        sectionPosition: number;
      }>(
        "assessment.read",
        `
      WITH
        owned AS MATERIALIZED (
          SELECT
            a.id,
            a.version_id,
            (${released}) AS allowed,
            json_build_object(
              'policy', v.explanation_policy,
              'completed', a.status = 'COMPLETED' AND r.attempt_id IS NOT NULL,
              'closesAt', extract(epoch FROM v.closes_at) * 1000,
              'serverNow', extract(epoch FROM statement_timestamp()) * 1000
            ) AS release,
            ${stamp("statement_timestamp()")} AS "serverNow"
          FROM
            assessment.attempts a
            JOIN catalog.published_versions v ON v.id = a.version_id
            LEFT JOIN assessment.results r ON r.attempt_id = a.id
          WHERE
            a.id = $1
            AND a.user_id = $2
            AND a.purged_at IS NULL
        ),
        gated AS MATERIALIZED (
          SELECT
            id,
            version_id
          FROM
            owned
          WHERE
            allowed
        ),
        page AS (
          SELECT
            s.position AS "sectionPosition",
            q.position,
            q.id,
            json_build_object(
              'question', json_build_object(
                'id', q.id,
                'sectionId', q.section_id,
                'position', q.position,
                'type', q.type,
                'prompt', q.prompt,
                'points', q.points,
                'options', (
                  SELECT
                    json_agg(
                      json_build_object('id', o.id, 'position', o.position, 'text', o.text)
                      ORDER BY o.position
                    )
                  FROM
                    catalog.published_options o
                  WHERE
                    o.version_id = q.version_id
                    AND o.question_id = q.id
                )
              ),
              'selectedOptionIds', coalesce((
                SELECT
                  json_agg(sel.option_id ORDER BY o.position)
                FROM
                  assessment.answer_selections sel
                  JOIN catalog.published_options o
                    ON o.version_id = sel.version_id
                    AND o.question_id = sel.question_id
                    AND o.id = sel.option_id
                WHERE
                  sel.attempt_id = gated.id
                  AND sel.question_id = q.id
              ), '[]'::json),
              'correctOptionIds', (
                SELECT
                  json_agg(k.option_id ORDER BY o.position)
                FROM
                  catalog.published_answer_keys k
                  JOIN catalog.published_options o
                    ON o.version_id = k.version_id
                    AND o.question_id = k.question_id
                    AND o.id = k.option_id
                WHERE
                  k.version_id = q.version_id
                  AND k.question_id = q.id
              ),
              'correct', rq.correct,
              'explanation', q.explanation
            ) AS item
          FROM
            gated
            JOIN catalog.published_sections s ON s.version_id = gated.version_id
            JOIN catalog.published_questions q
              ON q.version_id = s.version_id
              AND q.section_id = s.id
            JOIN assessment.result_questions rq
              ON rq.attempt_id = gated.id
              AND rq.question_id = q.id
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
        true AS present,
        owned.allowed,
        owned.release,
        owned.version_id AS "versionId",
        owned."serverNow",
        page.item,
        page."sectionPosition"
      FROM
        owned
        LEFT JOIN page ON true
      ORDER BY
        page."sectionPosition",
        page.position,
        page.id
    `,
        [
          input.attemptId,
          input.userId,
          input.position?.sectionPosition ?? null,
          input.position?.questionPosition ?? null,
          input.position?.questionId ?? null,
          input.limit,
        ],
      )
    ).rows;
    const first = rows[0];
    if (!first)
      return {
        present: false,
        allowed: false,
        release: null,
        versionId: "",
        serverNow: "",
        rows: [],
      };
    return {
      present: true,
      allowed: first.allowed,
      release: first.release,
      versionId: first.versionId,
      serverNow: first.serverNow,
      rows: rows
        .filter((r) => r.item !== null)
        .map((r) => ({ ...r.item!, sectionPosition: r.sectionPosition })),
    };
  }
}
