import { randomBytes } from "node:crypto";
import { ActiveCandidatesCrypto } from "../active-candidates-cursor";
const claims = { actorId: "actor", examId: "exam", pageSize: 20 };
const state = {
  watermark: "2026-10-10T00:00:00.000Z",
  position: ["time", "id"] as [string, string],
  expiresAt: 2000,
};
describe("Active monitor cursor", () => {
  const root = randomBytes(32),
    crypto = new ActiveCandidatesCrypto(root);
  it("round-trips an opaque token across API instances with the same key", () => {
    const token = crypto.sign(claims, state);
    expect(new ActiveCandidatesCrypto(root).read(token, claims, 1000)).toEqual(state);
    expect(token).not.toContain(claims.actorId);
    expect(token).not.toContain(state.watermark);
  });
  it.each([{ actorId: "other" }, { examId: "other" }, { pageSize: 100 }])(
    "binds navigation scope %s",
    (change) => {
      expect(() => crypto.read(crypto.sign(claims, state), { ...claims, ...change }, 1000)).toThrow(
        "Invalid request",
      );
    },
  );
  it("rejects exact expiry, changed key and tampered ciphertext", () => {
    const token = crypto.sign(claims, state),
      packed = Buffer.from(token, "base64url");
    packed[28] = packed[28]! ^ 1;
    expect(() => crypto.read(token, claims, 2000)).toThrow("Invalid request");
    expect(() => new ActiveCandidatesCrypto(randomBytes(32)).read(token, claims, 1000)).toThrow(
      "Invalid request",
    );
    expect(() => crypto.read(packed.toString("base64url"), claims, 1000)).toThrow(
      "Invalid request",
    );
  });
  it.each(["", "a".repeat(2049), "bad.token", "AA"])(
    "bounds and validates malformed token %s",
    (token) => {
      expect(() => crypto.read(token, claims, 1000)).toThrow("Invalid request");
    },
  );
});
