import { auditRetentionConfig } from "@config/audit-retention.config";

describe("Audit maintenance configuration", () => {
  it("defaults off with bounded500 rows", () =>
    expect(auditRetentionConfig({})).toEqual({ enabled: false, batch: 500 }));
  it.each(["0", "1001", "1.5", "NaN"])("rejects batch %s", (batch) =>
    expect(() => auditRetentionConfig({ AUDIT_RETENTION_BATCH: batch })).toThrow(
      "Invalid audit retention batch",
    ),
  );
  it("rejects ambiguous enable values", () =>
    expect(() => auditRetentionConfig({ AUDIT_RETENTION_ENABLED: "yes" })).toThrow(
      "Invalid audit retention flag",
    ));
});
