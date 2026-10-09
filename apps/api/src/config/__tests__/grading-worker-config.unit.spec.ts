import { gradingWorkerConfig } from "../grading-worker.config";
const env = {
  NODE_ENV: "production",
  AWS_REGION: "ap-southeast-1",
  SUBMISSION_QUEUE_URL: "https://sqs.ap-southeast-1.amazonaws.com/123456789012/submissions",
  GRADING_DLQ_ARN: "arn:aws:sqs:ap-southeast-1:123456789012:grading-dlq",
};
describe("grading worker configuration", () => {
  it("needs no Identity/email keys and bounds admission, wait and visibility", () => {
    expect(gradingWorkerConfig(env)).toMatchObject({
      concurrency: 2,
      waitSeconds: 10,
      timeoutMs: 15000,
      visibilitySeconds: 60,
      heartbeatMs: 10000,
    });
  });
  it("selects an encrypted DLQ recovery mode with the original source identity", () => {
    expect(gradingWorkerConfig({ ...env, GRADING_QUEUE_MODE: "dead-letter" })).toMatchObject({
      queueUrl: "https://sqs.ap-southeast-1.amazonaws.com/123456789012/grading-dlq",
      sourceQueueUrl: env.SUBMISSION_QUEUE_URL,
      queueMode: "dead-letter",
    });
    expect(() => gradingWorkerConfig({ ...env, GRADING_QUEUE_MODE: "invalid" })).toThrow();
  });
  it.each([
    { GRADING_CONCURRENCY: "9" },
    { GRADING_WAIT_SECONDS: "21" },
    { GRADING_TIMEOUT_MS: "5000" },
    { GRADING_VISIBILITY_SECONDS: "20" },
    { GRADING_HEARTBEAT_MS: "60000" },
    { GRADING_MAX_RECEIVE_COUNT: "100" },
    { GRADING_DLQ_ARN: "arn:aws:sqs:ap-southeast-1:123456789012:submissions" },
    { GRADING_DLQ_ARN: "arn:aws:sqs:us-east-1:123456789012:grading-dlq" },
    { SQS_ENDPOINT: "http://127.0.0.1:9999" },
    {
      SUBMISSION_QUEUE_URL:
        "https://sqs.ap-southeast-1.amazonaws.com/123456789012/submissions.fifo",
    },
  ])("rejects unsafe settings %j", (patch) => {
    expect(() => gradingWorkerConfig({ ...env, ...patch })).toThrow();
  });
});
