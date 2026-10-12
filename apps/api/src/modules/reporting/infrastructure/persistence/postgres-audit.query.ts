import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { AuditSource } from "../../domain/audit";
import { AuditQuery } from "../../application/ports/audit.query";
export class PostgresAuditQuery implements AuditQuery {
  constructor(private readonly db: PostgresDatabase) {}
  async page(input: Parameters<AuditQuery["page"]>[0]) {
    const r = await this.db.query<
      Omit<AuditSource, "occurredAt"> & { occurredAt: Date | null; serverNow: Date }
    >(
      "reporting.read",
      `
    WITH clock AS MATERIALIZED (
      SELECT
        date_trunc('milliseconds', statement_timestamp()) AS now
    )
    SELECT
      c.now AS "serverNow",
      p.*
    FROM
      clock c
      LEFT JOIN LATERAL (
        SELECT
          a.id,
          a.occurred_at AS "occurredAt",
          a.actor_id AS "actorId",
          a.actor_type AS "actorType",
          a.action,
          a.resource_type AS "resourceType",
          a.resource_id AS "resourceId",
          a.outcome,
          a.correlation_id AS "correlationId",
          a.changed_fields AS "changedFields"
        FROM
          platform.audit_logs a
        WHERE
          a.occurred_at <= coalesce($1::timestamptz, c.now)
          AND (
            $2::timestamptz IS NULL
            OR (a.occurred_at, a.id) < ($2::timestamptz, $3::uuid)
          )
        ORDER BY
          a.occurred_at DESC,
          a.id DESC
        LIMIT
          $4
      ) p ON TRUE
    ORDER BY
      p."occurredAt" DESC,
      p.id DESC
  `,
      [input.watermark, input.position?.[0] ?? null, input.position?.[1] ?? null, input.limit],
    );
    return {
      serverNow: r.rows[0]!.serverNow.toISOString(),
      rows: r.rows
        .filter((row) => row.id !== null)
        .map(({ serverNow: _now, occurredAt, ...row }) => ({
          ...row,
          occurredAt: occurredAt!.toISOString(),
        })),
    };
  }
}
