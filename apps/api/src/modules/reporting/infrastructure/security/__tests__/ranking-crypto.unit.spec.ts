import { RankingCrypto } from "../ranking-crypto";
const key = Buffer.alloc(32, 7);
const claims = { actorId: "actor", examId: "exam", versionId: "version", pageSize: 20 };
const state = {
  watermark: "9223372036854775807",
  epoch: "2",
  expiresAt: 1000,
  position: ["10", "2026-10-09T13:00:00.000Z", "private-attempt"] as [string, string, string],
};
describe("Ranking aliases and opaque authenticated cursors", () => {
  it("keeps aliases stable per key/version and unlinkable across versions", () => {
    const c = new RankingCrypto(key);
    expect(c.alias("version", "private-user")).toMatch(/^candidate-[0-9a-f]{24}$/);
    expect(c.alias("version", "private-user")).toBe(
      new RankingCrypto(key).alias("version", "private-user"),
    );
    expect(c.alias("other", "private-user")).not.toBe(c.alias("version", "private-user"));
    expect(new RankingCrypto(Buffer.alloc(32, 8)).alias("version", "private-user")).not.toBe(
      c.alias("version", "private-user"),
    );
  });
  it("round-trips opaque randomized tokens without exposing identities/order fields", () => {
    const c = new RankingCrypto(key),
      token = c.sign(claims, state);
    expect(token.length).toBeLessThan(2048);
    expect(c.read(token, claims, 999)).toEqual(state);
    expect(c.sign(claims, state)).not.toBe(token);
    expect(Buffer.from(token, "base64url").toString()).not.toMatch(/private-|actor|version/);
  });
  it.each(["actorId", "examId", "versionId", "pageSize"] as const)(
    "rejects changed %s scope",
    (field) => {
      const c = new RankingCrypto(key),
        token = c.sign(claims, state);
      expect(() =>
        c.read(token, { ...claims, [field]: field === "pageSize" ? 10 : "other" }, 0),
      ).toThrow("Invalid request");
    },
  );
  it("rejects expiry, tampering, invalid key and oversized tokens", () => {
    const c = new RankingCrypto(key),
      token = c.sign(claims, state);
    expect(() => c.read(token, claims, 1000)).toThrow("Invalid request");
    expect(() =>
      c.read(token.slice(0, 10) + (token[10] === "A" ? "B" : "A") + token.slice(11), claims, 0),
    ).toThrow("Invalid request");
    expect(() => new RankingCrypto(Buffer.alloc(32, 8)).read(token, claims, 0)).toThrow(
      "Invalid request",
    );
    expect(() => c.read("a".repeat(2049), claims, 0)).toThrow("Invalid request");
    expect(() => new RankingCrypto(Buffer.alloc(31))).toThrow();
  });
});
