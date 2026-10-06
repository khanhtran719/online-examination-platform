import { readFile, stat } from "node:fs/promises";

export interface MailSettings {
  adapter: "smtp" | "ses";
  host: string;
  port: number;
  from: string;
  region: string;
  configurationSet?: string;
}
export interface CommonConfig {
  origin: string;
  port: number;
  emailKeys: { activeKid: string; keys: Record<string, Buffer> };
  rateKey: Buffer;
  workerConcurrency: number;
  mail: MailSettings;
}
export interface ApiConfig extends CommonConfig {
  issuer: string;
  activeKid: string;
  activePublicPem: string;
  privatePem: string;
  publicKeys: { kid: string; publicPem: string }[];
  passwordConcurrency: number;
  passwordMaxQueued: number;
  csrfKey: Buffer;
  trustedProxies: string[];
}

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error("Invalid configuration");
  return n;
}
async function secretFile(path: string | undefined): Promise<string> {
  if (!path) throw new Error("Missing secret");
  const info = await stat(path);
  if (!info.isFile() || info.size > 65536 || (info.mode & 0o077) !== 0)
    throw new Error("Invalid secret file");
  return readFile(path, "utf8");
}
async function symmetric(path: string | undefined): Promise<Buffer> {
  const value = (await secretFile(path)).trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Invalid symmetric key");
  return Buffer.from(value, "base64url");
}
function emailKeys(parsed: unknown): { activeKid: string; keys: Record<string, Buffer> } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid email keyring");
  const record = parsed as { activeKid?: unknown; keys?: unknown };
  if (
    typeof record.activeKid !== "string" ||
    !record.keys ||
    typeof record.keys !== "object" ||
    Array.isArray(record.keys)
  )
    throw new Error("Invalid email keyring");
  const keys: Record<string, Buffer> = {};
  for (const [kid, key] of Object.entries(record.keys)) {
    if (typeof key !== "string") throw new Error("Invalid email keyring");
    keys[kid] = Buffer.from(key, "base64url");
  }
  return { activeKid: record.activeKid, keys };
}
function publicKeys(parsed: unknown): { kid: string; publicPem: string }[] {
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (key) =>
        !key ||
        typeof key !== "object" ||
        typeof (key as { kid?: unknown }).kid !== "string" ||
        typeof (key as { publicPem?: unknown }).publicPem !== "string",
    )
  )
    throw new Error("Invalid public keyring");
  return parsed as { kid: string; publicPem: string }[];
}

export async function loadRuntimeConfig(
  env: Record<string, string | undefined>,
  mode: "worker",
): Promise<CommonConfig>;
export async function loadRuntimeConfig(
  env: Record<string, string | undefined>,
  mode: "api",
): Promise<ApiConfig>;
export async function loadRuntimeConfig(
  env: Record<string, string | undefined>,
  mode: "api" | "worker",
): Promise<ApiConfig | CommonConfig> {
  try {
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
    const email = emailKeys(JSON.parse(await secretFile(env.EMAIL_KEYS_FILE)));
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
    const common: CommonConfig = {
      origin: origin.origin,
      port: integer(env.PORT, mode === "api" ? 3000 : 3001, 1, 65535),
      emailKeys: email,
      rateKey: await symmetric(env.RATE_KEY_FILE),
      workerConcurrency: integer(env.WORKER_CONCURRENCY, 2, 1, 8),
      mail: {
        adapter: adapter as "smtp" | "ses",
        host: env.SMTP_HOST ?? "127.0.0.1",
        port: integer(env.SMTP_PORT, 11025, 1, 65535),
        from,
        region,
        configurationSet: env.SES_CONFIGURATION_SET,
      },
    };
    if (mode === "worker") return common;
    const ring = publicKeys(JSON.parse(await secretFile(env.JWT_PUBLIC_KEYS_FILE)));
    const activeKid = env.JWT_ACTIVE_KID ?? "";
    const active = ring.find((key) => key.kid === activeKid);
    if (!active) throw new Error("Absent active key");
    const trustedProxies = (env.TRUSTED_PROXY_CIDRS ?? "").split(",").filter(Boolean);
    if (trustedProxies.some((value) => !/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(value)))
      throw new Error("Invalid trusted proxy CIDRs");
    return {
      ...common,
      issuer: env.JWT_ISSUER ?? "",
      activeKid,
      activePublicPem: active.publicPem,
      privatePem: await secretFile(env.JWT_PRIVATE_KEY_FILE),
      publicKeys: ring,
      passwordConcurrency: integer(env.PASSWORD_CONCURRENCY, 2, 1, 8),
      passwordMaxQueued: integer(env.PASSWORD_MAX_QUEUED, 8, 0, 32),
      csrfKey: await symmetric(env.CSRF_KEY_FILE),
      trustedProxies,
    };
  } catch {
    throw new Error("Invalid runtime configuration");
  }
}
