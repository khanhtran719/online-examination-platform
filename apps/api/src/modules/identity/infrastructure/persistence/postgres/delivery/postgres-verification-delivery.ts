import { randomUUID } from "node:crypto";
import { PostgresDatabase } from "../../../../../../infrastructure/database/transaction/postgres-database";
import {
  EmailJob,
  VerificationDelivery,
} from "../../../../application/ports/verification-delivery.port";
export class PostgresVerificationDelivery implements VerificationDelivery {
  constructor(private readonly db: PostgresDatabase) {}
  async claim(): Promise<EmailJob | null> {
    return this.db.transaction(async () => {
      const r = await this.db.query<EmailJob>(
        "email.claim",
        `WITH next AS (
        SELECT i.id FROM identity.email_intents i JOIN identity.verification_challenges c ON c.id=i.challenge_id JOIN identity.users u ON u.id=c.user_id
        WHERE i.delivered_at IS NULL AND i.cancelled_at IS NULL AND i.parked_at IS NULL AND i.attempts<10
          AND i.available_at<=clock_timestamp() AND (i.lease_until IS NULL OR i.lease_until<=clock_timestamp())
          AND c.expires_at>clock_timestamp() AND c.consumed_at IS NULL AND c.cancelled_at IS NULL AND c.ciphertext IS NOT NULL AND u.enabled AND u.email_verified_at IS NULL
        ORDER BY i.available_at,i.id LIMIT 1 FOR UPDATE OF i SKIP LOCKED)
        UPDATE identity.email_intents i SET lease_token=$1,lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1
        FROM next,identity.verification_challenges c WHERE i.id=next.id AND c.id=i.challenge_id
        RETURNING i.id,c.id AS "challengeId",c.email,c.ciphertext,i.lease_token AS "leaseToken",i.attempts,extract(epoch FROM c.expires_at)*1000::float8 AS "expiresAt"`,
        [randomUUID()],
      );
      return r.rows[0] ?? null;
    });
  }
  async usable(job: EmailJob): Promise<boolean> {
    return Boolean(
      (
        await this.db.query(
          "identity.read",
          `SELECT i.id FROM identity.email_intents i JOIN identity.verification_challenges c ON c.id=i.challenge_id JOIN identity.users u ON u.id=c.user_id
    WHERE i.id=$1 AND i.lease_token=$2 AND i.lease_until>clock_timestamp() AND i.cancelled_at IS NULL AND i.delivered_at IS NULL AND i.parked_at IS NULL
    AND c.expires_at>clock_timestamp() AND c.consumed_at IS NULL AND c.cancelled_at IS NULL AND c.ciphertext IS NOT NULL AND u.email=c.email AND u.enabled AND u.email_verified_at IS NULL`,
          [job.id, job.leaseToken],
        )
      ).rowCount,
    );
  }
  async delivered(job: EmailJob): Promise<void> {
    await this.db.query(
      "identity.write",
      "UPDATE identity.email_intents SET delivered_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,failure_code=NULL WHERE id=$1 AND lease_token=$2 AND lease_until>clock_timestamp() AND cancelled_at IS NULL",
      [job.id, job.leaseToken],
    );
  }
  async failed(job: EmailJob, code: string, retryable: boolean): Promise<void> {
    const delay = Math.min(
      60000,
      1000 * 2 ** Math.max(0, job.attempts - 1) * (0.8 + Math.random() * 0.4),
    );
    await this.db.query(
      "identity.write",
      `UPDATE identity.email_intents i SET lease_token=NULL,lease_until=NULL,failure_code=$3,
    parked_at=CASE WHEN NOT $4::boolean OR i.attempts>=10 OR clock_timestamp()+$5*interval '1 millisecond'>=c.expires_at THEN clock_timestamp() ELSE NULL END,
    available_at=clock_timestamp()+$5*interval '1 millisecond' FROM identity.verification_challenges c
    WHERE i.id=$1 AND i.lease_token=$2 AND i.lease_until>clock_timestamp() AND i.cancelled_at IS NULL AND c.id=i.challenge_id`,
      [job.id, job.leaseToken, code, retryable, delay],
    );
  }
  async cleanup(): Promise<void> {
    // Bounded batches, no long transaction scanning the complete historical table.
    // Parking touches intents only and commits before any challenge lock is acquired.
    await this.db.query(
      "identity.write",
      `WITH exhausted AS (SELECT id FROM identity.email_intents WHERE attempts>=10 AND delivered_at IS NULL AND cancelled_at IS NULL AND parked_at IS NULL AND (lease_until IS NULL OR lease_until<=clock_timestamp()) LIMIT 500 FOR UPDATE SKIP LOCKED)
      UPDATE identity.email_intents i SET parked_at=clock_timestamp(),failure_code='RETRY_EXHAUSTED',lease_token=NULL,lease_until=NULL FROM exhausted WHERE i.id=exhausted.id`,
    );
    await this.db.transaction(async () => {
      await this.db.query(
        "identity.write",
        `WITH expired AS (SELECT id FROM identity.verification_challenges WHERE ciphertext IS NOT NULL AND (expires_at<=clock_timestamp() OR consumed_at IS NOT NULL OR cancelled_at IS NOT NULL) ORDER BY expires_at LIMIT 500 FOR UPDATE SKIP LOCKED)
      UPDATE identity.verification_challenges c SET ciphertext=NULL FROM expired WHERE c.id=expired.id`,
      );
      await this.db.query(
        "identity.write",
        `WITH invalid AS (SELECT i.id FROM identity.email_intents i JOIN identity.verification_challenges c ON c.id=i.challenge_id WHERE i.cancelled_at IS NULL AND i.delivered_at IS NULL AND (c.expires_at<=clock_timestamp() OR c.consumed_at IS NOT NULL OR c.cancelled_at IS NOT NULL) ORDER BY i.created_at LIMIT 500 FOR UPDATE OF i SKIP LOCKED)
      UPDATE identity.email_intents i SET cancelled_at=clock_timestamp() FROM invalid WHERE i.id=invalid.id`,
      );
    });
    // Security-definer maintenance is a separate short transaction: it locks users first.
    // API runtime cannot execute this function or purge arbitrary Identity rows.
    await this.db.query("identity.write", "SELECT identity.verification_maintenance()");
  }
}
