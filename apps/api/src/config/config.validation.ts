import { MailSettings } from "./app.config";
function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error("Invalid configuration");
  return n;
}
export interface RuntimeSettings {
  origin: string;
  port: number;
  workerConcurrency: number;
  mail: MailSettings;
  issuer: string;
  activeKid: string;
  passwordConcurrency: number;
  passwordMaxQueued: number;
  trustedProxies: string[];
  secretFiles: {
    email?: string;
    rate?: string;
    publicKeys?: string;
    signing?: string;
    csrf?: string;
  };
}
/** Pure validation: file/provider access occurs only at the infrastructure startup boundary. */
export function validateRuntimeSettings(
  env: Record<string, string | undefined>,
  mode: "api" | "worker",
): RuntimeSettings {
  const origin = new URL(env.PUBLIC_ORIGIN ?? "");
  if (
    origin.origin !== env.PUBLIC_ORIGIN ||
    origin.username ||
    origin.password ||
    !(
      origin.protocol === "https:" ||
      (env.NODE_ENV !== "production" &&
        origin.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(origin.hostname))
    )
  )
    throw new Error("Invalid origin");
  if (
    mode === "worker" &&
    (env.JWT_PRIVATE_KEY_FILE || env.JWT_ACTIVE_KID || env.JWT_PUBLIC_KEYS_FILE)
  )
    throw new Error("Worker must not receive signing credentials");
  const adapter = env.MAIL_ADAPTER;
  if (
    !["smtp", "ses"].includes(adapter ?? "") ||
    (env.NODE_ENV === "production" && adapter !== "ses")
  )
    throw new Error("Invalid mail adapter");
  const from = env.MAIL_FROM ?? "";
  if (!/^[\x21-\x7e]+@[^\s@]+\.[^\s@]+$/.test(from) || from.length > 254)
    throw new Error("Invalid sender");
  const region = env.AWS_REGION ?? "";
  if (adapter === "ses" && !/^[a-z]{2}-[a-z]+-\d$/.test(region))
    throw new Error("Invalid SES region");
  const trustedProxies =
    mode === "api" ? (env.TRUSTED_PROXY_CIDRS ?? "").split(",").filter(Boolean) : [];
  if (trustedProxies.some((value) => !/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(value)))
    throw new Error("Invalid trusted proxy CIDRs");
  return {
    origin: origin.origin,
    port: integer(env.PORT, mode === "api" ? 3000 : 3001, 1, 65535),
    workerConcurrency: integer(env.WORKER_CONCURRENCY, 2, 1, 8),
    mail: {
      adapter: adapter as "smtp" | "ses",
      host: env.SMTP_HOST ?? "127.0.0.1",
      port: integer(env.SMTP_PORT, 11025, 1, 65535),
      from,
      region,
      configurationSet: env.SES_CONFIGURATION_SET,
    },
    issuer: mode === "api" ? (env.JWT_ISSUER ?? "") : "",
    activeKid: mode === "api" ? (env.JWT_ACTIVE_KID ?? "") : "",
    passwordConcurrency: mode === "api" ? integer(env.PASSWORD_CONCURRENCY, 2, 1, 8) : 2,
    passwordMaxQueued: mode === "api" ? integer(env.PASSWORD_MAX_QUEUED, 8, 0, 32) : 8,
    trustedProxies,
    secretFiles: {
      email: env.EMAIL_KEYS_FILE,
      rate: env.RATE_KEY_FILE,
      ...(mode === "api"
        ? {
            publicKeys: env.JWT_PUBLIC_KEYS_FILE,
            signing: env.JWT_PRIVATE_KEY_FILE,
            csrf: env.CSRF_KEY_FILE,
          }
        : {}),
    },
  };
}
