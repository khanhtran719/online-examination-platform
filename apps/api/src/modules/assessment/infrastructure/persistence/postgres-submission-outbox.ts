import type { PostgresDatabase } from "@infrastructure/database/transaction/postgres-database";

import type { SubmissionOutbox } from "../../application/ports/submission-outbox";
import type { SubmittedEvent } from "../../domain/assessment-policy";

/** Inserts the durable intent only. No queue client runs inside the submit transaction. */
export class PostgresSubmissionOutbox implements SubmissionOutbox {
  constructor(private readonly db: PostgresDatabase) {}

  async append(event: SubmittedEvent): Promise<void> {
    await this.db.query(
      "assessment.write",
      `
      INSERT INTO
        platform.outbox (event_id, aggregate_id, type, payload, correlation_id, causation_id)
      VALUES
        ($1, $2, $3, $4::jsonb, $5, $6)
      `,
      [
        event.eventId,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event),
        event.correlationId,
        event.causationId,
      ],
    );
  }
}
