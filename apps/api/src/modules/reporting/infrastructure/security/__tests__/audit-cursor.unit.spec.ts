import { AuditCrypto } from "../audit-cursor";
import { SubmissionsCrypto } from "../submissions-cursor";
const id = "00000000-0000-4000-8000-000000000001",
  watermark = "2026-10-10T00:00:00.000Z",
  now = Date.parse(watermark),
  root = Buffer.alloc(32, 4),
  claims = { actorId: id, pageSize: 20 },
  state = { watermark, position: [watermark, id] as [string, string], expiresAt: now + 900000 };
describe("Actor-bound audit cursor", () => {
  it("round trips without exposing source position", () => {
    const crypto = new AuditCrypto(root),
      token = crypto.sign(claims, state);
    expect(token).not.toContain(id);
    expect(crypto.read(token, claims, now)).toEqual(state);
  });
  it.each([
    { actorId: "other", pageSize: 20 },
    { actorId: id, pageSize: 100 },
  ])("rejects changed request scope %j", (other) => {
    const c = new AuditCrypto(root);
    expect(() => c.read(c.sign(claims, state), other, now)).toThrow("Invalid request");
  });
  it("expires at the exact boundary", () => {
    const c = new AuditCrypto(root);
    expect(() => c.read(c.sign(claims, state), claims, state.expiresAt)).toThrow("Invalid request");
  });
  it("rejects tampered/noncanonical/oversized tokens", () => {
    const c = new AuditCrypto(root),
      t = c.sign(claims, state);
    for (const s of [t.slice(0, -1) + "!", t + "=", "a".repeat(2049), "abc"])
      expect(() => c.read(s, claims, now)).toThrow("Invalid request");
  });
  it("rejects another cursor purpose using the same root", () => {
    const c = new AuditCrypto(root),
      s = new SubmissionsCrypto(root);
    expect(() =>
      c.read(s.sign({ ...claims, examId: id, publishedVersionId: null }, state), claims, now),
    ).toThrow("Invalid request");
  });
});
