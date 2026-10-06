import {
  absoluteSessionExpiry,
  canRequestVerification,
  requireActivation,
  requireFreshKey,
  requireLogin,
  verificationDeadline,
} from "../identity-policy";

describe("Identity activation/session policy", () => {
  it("requires an enabled verified account for password session creation", () => {
    expect(() => requireLogin({ enabled: true, emailVerifiedAt: null })).toThrow("Unauthenticated");
    expect(() => requireLogin({ enabled: false, emailVerifiedAt: 1 })).toThrow("Unauthenticated");
    expect(() => requireLogin({ enabled: true, emailVerifiedAt: 1 })).not.toThrow();
  });
  it("uses post-lock time and rejects cancelled, changed-email or expired activation", () => {
    const challenge = { email: "a@example.test", expiresAt: 100, cancelled: false };
    expect(() => requireActivation(challenge, "a@example.test", 99)).not.toThrow();
    for (const [email, now, cancelled] of [
      ["a@example.test", 100, false],
      ["b@example.test", 99, false],
      ["a@example.test", 99, true],
    ] as const)
      expect(() => requireActivation({ ...challenge, cancelled }, email, now)).toThrow(
        "Invalid request",
      );
  });
  it("rejects stale first-use keys and distinguishes a malformed/future key", () => {
    const now = Date.now();
    const key = (time: number) =>
      `${time.toString(16).padStart(12, "0").slice(0, 8)}-${time.toString(16).padStart(12, "0").slice(8)}-7000-8000-000000000001`;
    expect(() => requireFreshKey(key(now), now)).not.toThrow();
    expect(() => requireFreshKey(key(now - 86400001), now)).toThrow("Idempotency key expired");
    expect(() => requireFreshKey(key(now + 300001), now)).toThrow("Invalid request");
    expect(() => requireFreshKey("random", now)).toThrow("Invalid request");
  });
  it("keeps the verification window, link lifetime and absolute session bound", () => {
    const account = { enabled: true, emailVerifiedAt: null as number | null, createdAt: 1_000 };
    expect(canRequestVerification(account, account.createdAt + 7 * 86400000 - 1)).toBe(true);
    expect(canRequestVerification(account, account.createdAt + 7 * 86400000)).toBe(false);
    expect(canRequestVerification({ ...account, enabled: false }, account.createdAt)).toBe(false);
    expect(canRequestVerification({ ...account, emailVerifiedAt: 1 }, account.createdAt)).toBe(
      false,
    );
    expect(verificationDeadline(1_000)).toBe(1_800_000 + 1_000);
    expect(absoluteSessionExpiry(1_500)).toBe(1_000 + 30 * 86400000);
  });
});
