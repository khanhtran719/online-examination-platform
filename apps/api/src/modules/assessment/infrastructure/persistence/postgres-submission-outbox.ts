import { PostgresDatabase } from "../../../../infrastructure/database/transaction/postgres-database";
import { SubmittedEvent } from "../../domain/assessment-policy";
import { SubmissionOutbox } from "../../application/ports/submission-outbox";

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
