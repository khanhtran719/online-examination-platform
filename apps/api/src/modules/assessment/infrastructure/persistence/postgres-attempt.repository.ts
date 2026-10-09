import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { AttemptStatus } from "../../domain/attempt";
import { ExpiryRetry } from "../../application/ports/expiry-retry.port";
import {
  AnswerWrite,
  AttemptRecord,
  LockedAttempt,
  AttemptRepository,
} from "../../domain/repositories/attempt.repository";

const stamp = (column: string, alias: string) =>
  `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "${alias}"`;

const attemptColumns = `
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
  submission_kind AS "submissionKind"
`;

/** Discovery predicate for EXPLAIN and the claim. The predicate is adapter-owned. */
export const claimDueSql = `
WITH locked AS MATERIALIZED (
  SELECT
    ${attemptColumns}
  FROM
    assessment.attempts
  WHERE
    status = 'IN_PROGRESS'
    AND deadline <= statement_timestamp()
    AND (expiry_retry_after IS NULL OR expiry_retry_after <= statement_timestamp())
    AND NOT (id = ANY($1::uuid[]))
  ORDER BY
    deadline,
    id
  LIMIT
    1
  FOR UPDATE SKIP LOCKED
)
SELECT
  locked.*,
  ${stamp("clock_timestamp()", "serverNow")}
FROM
  locked
`;

function record(row: AttemptRecord): AttemptRecord {
  return { ...row, revision: Number(row.revision), status: row.status as AttemptStatus };
}

export class PostgresAttemptRepository implements AttemptRepository, ExpiryRetry {
  constructor(private readonly db: PostgresDatabase) {}

  async lockActive(userId: string, examId: string): Promise<LockedAttempt | null> {
    return this.lock(
      `
          user_id = $1
          AND exam_id = $2
          AND status IN ('CREATED', 'IN_PROGRESS')
        `,
      [userId, examId],
    );
  }

  async lockOwned(attemptId: string, userId: string): Promise<LockedAttempt | null> {
    return this.lock(
      `
          id = $1
          AND user_id = $2
          AND purged_at IS NULL
        `,
      [attemptId, userId],
    );
  }

  private async lock(predicate: string, params: string[]): Promise<LockedAttempt | null> {
    // Materialization makes the outer volatile clock run after LockRows, including
    // any wait. The predicate is an adapter-owned constant, never request SQL.
    const row = (
      await this.db.query<LockedAttempt>(
        "lock.acquire",
        `
      WITH locked AS MATERIALIZED (
        SELECT
          ${attemptColumns}
        FROM
          assessment.attempts
        WHERE
          ${predicate}
        FOR UPDATE
      )
      SELECT
        locked.*,
        ${stamp("clock_timestamp()", "serverNow")}
      FROM
        locked
      `,
        params,
      )
    ).rows[0];
    return row ? { ...record(row), serverNow: row.serverNow } : null;
  }

  async claimDue(excludeIds: readonly string[]): Promise<LockedAttempt | null> {
    const row = (await this.db.query<LockedAttempt>("lock.acquire", claimDueSql, [[...excludeIds]]))
      .rows[0];
    return row ? { ...record(row), serverNow: row.serverNow } : null;
  }

  async deferExpiry(attemptId: string): Promise<void> {
    // Eligibility is operational metadata, not a second submission claim. A
    // concurrent manual/sweep winner must never have its business row changed.
    // Bounded jitter gives an initial delay of 0.8–1.2s and a cap of 30s.
    const jitter = 0.8 + Math.random() * 0.4;
    await this.db.query(
      "lock.acquire",
      `
      WITH locked AS MATERIALIZED (
        SELECT
          id,
          expiry_retry_count
        FROM
          assessment.attempts
        WHERE
          id = $1
          AND status = 'IN_PROGRESS'
        FOR UPDATE SKIP LOCKED
      ), timed AS MATERIALIZED (
        SELECT
          locked.*,
          clock_timestamp() AS server_now
        FROM
          locked
      )
      UPDATE assessment.attempts AS attempt
      SET
        expiry_retry_count = LEAST(16, timed.expiry_retry_count + 1),
        expiry_retry_after = timed.server_now + (
          LEAST(30000::float8, 1000 * power(2, timed.expiry_retry_count) * $2::float8)
          * interval '1 millisecond'
        )
      FROM
        timed
      WHERE
        attempt.id = timed.id
      `,
      [attemptId, jitter],
    );
  }

  async dueBacklog(): Promise<{ due: number; oldestDueAgeMs: number | null }> {
    const row = (
      await this.db.query<{ due: number; oldestDueAgeMs: number | null }>(
        "assessment.read",
        `
        SELECT
          count(*)::int AS due,
          CASE
            WHEN min(deadline) IS NULL THEN NULL
            ELSE (extract(epoch FROM (clock_timestamp() - min(deadline))) * 1000)::float8
          END AS "oldestDueAgeMs"
        FROM
          assessment.attempts
        WHERE
          status = 'IN_PROGRESS'
          AND deadline <= statement_timestamp()
        `,
      )
    ).rows[0];
    return {
      due: Number(row?.due ?? 0),
      oldestDueAgeMs:
        row?.oldestDueAgeMs === null || row?.oldestDueAgeMs === undefined
          ? null
          : Number(row.oldestDueAgeMs),
    };
  }

  async insert(input: {
    id: string;
    userId: string;
    examId: string;
    publishedVersionId: string;
    startedAt: string;
    deadline: string;
    attemptLimit: number;
  }): Promise<AttemptRecord | null> {
    const row = (
      await this.db.query<AttemptRecord>(
        "assessment.write",
        `
        WITH
          quota AS (
            SELECT
              count(*)::int AS used
            FROM
              assessment.attempts
            WHERE
              user_id = $2
              AND exam_id = $3
          )
        INSERT INTO
          assessment.attempts (
            id,
            user_id,
            exam_id,
            version_id,
            status,
            started_at,
            deadline,
            revision
          )
        SELECT
          $1,
          $2,
          $3,
          $4,
          'IN_PROGRESS',
          $5::timestamptz,
          $6::timestamptz,
          1
        FROM
          quota
        WHERE
          quota.used < $7
        RETURNING
          ${attemptColumns}
        `,
        [
          input.id,
          input.userId,
          input.examId,
          input.publishedVersionId,
          input.startedAt,
          input.deadline,
          input.attemptLimit,
        ],
      )
    ).rows[0];
    return row ? record(row) : null;
  }

  async versions(
    attemptId: string,
    questionIds: readonly string[],
  ): Promise<{ questionId: string; version: number }[]> {
    const rows = (
      await this.db.query<{ questionId: string; version: number }>(
        "assessment.read",
        `
        SELECT
          question_id AS "questionId",
          version
        FROM
          assessment.answers
        WHERE
          attempt_id = $1
          AND question_id = ANY ($2::uuid[])
        `,
        [attemptId, [...questionIds]],
      )
    ).rows;
    return rows.map((row) => ({ questionId: row.questionId, version: Number(row.version) }));
  }

  async replaceAnswers(input: {
    attemptId: string;
    userId: string;
    publishedVersionId: string;
    answers: readonly AnswerWrite[];
  }): Promise<number | null> {
    const payload = JSON.stringify(
      input.answers.map((answer) => ({
        question_id: answer.questionId,
        version: answer.version,
        marked: answer.marked,
        option_ids: answer.optionIds,
      })),
    );
    const row = (
      await this.db.query<{ revision: number }>(
        "assessment.write",
        `
      WITH
        incoming AS MATERIALIZED (
          SELECT
            *
          FROM
            jsonb_to_recordset($4::jsonb) AS answer(
              question_id uuid,
              version integer,
              marked boolean,
              option_ids jsonb
            )
        ),
        cleared AS (
          DELETE FROM assessment.answer_selections
          WHERE
            attempt_id = $1
            AND question_id IN (SELECT question_id FROM incoming)
          RETURNING question_id
        ),
        saved AS (
          INSERT INTO
            assessment.answers (attempt_id, version_id, question_id, version, marked)
          SELECT
            $1,
            $3,
            incoming.question_id,
            incoming.version,
            incoming.marked
          FROM
            incoming
          CROSS JOIN (SELECT count(*) FROM cleared) AS cleared_barrier
          ON CONFLICT (attempt_id, question_id) DO UPDATE
          SET
            version = EXCLUDED.version,
            marked = EXCLUDED.marked,
            updated_at = clock_timestamp()
          RETURNING question_id
        ),
        selected AS (
          INSERT INTO
            assessment.answer_selections (attempt_id, version_id, question_id, option_id)
          SELECT
            $1,
            $3,
            incoming.question_id,
            option_id::uuid
          FROM
            incoming
            JOIN saved USING (question_id)
            CROSS JOIN LATERAL jsonb_array_elements_text(incoming.option_ids) AS option_id
          RETURNING question_id
        )
      UPDATE assessment.attempts
      SET
        revision = revision + 1
      WHERE
        id = $1
        AND user_id = $2
        AND status = 'IN_PROGRESS'
        AND (SELECT count(*) FROM saved) = (SELECT count(*) FROM incoming)
        AND (SELECT count(*) FROM selected) >= 0
      RETURNING
        revision
      `,
        [input.attemptId, input.userId, input.publishedVersionId, payload],
      )
    ).rows[0];
    return row ? Number(row.revision) : null;
  }

  async submit(input: {
    attemptId: string;
    userId: string;
    status: "SUBMITTED" | "EXPIRED";
    submittedAt: string;
    submissionId: string;
    eventId: string;
    expired: boolean;
    submissionKind: "MANUAL" | "DEADLINE";
  }): Promise<AttemptRecord | null> {
    const row = (
      await this.db.query<AttemptRecord>(
        "assessment.write",
        `
        UPDATE assessment.attempts
        SET
          status = $3,
          submitted_at = $4::timestamptz,
          submission_id = $5,
          submission_event_id = $6,
          expired = $7,
          submission_kind = $8,
          revision = revision + 1
        WHERE
          id = $1
          AND user_id = $2
          AND status = 'IN_PROGRESS'
        RETURNING
          ${attemptColumns}
        `,
        [
          input.attemptId,
          input.userId,
          input.status,
          input.submittedAt,
          input.submissionId,
          input.eventId,
          input.expired,
          input.submissionKind,
        ],
      )
    ).rows[0];
    return row ? record(row) : null;
  }
}
