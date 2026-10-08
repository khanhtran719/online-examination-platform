import { expiryWorkerConfig } from "../expiry-worker.config";

describe("expiryWorkerConfig", () => {
  it("defaults to a five second poll and does not require identity secrets", () => {
    const config = expiryWorkerConfig({});
    expect(config).toEqual({
      pollIntervalMs: 5000,
      batchSize: 50,
      jitterPercent: 20,
      backoffInitialMs: 200,
      backoffMaxMs: 30_000,
      healthPort: 3017,
    });
  });

  it("rejects a tight poll and a backoff ceiling below its start", () => {
    expect(() => expiryWorkerConfig({ EXPIRY_POLL_INTERVAL_MS: "0" })).toThrow(
      "Invalid EXPIRY_POLL_INTERVAL_MS",
    );
    expect(() =>
      expiryWorkerConfig({ EXPIRY_BACKOFF_INITIAL_MS: "5000", EXPIRY_BACKOFF_MAX_MS: "1000" }),
    ).toThrow("Invalid EXPIRY_BACKOFF_MAX_MS");
  });
});
