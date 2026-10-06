import { IdempotencyKeyExpiredError, invalidRequest, unauthenticated } from "./errors";
export function requireLogin(account: { enabled: boolean; emailVerifiedAt: number | null }): void {
  if (!account.enabled || account.emailVerifiedAt === null) throw unauthenticated();
}
export function requireActivation(
  challenge: { email: string; expiresAt: number; cancelled: boolean },
  email: string,
  now: number,
): void {
  if (challenge.cancelled || challenge.email !== email || challenge.expiresAt <= now)
    throw invalidRequest();
}
export function requireFreshKey(key: string, now: number): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
    throw invalidRequest();
  const time = Number.parseInt(key.slice(0, 8) + key.slice(9, 13), 16);
  if (time > now + 300000) throw invalidRequest();
  if (time < now - 86400000) throw new IdempotencyKeyExpiredError();
}

const dayMs = 86400000;

export function verificationDeadline(now: number): number {
  return now + 30 * 60 * 1000;
}

export function canRequestVerification(
  account: { enabled: boolean; emailVerifiedAt: number | null; createdAt: number },
  now: number,
): boolean {
  return account.enabled && account.emailVerifiedAt === null && account.createdAt + 7 * dayMs > now;
}

export function absoluteSessionExpiry(now: number): number {
  return Math.floor(now / 1000) * 1000 + 30 * dayMs;
}
