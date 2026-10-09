import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { GradingAttempt, GradingRepository } from "../../application/ports/grading-repository.port";
import { Grade } from "../../domain/grading";
import { ScoringAnswer } from "../../domain/scoring";

export class PostgresGradingRepository implements GradingRepository {
  constructor(private readonly db: PostgresDatabase) {}
  async lock(id: string): Promise<GradingAttempt | null> {
    const row = (
      await this.db.query<GradingAttempt>(
        "lock.acquire",
        `
        SELECT
          id,
          exam_id AS "examId",
          version_id AS "publishedVersionId",
          user_id AS "userId",
          status,
          extract (epoch FROM started_at) * 1000 AS "startedAt",
          extract (epoch FROM deadline) * 1000 AS deadline,
          extract (epoch FROM submitted_at) * 1000 AS "submittedAt",
          submission_id AS "submissionId",
          submission_event_id AS "submissionEventId",
          submission_kind AS "submissionKind",
          expired,
          replay_pending AS "replayPending",
          grading_generation AS "gradingGeneration"
        FROM
          assessment.attempts
        WHERE
          id = $1
        FOR UPDATE
        `,
        [id],
      )
    ).rows[0];
    if (!row) return null;
    // Fresh snapshot after a possible lock wait; a correlated EXISTS in the
    // locking statement could still see the pre-wait result snapshot.
    let resultPresent = false;
    if (row.status === "COMPLETED") {
      resultPresent =
        (
          await this.db.query<{ present: boolean }>(
            "assessment.read",
            `
            SELECT
              EXISTS (
                SELECT
                  1
                FROM
                  assessment.results
                WHERE
                  attempt_id = $1
              ) AS present
            `,
            [id],
          )
        ).rows[0]?.present === true;
    }
    const failurePresent =
      row.status === "FAILED" &&
      (
        await this.db.query<{ present: boolean }>(
          "assessment.read",
          `
        SELECT EXISTS (
          SELECT
            1
          FROM
            platform.quarantined_jobs
          WHERE
            event_id = $1
            AND attempt_id = $2
            AND generation = $3
        ) AS present
      `,
          [row.submissionEventId, row.id, row.gradingGeneration],
        )
      ).rows[0]?.present === true;
    return {
      ...row,
      failurePresent,
      startedAt: Number(row.startedAt),
      deadline: Number(row.deadline),
      submittedAt: row.submittedAt === null ? null : Number(row.submittedAt),
      resultPresent,
    };
  }

  async inbox(eventId: string, attemptId: string): Promise<void> {
    const inserted = await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        platform.inbox (
          consumer,
          event_id,
          attempt_id
        )
      VALUES
        (
          $1,
          $2,
          $3
        )
      ON CONFLICT
        (
          consumer,
          event_id
        ) DO NOTHING
      RETURNING
        attempt_id
      `,
      ["assessment.grading.v1", eventId, attemptId],
    );
    if (inserted.rowCount === 1) return;
    const existing = (
      await this.db.query<{ attempt_id: string }>(
        "assessment.read",
        `
        SELECT
          attempt_id
        FROM
          platform.inbox
        WHERE
          consumer = $1
          AND event_id = $2
        `,
        ["assessment.grading.v1", eventId],
      )
    ).rows[0];
    if (existing?.attempt_id !== attemptId) throw new Error("INBOX_IDENTITY_CONFLICT");
  }

  async answers(attemptId: string): Promise<ScoringAnswer[]> {
    return (
      await this.db.query<ScoringAnswer>(
        "assessment.read",
        `
        SELECT
          a.question_id AS "questionId",
          coalesce (
            array_agg (s.option_id ORDER BY s.option_id) FILTER (WHERE s.option_id IS NOT NULL),
            '{}'::uuid [ ]
          ) AS selected
        FROM
          assessment.answers a
        LEFT JOIN
          assessment.answer_selections s ON s.attempt_id = a.attempt_id
          AND s.question_id = a.question_id
        WHERE
          a.attempt_id = $1
        GROUP BY
          a.question_id
        ORDER BY
          a.question_id
        `,
        [attemptId],
      )
    ).rows;
  }

  async begin(attemptId: string): Promise<void> {
    const changed = await this.db.query(
      "assessment.write",
      `
      UPDATE assessment.attempts
      SET
        status = 'PROCESSING',
        replay_pending = false,
        failure_code = NULL
      WHERE
        id = $1
        AND (status IN (
          'SUBMITTED',
          'EXPIRED'
        )
          OR (status = 'FAILED'
            AND replay_pending))
      `,
      [attemptId],
    );
    if (changed.rowCount !== 1) throw new Error("GRADING_STATE_UNAVAILABLE");
  }

  async complete(attempt: GradingAttempt, result: Grade): Promise<void> {
    const params = [attempt.id, attempt.publishedVersionId];
    const saved = (
      await this.db.query<{ sequence: string }>(
        "assessment.write",
        `
        INSERT INTO
          assessment.results (
            attempt_id,
            version_id,
            user_id,
            earned_points,
            possible_points,
            correct_count,
            question_count
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
        RETURNING
          completion_sequence AS sequence
        `,
        [...params, attempt.userId, result.earned, result.possible, result.correct, result.total],
      )
    ).rows[0];
    if (!saved) throw new Error("RESULT_NOT_PERSISTED");
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        assessment.result_sections (
          attempt_id,
          version_id,
          section_id,
          earned_points,
          possible_points
        )
      SELECT
        $1,
        $2,
        s."sectionId",
        s.earned,
        s.possible
      FROM
        jsonb_to_recordset ($3::jsonb) AS s (
          "sectionId" uuid,
          earned integer,
          possible integer
        )
      `,
      [...params, JSON.stringify(result.sections)],
    );
    const questions = JSON.stringify(result.questions);
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        assessment.result_questions (
          attempt_id,
          version_id,
          question_id,
          earned_points,
          correct,
          answered
        )
      SELECT
        $1,
        $2,
        q."questionId",
        q.earned,
        q.correct,
        q.answered
      FROM
        jsonb_to_recordset ($3::jsonb) AS q (
          "questionId" uuid,
          earned integer,
          correct boolean,
          answered boolean
        )
      `,
      [...params, questions],
    );
    // Consistent UUID lock order across attempts avoids projection inversion.
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        assessment.question_statistics (
          version_id,
          question_id,
          completed_count,
          correct_count,
          incorrect_count,
          unanswered_count
        )
      SELECT
        $1,
        q."questionId",
        1,
        q.correct::int,
        (q.answered
          AND NOT q.correct)::int,
        (NOT q.answered)::int
      FROM
        jsonb_to_recordset ($2::jsonb) AS q (
          "questionId" uuid,
          correct boolean,
          answered boolean
        )
      ORDER BY
        q."questionId"
      ON CONFLICT
        (
          version_id,
          question_id
        ) DO UPDATE
      SET
        completed_count = assessment.question_statistics.completed_count + 1,
        correct_count = assessment.question_statistics.correct_count + EXCLUDED.correct_count,
        incorrect_count = assessment.question_statistics.incorrect_count + EXCLUDED.incorrect_count,
        unanswered_count = assessment.question_statistics.unanswered_count + EXCLUDED.unanswered_count
      `,
      [attempt.publishedVersionId, questions],
    );
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        assessment.option_statistics (
          version_id,
          question_id,
          option_id,
          selected_count
        )
      SELECT
        $1,
        q."questionId",
        selected.option_id::uuid,
        1
      FROM
        jsonb_to_recordset ($2::jsonb) AS q (
          "questionId" uuid,
          selected jsonb
        )
      CROSS JOIN
        LATERAL jsonb_array_elements_text (q.selected) AS selected (option_id)
      ORDER BY
        q."questionId",
        selected.option_id::uuid
      ON CONFLICT
        (
          version_id,
          question_id,
          option_id
        ) DO UPDATE
      SET
        selected_count = assessment.option_statistics.selected_count + 1
      `,
      [attempt.publishedVersionId, questions],
    );
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        assessment.leaderboard_entries AS best (
          version_id,
          user_id,
          attempt_id,
          earned_points,
          submitted_at,
          completion_sequence
        )
      VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
      ON CONFLICT
        (
          version_id,
          user_id
        ) DO UPDATE
      SET
        attempt_id = EXCLUDED.attempt_id,
        earned_points = EXCLUDED.earned_points,
        submitted_at = EXCLUDED.submitted_at,
        completion_sequence = EXCLUDED.completion_sequence
      WHERE
        EXCLUDED.earned_points > best.earned_points
        OR (EXCLUDED.earned_points = best.earned_points
          AND (
            EXCLUDED.submitted_at,
            EXCLUDED.attempt_id
          ) < (
            best.submitted_at,
            best.attempt_id
          ))
      `,
      [
        attempt.publishedVersionId,
        attempt.userId,
        attempt.id,
        result.earned,
        new Date(attempt.submittedAt!).toISOString(),
        saved.sequence,
      ],
    );
    if (attempt.gradingGeneration > 0)
      await this.db.query(
        "assessment.write",
        `
      UPDATE platform.quarantined_jobs
      SET
        resolved_at = clock_timestamp()
      WHERE
        event_id = $1
        AND generation <= $2
        AND resolved_at IS NULL
    `,
        [attempt.submissionEventId, attempt.gradingGeneration],
      );
    const changed = await this.db.query(
      "assessment.write",
      `
      UPDATE assessment.attempts
      SET
        status = 'COMPLETED',
        replay_pending = false,
        failure_code = NULL,
        revision = revision + 1
      WHERE
        id = $1
        AND status = 'PROCESSING'
      `,
      [attempt.id],
    );
    if (changed.rowCount !== 1) throw new Error("GRADING_STATE_UNAVAILABLE");
  }

  async quarantine(digest: string, code: "INVALID_SCHEMA" | "SUBMISSION_MISMATCH"): Promise<void> {
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        platform.invalid_submission_messages (
          body_digest,
          failure_code
        )
      VALUES
        (
          $1,
          $2
        )
      ON CONFLICT
        (body_digest) DO NOTHING
      `,
      [digest, code],
    );
  }
}
