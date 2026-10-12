import { auditValues, validateAuditPosition } from "../audit";

const id = "00000000-0000-4000-8000-000000000001",
  at = "2026-10-10T00:00:00.000Z";
const row = {
  id,
  occurredAt: at,
  actorId: null,
  actorType: "SYSTEM",
  action: "platform.audit.prune",
  resourceType: "AUDIT_LOG",
  resourceId: null,
  outcome: "FAILURE",
  correlationId: id,
  changedFields: ["purgedRows", "PRIVATE_TOKEN", { token: "secret" }],
};
describe("Redacted audit projection and cursor invariants", () => {
  it("preserves null attribution/resource and maps durable FAILURE to FAILED", () =>
    expect(auditValues(row)).toEqual({
      ...row,
      actorType: "SYSTEM",
      outcome: "FAILED",
      reason: null,
      changedFields: ["purgedRows"],
    }));
  it("redacts unknown action/resource labels rather than echoing source text", () =>
    expect(auditValues({ ...row, action: "PRIVATE_TOKEN", resourceType: "private" })).toMatchObject(
      { action: "UNRECOGNIZED", resourceType: "UNSPECIFIED", reason: null },
    ));
  it("keeps safe changed-field names once and removes arbitrary payload values", () =>
    expect(
      auditValues({ ...row, changedFields: ["displayName", "displayName", "passwordHash", 123] })
        .changedFields,
    ).toEqual(["displayName", "passwordHash"]));
  it.each([
    ["catalog.import", "QUESTION_IMPORT"],
    ["assessment.outbox.replay", "SUBMISSION_EVENT"],
    ["assessment.receipts.prune", "RETENTION_BATCH"],
  ])("preserves existing source label %s/%s", (action, resourceType) =>
    expect(auditValues({ ...row, action, resourceType })).toMatchObject({ action, resourceType }),
  );
  it.each([
    { id: "bad" },
    { correlationId: "bad" },
    { actorId: "bad" },
    { resourceId: "bad" },
    { actorType: "INVALID" },
    { outcome: "FAILED" },
    { occurredAt: "0000-01-01T00:00:00.000Z" },
    { occurredAt: "infinity" },
    { changedFields: { body: "secret" } },
  ])("fails closed on invalid durable metadata %j", (patch) =>
    expect(() => auditValues({ ...row, ...patch })).toThrow("AUDIT_STATE_UNAVAILABLE"),
  );
  it("accepts exact bounded cursor time/id/expiry", () =>
    expect(
      validateAuditPosition({
        watermark: at,
        position: [at, id],
        expiresAt: Date.parse(at) + 900000,
      }),
    ).toBe(Date.parse(at)));
  it.each([
    { watermark: "bad" },
    { position: ["2026-10-10T00:00:01.000Z", id] },
    { position: [at, "bad"] },
    { expiresAt: 1 },
    { watermark: "0000-01-01T00:00:00.000Z" },
  ])("rejects impossible cursor %j", (patch) =>
    expect(() =>
      validateAuditPosition({
        watermark: at,
        position: [at, id],
        expiresAt: Date.parse(at) + 900000,
        ...patch,
      }),
    ).toThrow("Invalid request"),
  );
});
