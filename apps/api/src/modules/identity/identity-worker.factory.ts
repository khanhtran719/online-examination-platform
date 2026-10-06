import { CommonConfig } from "../../config/app.config";
import { PostgresDatabase } from "../../infrastructure/database/transaction/postgres-database";
import { PostgresSecurity } from "../../infrastructure/security/authorization/postgres-security";
import { VerificationWorker } from "./application/services/verification-worker";
import { PostgresVerificationDelivery } from "./infrastructure/persistence/postgres/delivery/postgres-verification-delivery";
import { createVerificationSecrets } from "./infrastructure/security/identity-runtime";
import { SesVerificationMail, SmtpVerificationMail } from "./infrastructure/mail/verification-mail";

export interface VerificationWorkerRuntime {
  runOnce(): Promise<boolean>;
  maintain(): Promise<void>;
  close(): void;
}
/** Public runtime composition: private adapters stay owned by Identity. */
export function createVerificationWorker(
  config: CommonConfig,
  db: PostgresDatabase,
  observe?: (event: { outcome: string; durationMs: number }) => void,
): VerificationWorkerRuntime {
  const mail =
    config.mail.adapter === "ses"
      ? new SesVerificationMail(config.mail.region, config.mail.from, config.mail.configurationSet)
      : new SmtpVerificationMail(config.mail.host, config.mail.port, config.mail.from);
  const delivery = new PostgresVerificationDelivery(db);
  const security = new PostgresSecurity(db, config.rateKey);
  const worker = new VerificationWorker(
    delivery,
    createVerificationSecrets(config.emailKeys.activeKid, config.emailKeys.keys),
    mail,
    config.origin,
    observe,
  );
  return {
    runOnce: () => worker.runOnce(),
    maintain: async () => {
      await delivery.cleanup();
      await security.purgeExpired();
    },
    close: () => mail.close(),
  };
}
