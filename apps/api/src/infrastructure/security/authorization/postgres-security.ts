import { createHmac, randomUUID } from "node:crypto";
import {
  AuditRecord,
  SecurityControls,
  SecurityMaintenance,
} from "../../../shared/application/ports/security";
import { PostgresDatabase } from "../../database/transaction/postgres-database";
export class PostgresSecurity implements SecurityControls, SecurityMaintenance {
  constructor(
    private readonly db: PostgresDatabase,
    private readonly key: Buffer,
  ) {
    if (key.length !== 32) throw new Error("Invalid rate key");
  }
  rateSubject(scope: string, value: string): Buffer {
    return createHmac("sha256", this.key)
      .update(scope + "\0" + value)
      .digest();
  }
  async audit(r: AuditRecord): Promise<void> {
    await this.db.query(
      "audit.write",
      `
      INSERT INTO
        platform.audit_logs (
          id,
          actor_id,
          action,
          resource_id,
          resource_type,
          correlation_id,
          outcome,
          changed_fields
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, 'SUCCESS', $7)
      `,
      [
        randomUUID(),
        r.actorId,
        r.action,
        r.resourceId,
        r.resourceType,
        r.correlationId,
        JSON.stringify(r.changedFields ?? []),
      ],
    );
  }
  async allow(scope: string, subject: string, intervalMs: number, burst: number): Promise<boolean> {
    const r = await this.db.query(
      "security.rate",
      `
      INSERT INTO
        platform.request_limits (scope, subject_hash, theoretical_at, expires_at)
      VALUES
        (
          $1,
          $2,
          clock_timestamp() + $3 * interval '1 millisecond',
          clock_timestamp() + $3 * $4 * interval '1 millisecond' + interval '1 hour'
        )
      ON CONFLICT (scope, subject_hash) DO UPDATE
      SET
        theoretical_at = greatest(
          platform.request_limits.theoretical_at,
          clock_timestamp()
        ) + $3 * interval '1 millisecond',
        expires_at = clock_timestamp() + $3 * $4 * interval '1 millisecond' + interval '1 hour'
      WHERE
        platform.request_limits.theoretical_at <= clock_timestamp()
          + ($4 - 1) * $3 * interval '1 millisecond'
      RETURNING
        scope
      `,
      [scope, this.rateSubject(scope, subject), intervalMs, burst],
    );
    return Boolean(r.rowCount);
  }
  async reserveLogin(email: string): Promise<string | null> {
    const hash = this.rateSubject("login.failure", email);
    return this.db.transaction(async () => {
      // A new statement after the lock sees preceding commits under READ COMMITTED.
      await this.db.query("lock.acquire", "SELECT pg_advisory_xact_lock($1, $2)", [
        hash.readInt32BE(0),
        hash.readInt32BE(4),
      ]);
      const { allowed } = (
        await this.db.query<{ allowed: boolean }>(
          "security.rate",
          `
          SELECT
            coalesce(sum(count), 0) < 5 AS allowed
          FROM
            platform.rate_limit_buckets
          WHERE
            scope = 'login.failure'
            AND subject_hash = $1
            AND expires_at > clock_timestamp()
          `,
          [hash],
        )
      ).rows[0]!;
      if (!allowed) return null;
      const row = (
        await this.db.query<{ window: Date }>(
          "security.rate",
          `
          INSERT INTO
            platform.rate_limit_buckets (scope, subject_hash, window_start, expires_at, count)
          VALUES
            (
              'login.failure',
              $1,
              date_trunc('minute', clock_timestamp()),
              clock_timestamp() + interval '15 minutes',
              1
            )
          ON CONFLICT (scope, subject_hash, window_start) DO UPDATE
          SET
            count = platform.rate_limit_buckets.count + 1,
            expires_at = greatest(
              platform.rate_limit_buckets.expires_at,
              clock_timestamp() + interval '15 minutes'
            )
          RETURNING
            window_start AS window
          `,
          [hash],
        )
      ).rows[0]!;
      return row.window.toISOString();
    });
  }
  async releaseLogin(email: string, window: string): Promise<void> {
    const hash = this.rateSubject("login.failure", email);
    await this.db.transaction(async () => {
      await this.db.query("lock.acquire", "SELECT pg_advisory_xact_lock($1, $2)", [
        hash.readInt32BE(0),
        hash.readInt32BE(4),
      ]);
      await this.db.query(
        "security.rate",
        `
        DELETE FROM platform.rate_limit_buckets
        WHERE
          scope = 'login.failure'
          AND subject_hash = $1
          AND window_start = $2
          AND count = 1
        `,
        [hash, window],
      );
      await this.db.query(
        "security.rate",
        `
        UPDATE platform.rate_limit_buckets
        SET
          count = count - 1
        WHERE
          scope = 'login.failure'
          AND subject_hash = $1
          AND window_start = $2
          AND count > 1
        `,
        [hash, window],
      );
    });
  }
  async purgeExpired(): Promise<void> {
    await this.db.transaction(async () => {
      await this.db.query(
        "security.rate",
        `
        DELETE FROM platform.request_limits
        WHERE
          (scope, subject_hash) IN (
            SELECT
              scope,
              subject_hash
            FROM
              platform.request_limits
            WHERE
              expires_at < clock_timestamp()
            LIMIT
              500
          )
        `,
      );
      await this.db.query(
        "security.rate",
        `
        DELETE FROM platform.rate_limit_buckets
        WHERE
          (scope, subject_hash, window_start) IN (
            SELECT
              scope,
              subject_hash,
              window_start
            FROM
              platform.rate_limit_buckets
            WHERE
              expires_at < clock_timestamp()
            LIMIT
              500
          )
        `,
      );
    });
  }
}
