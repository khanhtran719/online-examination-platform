import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import {
  DispatchBacklog,
  SubmissionClaim,
  SubmissionDispatch,
  SubmissionReplay,
} from "../../application/ports/submission-dispatch.port";

export class PostgresSubmissionDispatch implements SubmissionDispatch, SubmissionReplay {
  constructor(private readonly db: PostgresDatabase) {}
  async claim(limit: number, leaseMs: number): Promise<SubmissionClaim[]> {
    this.db.assertOutsideTransaction();
    // One atomic statement/autocommit. Returned rows cannot precede COMMIT ACK.
    return (
      await this.db.query<SubmissionClaim & Record<string, unknown>>(
        "outbox.claim",
        claimSubmissionSql,
        [limit, leaseMs],
      )
    ).rows;
  }

  async delivered(claim: SubmissionClaim): Promise<boolean> {
    return this.db.transaction(async () => {
      if (!(await this.lockClaim(claim))) return false;
      const result = await this.db.query(
        "outbox.ack",
        `
      UPDATE platform.outbox
      SET
        delivered_at = clock_timestamp(),
        lease_token = NULL,
        lease_until = NULL,
        failure_code = NULL
      WHERE
        event_id = $1
        AND lease_token = $2
        AND lease_until > clock_timestamp()
        AND delivered_at IS NULL
        AND parked_at IS NULL
    `,
        [claim.eventId, claim.token],
      );
      return result.rowCount === 1;
    });
  }

  async failed(
    claim: SubmissionClaim,
    code: string,
    delay: number,
    park: boolean,
  ): Promise<boolean> {
    return this.db.transaction(async () => {
      if (!(await this.lockClaim(claim))) return false;
      const result = await this.db.query(
        "outbox.ack",
        `
      UPDATE platform.outbox
      SET
        available_at = clock_timestamp() + ($3::integer * interval '1 millisecond'),
        parked_at = CASE WHEN $4::boolean THEN clock_timestamp() ELSE NULL END,
        failure_code = $5,
        lease_token = NULL,
        lease_until = NULL
      WHERE
        event_id = $1
        AND lease_token = $2
        AND lease_until > clock_timestamp()
        AND delivered_at IS NULL
        AND parked_at IS NULL
    `,
        [claim.eventId, claim.token, delay, park, code],
      );
      return result.rowCount === 1;
    });
  }

  private async lockClaim(claim: SubmissionClaim): Promise<boolean> {
    const result = await this.db.query(
      "lock.acquire",
      `
      SELECT
        event_id
      FROM
        platform.outbox
      WHERE
        event_id = $1
        AND lease_token = $2
      FOR UPDATE
    `,
      [claim.eventId, claim.token],
    );
    return result.rowCount === 1;
  }

  async backlog(): Promise<DispatchBacklog> {
    const result = await this.db.query<DispatchBacklog & Record<string, unknown>>(
      "outbox.read",
      `
      SELECT
        count(*) FILTER (WHERE parked_at IS NULL)::integer AS pending,
        count(*) FILTER (WHERE parked_at IS NOT NULL)::integer AS parked,
        coalesce(extract(epoch FROM (
          statement_timestamp() - min(created_at) FILTER (WHERE parked_at IS NULL)
        )) * 1000, 0)::float8 AS "oldestPendingAgeMs"
      FROM
        platform.outbox
      WHERE
        delivered_at IS NULL
    `,
    );
    return result.rows[0]!;
  }

  async replay(
    event: string,
    operator: string,
    reason: string,
    correlation: string,
  ): Promise<void> {
    await this.db.query(
      "outbox.ack",
      "SELECT platform.operator_replay_submission($1, $2, $3, $4)",
      [event, operator, reason, correlation],
    );
  }
}

export const claimSubmissionSql = `
  WITH ready AS (
    SELECT
      event_id
    FROM
      platform.outbox
    WHERE
      delivered_at IS NULL
      AND parked_at IS NULL
      AND available_at <= statement_timestamp()
      AND (lease_until IS NULL OR lease_until <= statement_timestamp())
    ORDER BY
      available_at,
      created_at,
      event_id
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE platform.outbox o
  SET
    attempts = least(o.attempts, 1000) + 1,
    lease_token = gen_random_uuid(),
    lease_until = clock_timestamp() + ($2::integer * interval '1 millisecond')
  FROM
    ready
  WHERE
    o.event_id = ready.event_id
  RETURNING
    o.event_id AS "eventId",
    o.aggregate_id AS "aggregateId",
    o.correlation_id AS "correlationId",
    o.causation_id AS "causationId",
    o.payload,
    o.lease_token AS token,
    o.attempts,
    (extract(epoch FROM (clock_timestamp() - coalesce(o.replay_at, o.created_at))) * 1000)::float8
      AS "ageMs"
`;
