import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import {
  GradingFailureRepository,
  GradingFailureCode,
} from "../../application/ports/grading-failure-repository.port";
import { GradingAttempt } from "../../application/ports/grading-repository.port";
import { SubmittedEvent } from "../../domain/assessment-policy";
import { PostgresGradingRepository } from "./postgres-grading.repository";

export class PostgresGradingFailureRepository implements GradingFailureRepository {
  private readonly admission: PostgresGradingRepository;
  constructor(private readonly db: PostgresDatabase) {
    this.admission = new PostgresGradingRepository(db);
  }
  lock(id: string) {
    return this.admission.lock(id);
  }
  quarantine(digest: string, code: "INVALID_SCHEMA" | "SUBMISSION_MISMATCH") {
    return this.admission.quarantine(digest, code);
  }
  async recordFailure(
    attempt: GradingAttempt,
    event: SubmittedEvent,
    digest: string,
    code: GradingFailureCode,
  ): Promise<void> {
    const changed = await this.db.query(
      "assessment.write",
      `
      UPDATE assessment.attempts
      SET
        status = 'FAILED',
        replay_pending = false,
        failure_code = $2,
        revision = revision + 1
      WHERE
        id = $1
        AND grading_generation = $3
        AND (status IN ('SUBMITTED', 'EXPIRED') OR (status = 'FAILED' AND replay_pending))
    `,
      [attempt.id, code, attempt.gradingGeneration],
    );
    if (changed.rowCount !== 1) throw new Error("GRADING_STATE_UNAVAILABLE");
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO platform.quarantined_jobs (
        event_id,
        generation,
        attempt_id,
        failure_code,
        payload,
        body_digest
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6
      )
    `,
      [
        attempt.submissionEventId,
        attempt.gradingGeneration,
        attempt.id,
        code,
        JSON.stringify(event),
        digest,
      ],
    );
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO platform.audit_logs (
        id,
        actor_type,
        action,
        resource_type,
        resource_id,
        reason,
        correlation_id,
        outcome,
        changed_fields
      )
      VALUES (
        gen_random_uuid(),
        'SYSTEM',
        'assessment.grading.failed',
        'ATTEMPT',
        $1,
        $2,
        $3,
        'FAILURE',
        '["status","failureCode","replayPending"]'::jsonb
      )
    `,
      [attempt.id, code, event.correlationId],
    );
  }
  async replay(
    attempt: string,
    revision: number,
    operator: string,
    reason: string,
    correlation: string,
  ): Promise<{ revision: number; generation: number; replayPending: boolean }> {
    const result = await this.db.query<{
      revision: number;
      generation: number;
      replayPending: boolean;
    }>(
      "assessment.write",
      `
        SELECT
          revision,
          generation,
          replay_pending AS "replayPending"
        FROM
          assessment.operator_replay_grading($1, $2, $3, $4, $5)
      `,
      [attempt, revision, operator, reason, correlation],
    );
    if (!result.rows[0]) throw new Error("REPLAY_NOT_ACCEPTED");
    return result.rows[0];
  }
}
