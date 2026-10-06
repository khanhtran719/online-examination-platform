import { VerificationSecrets } from "../ports/identity-crypto.ports";
import {
  MailDeliveryError,
  VerificationDelivery,
  VerificationMail,
} from "../ports/verification-delivery.port";
export class VerificationWorker {
  constructor(
    private readonly delivery: VerificationDelivery,
    private readonly secrets: VerificationSecrets,
    private readonly mail: VerificationMail,
    private readonly origin: string,
    private readonly observe: (event: { outcome: string; durationMs: number }) => void = () =>
      undefined,
  ) {}
  async runOnce(): Promise<boolean> {
    const job = await this.delivery.claim();
    if (!job) return false;
    const started = Date.now();
    let outcome = "skipped";
    try {
      if (!(await this.delivery.usable(job))) return true;
      let token: string;
      try {
        token = await this.secrets.open(job.ciphertext, job.challengeId);
      } catch {
        await this.delivery.failed(job, "DELIVERY_MATERIAL_INVALID", false);
        outcome = "parked";
        return true;
      }
      if (!(await this.delivery.usable(job))) return true;
      await this.mail.send(job.email, `${this.origin}/verify-email#token=${token}`);
      await this.delivery.delivered(job);
      outcome = "accepted";
    } catch (error) {
      const retryable = error instanceof MailDeliveryError ? error.retryable : true;
      await this.delivery.failed(job, "PROVIDER_UNAVAILABLE", retryable);
      outcome = retryable ? "retry" : "parked";
    } finally {
      try {
        this.observe({ outcome, durationMs: Date.now() - started });
      } catch {
        /* Observer cannot affect delivery. */
      }
    }
    return true;
  }
}
