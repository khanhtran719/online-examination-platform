import { assessmentRetentionConfig } from "../assessment-retention.config";
describe("One-shot retention admission", () => {
  it("is disabled by default and has finite batches", () => {
    expect(assessmentRetentionConfig({})).toEqual({
      enabled: false,
      receiptBatch: 500,
      attemptBatch: 10,
    });
  });
  it("requires an explicit boolean enable flag", () => {
    expect(() => assessmentRetentionConfig({ ASSESSMENT_RETENTION_ENABLED: "yes" })).toThrow();
    expect(assessmentRetentionConfig({ ASSESSMENT_RETENTION_ENABLED: "true" }).enabled).toBe(true);
  });
  it.each(["0", "1001", "1.5", "NaN", "Infinity", "-1"])("rejects receipt batch %s", (value) => {
    expect(() =>
      assessmentRetentionConfig({ ASSESSMENT_RETENTION_RECEIPT_BATCH: value }),
    ).toThrow();
  });
  it("does not allow retention policy ages to be reduced through environment", () => {
    expect(assessmentRetentionConfig({ ATTEMPT_RETENTION_DAYS: "1" })).toEqual(
      assessmentRetentionConfig({}),
    );
    expect(() => assessmentRetentionConfig({ ASSESSMENT_RETENTION_ATTEMPT_BATCH: "51" })).toThrow();
  });
});
