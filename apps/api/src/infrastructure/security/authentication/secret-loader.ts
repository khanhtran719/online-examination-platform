import { readFile, stat } from "node:fs/promises";
import { ApiConfig, CommonConfig } from "../../../config/app.config";
import { validateRuntimeSettings } from "../../../config/config.validation";
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
    const settings = validateRuntimeSettings(env, mode);
    const common: CommonConfig = {
      origin: settings.origin,
      port: settings.port,
      workerConcurrency: settings.workerConcurrency,
      mail: settings.mail,
      emailKeys: emailKeys(JSON.parse(await secretFile(settings.secretFiles.email))),
      rateKey: await symmetric(settings.secretFiles.rate),
    };
    if (mode === "worker") return common;
    const ring = publicKeys(JSON.parse(await secretFile(settings.secretFiles.publicKeys)));
    const active = ring.find((key) => key.kid === settings.activeKid);
    if (!active) throw new Error("Absent active key");
    return {
      ...common,
      issuer: settings.issuer,
      activeKid: settings.activeKid,
      activePublicPem: active.publicPem,
      privatePem: await secretFile(settings.secretFiles.signing),
      publicKeys: ring,
      passwordConcurrency: settings.passwordConcurrency,
      passwordMaxQueued: settings.passwordMaxQueued,
      csrfKey: await symmetric(settings.secretFiles.csrf),
      trustedProxies: settings.trustedProxies,
    };
  } catch {
    throw new Error("Invalid runtime configuration");
  }
}
