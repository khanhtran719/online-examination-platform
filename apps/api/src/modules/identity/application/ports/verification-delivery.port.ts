export interface EmailJob {
  id: string;
  challengeId: string;
  email: string;
  ciphertext: string;
  leaseToken: string;
  attempts: number;
  expiresAt: number;
}
export interface VerificationDelivery {
  claim(): Promise<EmailJob | null>;
  usable(job: EmailJob): Promise<boolean>;
  delivered(job: EmailJob): Promise<void>;
  failed(job: EmailJob, code: string, retryable: boolean): Promise<void>;
  cleanup(): Promise<void>;
}
export interface VerificationMail {
  send(email: string, link: string): Promise<void>;
}
export class MailDeliveryError extends Error {
  constructor(readonly retryable: boolean) {
    super("Mail delivery failed");
  }
}
