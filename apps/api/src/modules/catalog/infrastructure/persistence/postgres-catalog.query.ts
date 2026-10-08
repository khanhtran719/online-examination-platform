import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { Category, ExplanationPolicy, QuestionType } from "../../domain/catalog-policy";
import {
  AdminExam,
  AdminExamRow,
  AdminQuestion,
  AdminQuestionRow,
  BrowseRow,
  CandidateOption,
  FrozenChoice,
  FrozenRow,
  ImportReport,
  PublicExam,
  QuestionOptionInput,
  QuestionReference,
  ScoringItem,
  SectionInput,
  SectionSummary,
} from "../../application/dto/catalog.dto";
import {
  BrowseInput,
  CatalogQuery,
  FrozenInput,
  KeysetInput,
} from "../../application/ports/catalog-query.port";

interface Stamp {
  watermark: Date;
  id: string | null;
}

interface PublicRow extends Stamp {
  title: string | null;
  category: Category | null;
  publishedVersionId: string | null;
  version: number | null;
  durationSeconds: number | null;
  openAt: Date | null;
  closeAt: Date | null;
  displayTimezone: string | null;
  attemptLimit: number | null;
  questionCount: number | null;
  scoringPolicy: "EXACT_MATCH_V1" | null;
  explanationPolicy: ExplanationPolicy | null;
  leaderboardEnabled: boolean | null;
  publishedAt: Date | null;
  sections: SectionSummary[] | null;
}

interface AdminRow extends Stamp {
  revision: number | null;
  published: boolean | null;
  archived: boolean | null;
  publishedVersionId: string | null;
  title: string | null;
  category: Category | null;
  durationSeconds: number | null;
  openAt: Date | null;
  closeAt: Date | null;
  displayTimezone: string | null;
  attemptLimit: number | null;
  explanationPolicy: ExplanationPolicy | null;
  leaderboardEnabled: boolean | null;
  updatedAt: Date | null;
  sections: SectionInput[] | null;
}

interface QuestionRow extends Stamp {
  revision: number | null;
  archived: boolean | null;
  type: QuestionType | null;
  prompt: string | null;
  points: number | null;
  explanation: string | null;
  createdAt: Date | null;
  options: QuestionOptionInput[] | null;
  correctOptionPositions: number[] | null;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function json<T>(value: T | string | null | undefined, empty: T): T {
  if (value === null || value === undefined) return empty;
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

const publishedSections = `
coalesce(
  (
    SELECT
      json_agg(
        json_build_object(
          'id', grouped.id,
          'title', grouped.title,
          'position', grouped.position,
          'questionCount', grouped.question_count,
          'possible', grouped.possible
        )
        ORDER BY
          grouped.position
      )
    FROM
      (
        SELECT
          s.id,
          s.title,
          s.position,
          count(q.id)::integer AS question_count,
          coalesce(sum(q.points), 0)::integer AS possible
        FROM
          catalog.published_sections s
          LEFT JOIN catalog.published_questions q
            ON q.version_id = s.version_id
            AND q.section_id = s.id
        WHERE
          s.version_id = page.version_id
        GROUP BY
          s.id,
          s.title,
          s.position
      ) grouped
  ),
  '[]'::json
)
`;

export class PostgresCatalogQuery implements CatalogQuery {
  constructor(private readonly db: PostgresDatabase) {}

  async browse(input: BrowseInput): Promise<{ watermark: string; rows: BrowseRow[] }> {
    const rows = (
      await this.db.query<PublicRow>(
        "catalog.read",
        `
        WITH
          bounds AS (
            SELECT
              coalesce($1::timestamptz, statement_timestamp()) AS watermark
          ),
          page AS (
            SELECT
              e.id,
              v.id AS version_id,
              v.published_at,
              v.title,
              v.category,
              v.version,
              v.duration_seconds,
              v.opens_at,
              v.closes_at,
              v.display_timezone,
              v.attempt_limit,
              v.scoring_policy,
              v.explanation_policy,
              v.leaderboard_enabled
            FROM
              catalog.exams e
              JOIN catalog.published_versions v
                ON v.exam_id = e.id
                AND v.id = e.current_version_id
              CROSS JOIN bounds
            WHERE
              e.published
              AND e.archived_at IS NULL
              AND v.published_at <= bounds.watermark
              AND (
                $2::text IS NULL
                OR v.category = $2
              )
              AND (
                $3::timestamptz IS NULL
                OR v.published_at < $3
                OR (
                  v.published_at = $3
                  AND e.id < $4::uuid
                )
              )
            ORDER BY
              v.published_at DESC,
              e.id DESC
            LIMIT
              $5
          )
        SELECT
          bounds.watermark,
          page.id,
          page.title,
          page.category,
          page.version_id AS "publishedVersionId",
          page.version,
          page.duration_seconds AS "durationSeconds",
          page.opens_at AS "openAt",
          page.closes_at AS "closeAt",
          page.display_timezone AS "displayTimezone",
          page.attempt_limit AS "attemptLimit",
          (
            SELECT
              count(*)::integer
            FROM
              catalog.published_questions q
            WHERE
              q.version_id = page.version_id
          ) AS "questionCount",
          page.scoring_policy AS "scoringPolicy",
          page.explanation_policy AS "explanationPolicy",
          page.leaderboard_enabled AS "leaderboardEnabled",
          page.published_at AS "publishedAt",
          ${publishedSections} AS sections
        FROM
          bounds
          LEFT JOIN page ON true
        `,
        [input.watermark, input.category, input.at, input.id, input.limit],
      )
    ).rows;
    return {
      watermark: iso(rows[0]?.watermark ?? new Date()),
      rows: rows
        .filter((row) => row.id !== null)
        .map((row) => ({
          ...this.publicExam(row),
          publishedAt: iso(row.publishedAt as Date),
        })),
    };
  }

  async publishedExam(examId: string): Promise<PublicExam | null> {
    const row = (
      await this.db.query<Omit<PublicRow, "publishedAt">>(
        "catalog.read",
        `
        SELECT
          statement_timestamp() AS watermark,
          e.id,
          v.title,
          v.category,
          v.id AS "publishedVersionId",
          v.version,
          v.duration_seconds AS "durationSeconds",
          v.opens_at AS "openAt",
          v.closes_at AS "closeAt",
          v.display_timezone AS "displayTimezone",
          v.attempt_limit AS "attemptLimit",
          (
            SELECT
              count(*)::integer
            FROM
              catalog.published_questions q
            WHERE
              q.version_id = v.id
          ) AS "questionCount",
          v.scoring_policy AS "scoringPolicy",
          v.explanation_policy AS "explanationPolicy",
          v.leaderboard_enabled AS "leaderboardEnabled",
          ${publishedSections.replaceAll("page.version_id", "v.id")} AS sections
        FROM
          catalog.exams e
          JOIN catalog.published_versions v
            ON v.exam_id = e.id
            AND v.id = e.current_version_id
        WHERE
          e.id = $1
          AND e.published
          AND e.archived_at IS NULL
        `,
        [examId],
      )
    ).rows[0];
    return row ? this.publicExam(row) : null;
  }

  async adminExams(input: KeysetInput): Promise<{ watermark: string; rows: AdminExamRow[] }> {
    const rows = (
      await this.db.query<AdminRow>(
        "catalog.read",
        `
        WITH
          bounds AS (
            SELECT
              coalesce($1::timestamptz, statement_timestamp()) AS watermark
          ),
          page AS (
            SELECT
              e.id,
              e.revision,
              e.published,
              e.current_version_id,
              e.title,
              e.category,
              e.duration_seconds,
              e.opens_at,
              e.closes_at,
              e.display_timezone,
              e.attempt_limit,
              e.explanation_policy,
              e.leaderboard_enabled,
              e.updated_at
            FROM
              catalog.exams e
              CROSS JOIN bounds
            WHERE
              e.archived_at IS NULL
              AND e.updated_at <= bounds.watermark
              AND (
                $2::timestamptz IS NULL
                OR e.updated_at < $2
                OR (
                  e.updated_at = $2
                  AND e.id < $3::uuid
                )
              )
            ORDER BY
              e.updated_at DESC,
              e.id DESC
            LIMIT
              $4
          )
        SELECT
          bounds.watermark,
          page.id,
          page.revision,
          page.published,
          false AS archived,
          page.current_version_id AS "publishedVersionId",
          page.title,
          page.category,
          page.duration_seconds AS "durationSeconds",
          page.opens_at AS "openAt",
          page.closes_at AS "closeAt",
          page.display_timezone AS "displayTimezone",
          page.attempt_limit AS "attemptLimit",
          page.explanation_policy AS "explanationPolicy",
          page.leaderboard_enabled AS "leaderboardEnabled",
          page.updated_at AS "updatedAt",
          coalesce(
            (
              SELECT
                json_agg(
                  json_build_object(
                    'title', s.title,
                    'position', s.position,
                    'questions',
                    coalesce(
                      (
                        SELECT
                          json_agg(
                            json_build_object(
                              'bankQuestionId', eq.question_id,
                              'position', eq.position,
                              'points', eq.points
                            )
                            ORDER BY
                              eq.position
                          )
                        FROM
                          catalog.exam_questions eq
                        WHERE
                          eq.exam_id = s.exam_id
                          AND eq.section_id = s.id
                      ),
                      '[]'::json
                    )
                  )
                  ORDER BY
                    s.position
                )
              FROM
                catalog.exam_sections s
              WHERE
                s.exam_id = page.id
            ),
            '[]'::json
          ) AS sections
        FROM
          bounds
          LEFT JOIN page ON true
        `,
        [input.watermark, input.at, input.id, input.limit],
      )
    ).rows;
    return {
      watermark: iso(rows[0]?.watermark ?? new Date()),
      rows: rows.filter((row) => row.id !== null).map((row) => this.adminExamRow(row)),
    };
  }

  async adminExam(examId: string): Promise<AdminExam | null> {
    const row = (
      await this.db.query<AdminRow>(
        "catalog.read",
        `
        SELECT
          statement_timestamp() AS watermark,
          e.id,
          e.revision,
          e.published,
          e.archived_at IS NOT NULL AS archived,
          e.current_version_id AS "publishedVersionId",
          e.title,
          e.category,
          e.duration_seconds AS "durationSeconds",
          e.opens_at AS "openAt",
          e.closes_at AS "closeAt",
          e.display_timezone AS "displayTimezone",
          e.attempt_limit AS "attemptLimit",
          e.explanation_policy AS "explanationPolicy",
          e.leaderboard_enabled AS "leaderboardEnabled",
          e.updated_at AS "updatedAt",
          coalesce(
            (
              SELECT
                json_agg(
                  json_build_object(
                    'title', s.title,
                    'position', s.position,
                    'questions',
                    coalesce(
                      (
                        SELECT
                          json_agg(
                            json_build_object(
                              'bankQuestionId', eq.question_id,
                              'position', eq.position,
                              'points', eq.points
                            )
                            ORDER BY
                              eq.position
                          )
                        FROM
                          catalog.exam_questions eq
                        WHERE
                          eq.exam_id = s.exam_id
                          AND eq.section_id = s.id
                      ),
                      '[]'::json
                    )
                  )
                  ORDER BY
                    s.position
                )
              FROM
                catalog.exam_sections s
              WHERE
                s.exam_id = e.id
            ),
            '[]'::json
          ) AS sections
        FROM
          catalog.exams e
        WHERE
          e.id = $1
        `,
        [examId],
      )
    ).rows[0];
    if (!row?.id) return null;
    const { updatedAt, ...exam } = this.adminExamRow(row);
    void updatedAt;
    return exam;
  }

  async questions(input: KeysetInput): Promise<{ watermark: string; rows: AdminQuestionRow[] }> {
    const rows = (
      await this.db.query<QuestionRow>(
        "catalog.read",
        `
        WITH
          bounds AS (
            SELECT
              coalesce($1::timestamptz, statement_timestamp()) AS watermark
          ),
          page AS (
            SELECT
              q.id,
              q.revision,
              q.type,
              q.prompt,
              q.points,
              q.explanation,
              q.created_at
            FROM
              catalog.questions q
              CROSS JOIN bounds
            WHERE
              q.archived_at IS NULL
              AND q.created_at <= bounds.watermark
              AND (
                $2::timestamptz IS NULL
                OR q.created_at < $2
                OR (
                  q.created_at = $2
                  AND q.id < $3::uuid
                )
              )
            ORDER BY
              q.created_at DESC,
              q.id DESC
            LIMIT
              $4
          )
        SELECT
          bounds.watermark,
          page.id,
          page.revision,
          false AS archived,
          page.type,
          page.prompt,
          page.points,
          page.explanation,
          page.created_at AS "createdAt",
          coalesce(
            (
              SELECT
                json_agg(
                  json_build_object('position', o.position, 'text', o.text)
                  ORDER BY
                    o.position
                )
              FROM
                catalog.question_options o
              WHERE
                o.question_id = page.id
            ),
            '[]'::json
          ) AS options,
          coalesce(
            (
              SELECT
                json_agg(
                  o.position
                  ORDER BY
                    o.position
                )
              FROM
                catalog.question_options o
              WHERE
                o.question_id = page.id
                AND o.is_correct
            ),
            '[]'::json
          ) AS "correctOptionPositions"
        FROM
          bounds
          LEFT JOIN page ON true
        `,
        [input.watermark, input.at, input.id, input.limit],
      )
    ).rows;
    return {
      watermark: iso(rows[0]?.watermark ?? new Date()),
      rows: rows.filter((row) => row.id !== null).map((row) => this.questionRow(row)),
    };
  }

  async question(questionId: string): Promise<AdminQuestion | null> {
    const row = (
      await this.db.query<QuestionRow>(
        "catalog.read",
        `
        SELECT
          statement_timestamp() AS watermark,
          q.id,
          q.revision,
          q.archived_at IS NOT NULL AS archived,
          q.type,
          q.prompt,
          q.points,
          q.explanation,
          q.created_at AS "createdAt",
          coalesce(
            (
              SELECT
                json_agg(
                  json_build_object('position', o.position, 'text', o.text)
                  ORDER BY
                    o.position
                )
              FROM
                catalog.question_options o
              WHERE
                o.question_id = q.id
            ),
            '[]'::json
          ) AS options,
          coalesce(
            (
              SELECT
                json_agg(
                  o.position
                  ORDER BY
                    o.position
                )
              FROM
                catalog.question_options o
              WHERE
                o.question_id = q.id
                AND o.is_correct
            ),
            '[]'::json
          ) AS "correctOptionPositions"
        FROM
          catalog.questions q
        WHERE
          q.id = $1
        `,
        [questionId],
      )
    ).rows[0];
    if (!row?.id) return null;
    const { createdAt, ...question } = this.questionRow(row);
    void createdAt;
    return question;
  }

  async importReport(id: string, actorId: string): Promise<ImportReport | null> {
    const row = (
      await this.db.query<{ report: ImportReport | string }>(
        "catalog.read",
        `
        SELECT
          report
        FROM
          platform.import_reports
        WHERE
          id = $1
          AND actor_id = $2
        `,
        [id, actorId],
      )
    ).rows[0];
    if (!row) return null;
    return json(row.report, null as unknown as ImportReport);
  }

  async frozenPage(input: FrozenInput): Promise<{ present: boolean; rows: FrozenRow[] }> {
    const rows = (
      await this.db.query<{
        id: string | null;
        sectionId: string | null;
        sectionPosition: number | null;
        position: number | null;
        type: QuestionType | null;
        prompt: string | null;
        points: number | null;
        options: CandidateOption[] | string | null;
      }>(
        "catalog.read",
        `
        WITH
          version AS (
            SELECT
              id
            FROM
              catalog.published_versions
            WHERE
              id = $1
          ),
          page AS (
            SELECT
              q.id,
              q.section_id AS "sectionId",
              s.position AS "sectionPosition",
              q.position,
              q.type,
              q.prompt,
              q.points,
              coalesce(
                (
                  SELECT
                    json_agg(
                      json_build_object('id', o.id, 'position', o.position, 'text', o.text)
                      ORDER BY
                        o.position
                    )
                  FROM
                    catalog.published_options o
                  WHERE
                    o.version_id = q.version_id
                    AND o.question_id = q.id
                ),
                '[]'::json
              ) AS options
            FROM
              catalog.published_questions q
              JOIN catalog.published_sections s
                ON s.version_id = q.version_id
                AND s.id = q.section_id
            WHERE
              q.version_id = $1
              AND (
                $2::smallint IS NULL
                OR (s.position, q.position, q.id) > ($2::smallint, $3::smallint, $4::uuid)
              )
            ORDER BY
              s.position,
              q.position,
              q.id
            LIMIT
              $5
          )
        SELECT
          page.id,
          page."sectionId",
          page."sectionPosition",
          page.position,
          page.type,
          page.prompt,
          page.points,
          page.options
        FROM
          version
          LEFT JOIN page ON true
        `,
        [
          input.versionId,
          input.sectionPosition,
          input.questionPosition,
          input.questionId,
          input.limit,
        ],
      )
    ).rows;
    if (rows.length === 0) return { present: false, rows: [] };
    return {
      present: true,
      rows: rows
        .filter((row) => row.id !== null)
        .map((row) => ({
          id: row.id as string,
          sectionId: row.sectionId as string,
          sectionPosition: Number(row.sectionPosition),
          position: Number(row.position),
          type: row.type as QuestionType,
          prompt: row.prompt as string,
          points: Number(row.points),
          options: json(row.options, []),
        })),
    };
  }

  async frozenChoices(versionId: string, questionIds: readonly string[]): Promise<FrozenChoice[]> {
    const rows = (
      await this.db.query<{
        questionId: string;
        type: QuestionType;
        optionIds: string[] | string;
      }>(
        "catalog.read",
        `
        SELECT
          q.id AS "questionId",
          q.type,
          coalesce(
            (
              SELECT
                json_agg(o.id ORDER BY o.position)
              FROM
                catalog.published_options o
              WHERE
                o.version_id = q.version_id
                AND o.question_id = q.id
            ),
            '[]'::json
          ) AS "optionIds"
        FROM
          catalog.published_questions q
        WHERE
          q.version_id = $1
          AND q.id = ANY ($2::uuid[])
        `,
        [versionId, [...questionIds]],
      )
    ).rows;
    return rows.map((row) => ({
      questionId: row.questionId,
      type: row.type,
      optionIds: json(row.optionIds, []),
    }));
  }

  async scoring(versionId: string): Promise<ScoringItem[] | null> {
    const present = (
      await this.db.query<{ present: boolean }>(
        "catalog.read",
        `
        SELECT
          EXISTS (
            SELECT
              1
            FROM
              catalog.published_versions
            WHERE
              id = $1
          ) AS present
        `,
        [versionId],
      )
    ).rows[0]?.present;
    if (!present) return null;
    const rows = (
      await this.db.query<{
        questionId: string;
        sectionId: string;
        position: number;
        type: QuestionType;
        points: number;
        correctOptionIds: string[] | string;
      }>(
        "catalog.read",
        `
        SELECT
          q.id AS "questionId",
          q.section_id AS "sectionId",
          q.position,
          q.type,
          q.points,
          coalesce(
            (
              SELECT
                json_agg(
                  k.option_id
                  ORDER BY
                    k.option_id
                )
              FROM
                catalog.published_answer_keys k
              WHERE
                k.version_id = q.version_id
                AND k.question_id = q.id
            ),
            '[]'::json
          ) AS "correctOptionIds"
        FROM
          catalog.published_questions q
          JOIN catalog.published_sections s
            ON s.version_id = q.version_id
            AND s.id = q.section_id
        WHERE
          q.version_id = $1
        ORDER BY
          s.position,
          q.position,
          q.id
        `,
        [versionId],
      )
    ).rows;
    return rows.map((row) => ({
      ...row,
      position: Number(row.position),
      points: Number(row.points),
      correctOptionIds: json(row.correctOptionIds, []),
    }));
  }

  private publicExam(row: Omit<PublicRow, "publishedAt">): PublicExam {
    return {
      id: row.id as string,
      title: row.title as string,
      category: row.category as Category,
      publishedVersionId: row.publishedVersionId as string,
      version: Number(row.version),
      durationSeconds: Number(row.durationSeconds),
      openAt: iso(row.openAt as Date),
      closeAt: iso(row.closeAt as Date),
      displayTimezone: row.displayTimezone as string,
      attemptLimit: Number(row.attemptLimit),
      questionCount: Number(row.questionCount),
      scoringPolicy: "EXACT_MATCH_V1",
      explanationPolicy: row.explanationPolicy as ExplanationPolicy,
      leaderboardEnabled: Boolean(row.leaderboardEnabled),
      sections: json(row.sections, []).map((section) => ({
        ...section,
        position: Number(section.position),
        questionCount: Number(section.questionCount),
        possible: Number(section.possible),
      })),
    };
  }

  private adminExamRow(row: AdminRow): AdminExamRow {
    return {
      id: row.id as string,
      revision: Number(row.revision),
      published: Boolean(row.published),
      archived: Boolean(row.archived),
      publishedVersionId: row.publishedVersionId,
      title: row.title as string,
      category: row.category as Category,
      durationSeconds: Number(row.durationSeconds),
      openAt: iso(row.openAt as Date),
      closeAt: iso(row.closeAt as Date),
      displayTimezone: row.displayTimezone as string,
      attemptLimit: Number(row.attemptLimit),
      explanationPolicy: row.explanationPolicy as ExplanationPolicy,
      leaderboardEnabled: Boolean(row.leaderboardEnabled),
      updatedAt: iso(row.updatedAt as Date),
      sections: json<SectionInput[]>(row.sections, []).map((section) => ({
        title: section.title,
        position: Number(section.position),
        questions: json<QuestionReference[]>(section.questions, []).map((link) => ({
          bankQuestionId: link.bankQuestionId,
          position: Number(link.position),
          points: Number(link.points),
        })),
      })),
    };
  }

  private questionRow(row: QuestionRow): AdminQuestionRow {
    return {
      id: row.id as string,
      revision: Number(row.revision),
      archived: Boolean(row.archived),
      type: row.type as QuestionType,
      prompt: row.prompt as string,
      points: Number(row.points),
      explanation: row.explanation ?? "",
      createdAt: iso(row.createdAt as Date),
      options: json(row.options, []).map((option) => ({
        position: Number(option.position),
        text: option.text,
      })),
      correctOptionPositions: json<number[]>(row.correctOptionPositions, []).map(Number),
    };
  }
}
