import { dispatchWorkerConfig } from "../dispatch-worker.config";

const env = {
  NODE_ENV: "production",
  AWS_REGION: "us-east-1",
  SUBMISSION_QUEUE_URL: "https://sqs.us-east-1.amazonaws.com/123456789012/submissions",
};

describe("isolated dispatch worker configuration", () => {
  it("accepts production settings without Identity/JWT/mail secrets", () => {
    expect(dispatchWorkerConfig(env)).toMatchObject({
      region: "us-east-1",
      concurrency: 4,
      timeoutMs: 5000,
      leaseMs: 15000,
      maxAttempts: 10,
      maxAgeMs: 86400000,
    });
  });
  it.each([
    { SUBMISSION_QUEUE_URL: env.SUBMISSION_QUEUE_URL + ".fifo" },
    { SUBMISSION_QUEUE_URL: "http://sqs.us-east-1.amazonaws.com/123456789012/submissions" },
    { SUBMISSION_QUEUE_URL: "https://sqs.eu-west-1.amazonaws.com/123456789012/submissions" },
    { SUBMISSION_QUEUE_URL: env.SUBMISSION_QUEUE_URL + "?endpoint=http://example.test" },
    { SQS_ENDPOINT: "http://127.0.0.1:12345" },
    { DISPATCH_CONCURRENCY: "100" },
    { DISPATCH_TIMEOUT_MS: "0" },
    { DISPATCH_LEASE_MS: "5000" },
    { DISPATCH_BACKOFF_MAX_MS: "100" },
  ])("rejects unsafe or unbounded settings %j", (override) => {
    expect(() => dispatchWorkerConfig({ ...env, ...override })).toThrow();
  });
  it("permits an explicitly selected local transport fixture only outside production", () => {
    expect(
      dispatchWorkerConfig({
        NODE_ENV: "test",
        AWS_REGION: "us-east-1",
        SUBMISSION_QUEUE_URL: "http://127.0.0.1:12345/123456789012/submissions",
        SQS_ENDPOINT: "http://127.0.0.1:12345",
      }),
    ).toMatchObject({ endpoint: "http://127.0.0.1:12345/" });
  });
});
