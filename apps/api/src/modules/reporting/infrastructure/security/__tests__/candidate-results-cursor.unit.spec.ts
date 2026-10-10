import { randomBytes } from "node:crypto";
import { CandidateResultsCrypto } from "../candidate-results-cursor";
const root = randomBytes(32),
  now = Date.parse("2026-10-10T00:00:00.000Z");
const claims = { actorId: "actor", examId: "exam", versionId: "version", pageSize: 20 };
const state = {
  watermark: new Date(now).toISOString(),
  position: "00000000-0000-4000-8000-000000000001",
  expiresAt: now + 900000,
};
describe("Admin candidate-results opaque cursor", () => {
  it("works across replicas sharing the root without disclosing identity", () => {
    const token = new CandidateResultsCrypto(root).sign(claims, state);
    expect(token).not.toContain(state.position);
    expect(new CandidateResultsCrypto(root).read(token, claims, now)).toEqual(state);
  });
  it.each([{ actorId: "other" }, { examId: "other" }, { versionId: "other" }, { pageSize: 100 }])(
    "rejects scope substitution %j",
    (change) => {
      const crypto = new CandidateResultsCrypto(root),
        token = crypto.sign(claims, state);
      expect(() => crypto.read(token, { ...claims, ...change }, now)).toThrow();
    },
  );
  it("rejects expiry, root rotation and tampering", () => {
    const crypto = new CandidateResultsCrypto(root),
      token = crypto.sign(claims, state);
    expect(() => crypto.read(token, claims, state.expiresAt)).toThrow();
    expect(() => new CandidateResultsCrypto(randomBytes(32)).read(token, claims, now)).toThrow();
    expect(() => crypto.read("!" + token, claims, now)).toThrow();
  });
  it.each(["", "a".repeat(2049), "===="])("rejects malformed bounded token %s", (token) => {
    expect(() => new CandidateResultsCrypto(root).read(token, claims, now)).toThrow();
  });
});
