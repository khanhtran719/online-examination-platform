import { IdempotencyStore, StoredReceipt } from "../../shared/application/ports/idempotency";
import { PostgresDatabase } from "../database/transaction/postgres-database";

export class PostgresIdempotency implements IdempotencyStore {
  constructor(private readonly db: PostgresDatabase) {}

  async find<T>(actorId: string, key: string): Promise<StoredReceipt<T> | null> {
    const row = (
      await this.db.query<{ fingerprint: Buffer; response: T }>(
        "idempotency.read",
        `
        SELECT
          fingerprint,
          response
        FROM
          platform.idempotency_receipts
        WHERE
          actor_id = $1
          AND key = $2
        `,
        [actorId, key],
      )
    ).rows[0];
    return row ?? null;
  }

  async save(input: {
    actorId: string;
    key: string;
    fingerprint: Uint8Array;
    operation: string;
    resourceId: string;
    httpStatus: number;
    response: object;
  }): Promise<void> {
    await this.db.query(
      "idempotency.write",
      `
      INSERT INTO
        platform.idempotency_receipts (
          actor_id,
          key,
          fingerprint,
          operation,
          resource_id,
          http_status,
          response
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        input.actorId,
        input.key,
        Buffer.from(input.fingerprint),
        input.operation,
        input.resourceId,
        input.httpStatus,
        JSON.stringify(input.response),
      ],
    );
  }
}
