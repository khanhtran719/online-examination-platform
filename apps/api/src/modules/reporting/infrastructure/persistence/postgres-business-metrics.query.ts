import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { BusinessMetricCounters } from "../../domain/business-metrics";
import { BusinessMetricsQuery } from "../../application/ports/business-metrics.query";
export class PostgresBusinessMetricsQuery implements BusinessMetricsQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async snapshot(input: Parameters<BusinessMetricsQuery["snapshot"]>[0]) {
    const result = await this.db.query<
      BusinessMetricCounters & { asOf: Date; from: Date; to: Date; oldestSubmittedAt: Date | null }
    >(
      "reporting.read",
      `
    WITH
      clock AS MATERIALIZED (
        SELECT
          date_trunc('milliseconds', statement_timestamp()) AS now
      ),
      bounds AS MATERIALIZED (
        SELECT
          now,
          coalesce($1::timestamptz, now - interval '24 hours') AS since,
          coalesce($2::timestamptz, now) AS until
        FROM
          clock
      ),
      source AS (
        SELECT
          a.status,
          a.expired,
          a.deadline,
          a.submitted_at,
          a.replay_pending,
          a.status <> 'CREATED'
            AND a.started_at >= b.since
            AND a.started_at < b.until AS cohort,
          a.submitted_at IS NOT NULL
            AND (
              a.status IN ('SUBMITTED', 'EXPIRED', 'PROCESSING')
              OR (
                a.status = 'FAILED'
                AND a.replay_pending
              )
            ) AS pending
        FROM
          assessment.attempts a
          CROSS JOIN bounds b
        WHERE
          b.until <= b.now
          AND a.started_at <= b.now
          AND (
            a.submitted_at IS NULL
            OR a.submitted_at <= b.now
          )
      )
    SELECT
      b.now AS "asOf",
      b.since AS "from",
      b.until AS "to",
      totals.*
    FROM
      bounds b
      CROSS JOIN LATERAL (
        SELECT
          count(*) FILTER (WHERE s.cohort)::text AS "startedAttempts",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.status = 'IN_PROGRESS'
              AND s.deadline > b.now
          )::text AS "activeAttempts",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.submitted_at IS NOT NULL
          )::text AS "submittedAttempts",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.status = 'COMPLETED'
          )::text AS "completedAttempts",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.status = 'FAILED'
          )::text AS "failedAttempts",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.submitted_at IS NOT NULL
              AND s.expired
          )::text AS "expiredSubmissions",
          count(*) FILTER (
            WHERE
              s.cohort
              AND s.status = 'COMPLETED'
              AND s.expired
          )::text AS "expiredCompletedAttempts",
          count(*) FILTER (WHERE s.pending)::text AS "pendingAttempts",
          count(*) FILTER (
            WHERE
              s.pending
              AND s.status = 'FAILED'
              AND s.replay_pending
          )::text AS "replayPendingAttempts",
          min(s.submitted_at) FILTER (WHERE s.pending) AS "oldestSubmittedAt"
        FROM
          source s
      ) totals
    `,
      [input.from, input.to],
    );
    const row = result.rows[0]!;
    const { asOf, from, to, oldestSubmittedAt, ...counts } = row;
    return {
      asOf: asOf.toISOString(),
      from: from.toISOString(),
      to: to.toISOString(),
      counts,
      oldestSubmittedAt: oldestSubmittedAt?.toISOString() ?? null,
    };
  }
}
