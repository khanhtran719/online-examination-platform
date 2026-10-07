import { randomUUID } from "node:crypto";
import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { ExamDraft, QuestionDraft, QuestionType } from "../../domain/catalog-policy";
import {
  CatalogRepository,
  ImportedQuestion,
  LockedExam,
  LockedQuestion,
} from "../../domain/repositories/catalog.repository";

interface ExamSectionRow {
  position: number;
  questions: { bankQuestionId: string; position: number; points: number }[] | null;
}

interface LockedExamRow {
  id: string;
  revision: number;
  published: boolean;
  archived: boolean;
  durationSeconds: number;
  attemptLimit: number;
  opensAt: number;
  closesAt: number;
  displayTimezone: string;
  sections: ExamSectionRow[] | null;
}

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async now(): Promise<number> {
    const row = (
      await this.db.query<{ now: number }>(
        "catalog.write",
        `
        SELECT
          extract(epoch FROM clock_timestamp()) * 1000::float8 AS now
        `,
      )
    ).rows[0];
    if (!row || !Number.isFinite(Number(row.now))) throw new Error("Database clock unavailable");
    return Number(row.now);
  }

  async lockQuestions(ids: string[]): Promise<LockedQuestion[]> {
    if (ids.length === 0) return [];
    const rows = (
      await this.db.query<LockedQuestion>(
        "lock.acquire",
        `
        SELECT
          q.id,
          q.archived_at IS NOT NULL AS archived,
          q.type,
          q.revision,
          (
            SELECT
              count(*)::integer
            FROM
              catalog.question_options o
            WHERE
              o.question_id = q.id
          ) AS "optionCount",
          (
            SELECT
              count(*)::integer
            FROM
              catalog.question_options o
            WHERE
              o.question_id = q.id
              AND o.is_correct
          ) AS "keyCount"
        FROM
          catalog.questions q
        WHERE
          q.id = ANY ($1::uuid[])
        ORDER BY
          q.id
        FOR UPDATE OF q
        `,
        [[...ids].sort()],
      )
    ).rows;
    return rows.map((row) => ({ ...row, type: row.type as QuestionType }));
  }

  async lockExam(id: string): Promise<LockedExam | null> {
    const row = (
      await this.db.query<LockedExamRow>(
        "lock.acquire",
        `
        SELECT
          e.id,
          e.revision,
          e.published,
          e.archived_at IS NOT NULL AS archived,
          e.duration_seconds AS "durationSeconds",
          e.attempt_limit AS "attemptLimit",
          (extract(epoch FROM e.opens_at) * 1000)::float8 AS "opensAt",
          (extract(epoch FROM e.closes_at) * 1000)::float8 AS "closesAt",
          e.display_timezone AS "displayTimezone",
          coalesce(
            (
              SELECT
                json_agg(
                  json_build_object(
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
        FOR UPDATE
        `,
        [id],
      )
    ).rows[0];
    if (!row) return null;
    return {
      ...row,
      opensAt: Number(row.opensAt),
      closesAt: Number(row.closesAt),
      sections: (row.sections ?? []).map((section) => ({
        position: section.position,
        questions: section.questions ?? [],
      })),
    };
  }

  async lockQuestion(
    id: string,
  ): Promise<{ id: string; revision: number; archived: boolean } | null> {
    const row = (
      await this.db.query<{ id: string; revision: number; archived: boolean }>(
        "lock.acquire",
        `
        SELECT
          id,
          revision,
          archived_at IS NOT NULL AS archived
        FROM
          catalog.questions
        WHERE
          id = $1
        FOR UPDATE
        `,
        [id],
      )
    ).rows[0];
    return row ?? null;
  }

  async insertExam(draft: ExamDraft): Promise<{ id: string; revision: number }> {
    const id = randomUUID();
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.exams (
          id,
          title,
          category,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at,
          display_timezone,
          explanation_policy,
          leaderboard_enabled,
          revision
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      `,
      [
        id,
        draft.title,
        draft.category,
        draft.durationSeconds,
        draft.attemptLimit,
        draft.openAt,
        draft.closeAt,
        draft.displayTimezone,
        draft.explanationPolicy,
        draft.leaderboardEnabled,
      ],
    );
    await this.replaceMembership(id, draft);
    return { id, revision: 1 };
  }

  async replaceExam(
    id: string,
    expectedRevision: number,
    draft: ExamDraft,
  ): Promise<number | null> {
    const row = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.exams
        SET
          title = $3,
          category = $4,
          duration_seconds = $5,
          attempt_limit = $6,
          opens_at = $7,
          closes_at = $8,
          display_timezone = $9,
          explanation_policy = $10,
          leaderboard_enabled = $11,
          revision = revision + 1,
          updated_at = clock_timestamp()
        WHERE
          id = $1
          AND revision = $2
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [
          id,
          expectedRevision,
          draft.title,
          draft.category,
          draft.durationSeconds,
          draft.attemptLimit,
          draft.openAt,
          draft.closeAt,
          draft.displayTimezone,
          draft.explanationPolicy,
          draft.leaderboardEnabled,
        ],
      )
    ).rows[0];
    if (!row) return null;
    await this.db.query(
      "catalog.write",
      `
      DELETE FROM catalog.exam_questions
      WHERE
        exam_id = $1
      `,
      [id],
    );
    await this.db.query(
      "catalog.write",
      `
      DELETE FROM catalog.exam_sections
      WHERE
        exam_id = $1
      `,
      [id],
    );
    await this.replaceMembership(id, draft);
    return row.revision;
  }

  async archiveExam(id: string, expectedRevision: number): Promise<number | null> {
    const row = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.exams
        SET
          archived_at = clock_timestamp(),
          published = false,
          revision = revision + 1,
          updated_at = clock_timestamp()
        WHERE
          id = $1
          AND revision = $2
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [id, expectedRevision],
      )
    ).rows[0];
    return row?.revision ?? null;
  }

  async insertQuestion(draft: QuestionDraft): Promise<{ id: string; revision: number }> {
    const id = randomUUID();
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.questions (id, type, prompt, explanation, points, revision)
      VALUES
        ($1, $2, $3, $4, $5, 1)
      `,
      [id, draft.type, draft.prompt, draft.explanation, draft.points],
    );
    await this.insertOptions(id, draft);
    return { id, revision: 1 };
  }

  async replaceQuestion(
    id: string,
    expectedRevision: number,
    draft: QuestionDraft,
  ): Promise<number | null> {
    const row = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.questions
        SET
          type = $3,
          prompt = $4,
          explanation = $5,
          points = $6,
          revision = revision + 1
        WHERE
          id = $1
          AND revision = $2
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [id, expectedRevision, draft.type, draft.prompt, draft.explanation, draft.points],
      )
    ).rows[0];
    if (!row) return null;
    await this.db.query(
      "catalog.write",
      `
      DELETE FROM catalog.question_options
      WHERE
        question_id = $1
      `,
      [id],
    );
    await this.insertOptions(id, draft);
    return row.revision;
  }

  async archiveQuestion(id: string, expectedRevision: number): Promise<number | null> {
    const row = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.questions
        SET
          archived_at = clock_timestamp(),
          revision = revision + 1
        WHERE
          id = $1
          AND revision = $2
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [id, expectedRevision],
      )
    ).rows[0];
    return row?.revision ?? null;
  }

  async publish(
    examId: string,
    actorId: string,
    expectedRevision: number,
  ): Promise<{ revision: number } | null> {
    const version = (
      await this.db.query<{ id: string }>(
        "catalog.write",
        `
        INSERT INTO
          catalog.published_versions (
            id,
            exam_id,
            version,
            title,
            description,
            duration_seconds,
            attempt_limit,
            opens_at,
            closes_at,
            display_timezone,
            scoring_policy,
            explanation_policy,
            leaderboard_enabled,
            published_by,
            category
          )
        SELECT
          gen_random_uuid(),
          e.id,
          coalesce(
            (
              SELECT
                max(version)
              FROM
                catalog.published_versions
              WHERE
                exam_id = e.id
            ),
            0
          ) + 1,
          e.title,
          e.description,
          e.duration_seconds,
          e.attempt_limit,
          e.opens_at,
          e.closes_at,
          e.display_timezone,
          'EXACT_MATCH_V1',
          e.explanation_policy,
          e.leaderboard_enabled,
          $2,
          e.category
        FROM
          catalog.exams e
        WHERE
          e.id = $1
          AND e.revision = $3
          AND e.archived_at IS NULL
        RETURNING
          id
        `,
        [examId, actorId, expectedRevision],
      )
    ).rows[0];
    if (!version) return null;
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.published_sections (version_id, id, title, position)
      SELECT
        $2,
        gen_random_uuid(),
        s.title,
        s.position
      FROM
        catalog.exam_sections s
      WHERE
        s.exam_id = $1
      `,
      [examId, version.id],
    );
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.published_questions (
          version_id,
          id,
          section_id,
          source_question_id,
          source_revision,
          type,
          prompt,
          explanation,
          points,
          position
        )
      SELECT
        $2,
        gen_random_uuid(),
        ps.id,
        q.id,
        q.revision,
        q.type,
        q.prompt,
        q.explanation,
        eq.points,
        eq.position
      FROM
        catalog.exam_questions eq
        JOIN catalog.exam_sections es
          ON es.exam_id = eq.exam_id
          AND es.id = eq.section_id
        JOIN catalog.published_sections ps
          ON ps.version_id = $2
          AND ps.position = es.position
        JOIN catalog.questions q
          ON q.id = eq.question_id
      WHERE
        eq.exam_id = $1
      `,
      [examId, version.id],
    );
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.published_options (version_id, question_id, id, position, text)
      SELECT
        pq.version_id,
        pq.id,
        gen_random_uuid(),
        o.position,
        o.text
      FROM
        catalog.published_questions pq
        JOIN catalog.question_options o
          ON o.question_id = pq.source_question_id
      WHERE
        pq.version_id = $1
      `,
      [version.id],
    );
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.published_answer_keys (version_id, question_id, option_id)
      SELECT
        po.version_id,
        po.question_id,
        po.id
      FROM
        catalog.published_options po
        JOIN catalog.published_questions pq
          ON pq.version_id = po.version_id
          AND pq.id = po.question_id
        JOIN catalog.question_options src
          ON src.question_id = pq.source_question_id
          AND src.position = po.position
          AND src.is_correct
      WHERE
        po.version_id = $1
      `,
      [version.id],
    );
    const exam = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.exams
        SET
          published = true,
          current_version_id = $2,
          revision = revision + 1,
          updated_at = clock_timestamp()
        WHERE
          id = $1
          AND revision = $3
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [examId, version.id, expectedRevision],
      )
    ).rows[0];
    return exam ?? null;
  }

  async unpublish(examId: string, expectedRevision: number): Promise<number | null> {
    const row = (
      await this.db.query<{ revision: number }>(
        "catalog.write",
        `
        UPDATE catalog.exams
        SET
          published = false,
          revision = revision + 1,
          updated_at = clock_timestamp()
        WHERE
          id = $1
          AND revision = $2
          AND published
          AND archived_at IS NULL
        RETURNING
          revision
        `,
        [examId, expectedRevision],
      )
    ).rows[0];
    return row?.revision ?? null;
  }

  async insertImported(rows: ImportedQuestion[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.questions (id, type, prompt, explanation, points, revision)
      SELECT
        id,
        type,
        prompt,
        explanation,
        points,
        1
      FROM
        jsonb_to_recordset($1::jsonb) AS question(
          id uuid,
          type text,
          prompt text,
          explanation text,
          points integer
        )
      `,
      [
        JSON.stringify(
          rows.map((row) => ({
            id: row.id,
            type: row.type,
            prompt: row.prompt,
            explanation: row.explanation,
            points: row.points,
          })),
        ),
      ],
    );
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.question_options (question_id, id, position, text, is_correct)
      SELECT
        question_id,
        id,
        position,
        text,
        is_correct
      FROM
        jsonb_to_recordset($1::jsonb) AS option(
          question_id uuid,
          id uuid,
          position smallint,
          text text,
          is_correct boolean
        )
      `,
      [
        JSON.stringify(
          rows.flatMap((row) =>
            row.options.map((option) => ({
              question_id: row.id,
              id: option.id,
              position: option.position,
              text: option.text,
              is_correct: option.correct,
            })),
          ),
        ),
      ],
    );
  }

  async saveImportReport(input: {
    id: string;
    actorId: string;
    dryRun: boolean;
    valid: boolean;
    committed: boolean;
    report: object;
    createdAt: string;
  }): Promise<void> {
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        platform.import_reports (
          id,
          actor_id,
          dry_run,
          valid,
          committed,
          report,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
      `,
      [
        input.id,
        input.actorId,
        input.dryRun,
        input.valid,
        input.committed,
        JSON.stringify(input.report),
        input.createdAt,
      ],
    );
  }

  private async replaceMembership(examId: string, draft: ExamDraft): Promise<void> {
    const sections = draft.sections.map((section) => ({
      id: randomUUID(),
      title: section.title,
      position: section.position,
    }));
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.exam_sections (exam_id, id, title, position)
      SELECT
        $1,
        id,
        title,
        position
      FROM
        jsonb_to_recordset($2::jsonb) AS section(id uuid, title text, position smallint)
      `,
      [examId, JSON.stringify(sections)],
    );
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.exam_questions (exam_id, section_id, question_id, position, points)
      SELECT
        $1,
        s.id,
        link.question_id,
        link.position,
        link.points
      FROM
        jsonb_to_recordset($2::jsonb) AS link(
          section_position smallint,
          question_id uuid,
          position smallint,
          points integer
        )
        JOIN catalog.exam_sections s
          ON s.exam_id = $1
          AND s.position = link.section_position
      `,
      [
        examId,
        JSON.stringify(
          draft.sections.flatMap((section) =>
            section.questions.map((link) => ({
              section_position: section.position,
              question_id: link.bankQuestionId,
              position: link.position,
              points: link.points,
            })),
          ),
        ),
      ],
    );
  }

  private async insertOptions(questionId: string, draft: QuestionDraft): Promise<void> {
    await this.db.query(
      "catalog.write",
      `
      INSERT INTO
        catalog.question_options (question_id, id, position, text, is_correct)
      SELECT
        $1,
        id,
        position,
        text,
        is_correct
      FROM
        jsonb_to_recordset($2::jsonb) AS option(
          id uuid,
          position smallint,
          text text,
          is_correct boolean
        )
      `,
      [
        questionId,
        JSON.stringify(
          draft.options.map((option) => ({
            id: randomUUID(),
            position: option.position,
            text: option.text,
            is_correct: draft.correctOptionPositions.includes(option.position),
          })),
        ),
      ],
    );
  }
}
