import { createHash } from "node:crypto";
import { createServer, Server } from "node:http";
import { SqsConsumer } from "../../src/infrastructure/messaging/sqs/sqs-consumer";

let server: Server, endpoint: string, adapter: SqsConsumer;
let mode:
  | "success"
  | "slow"
  | "bad-md5"
  | "no-redrive"
  | "wrong-dlq"
  | "unencrypted"
  | "denied"
  | "generation"
  | "dlq"
  | "foreign-source";
let requests: { target: string; input: Record<string, unknown> }[];
const previous = {
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  session: process.env.AWS_SESSION_TOKEN,
};
const dlq = "arn:aws:sqs:us-east-1:123456789012:grading-dlq";
beforeAll(async () => {
  process.env.AWS_ACCESS_KEY_ID = "local-fixture";
  process.env.AWS_SECRET_ACCESS_KEY = "local-not-a-secret";
  delete process.env.AWS_SESSION_TOKEN;
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const part of req) raw += part;
    const target = String(req.headers["x-amz-target"]);
    requests.push({ target, input: JSON.parse(raw) });
    if (mode === "slow") {
      setTimeout(() => {
        if (!res.destroyed) {
          res.writeHead(200);
          res.end("{}");
        }
      }, 300);
      return;
    }
    if (mode === "denied") {
      res.writeHead(403, { "content-type": "application/x-amz-json-1.0" });
      res.end(JSON.stringify({ __type: "AccessDenied", message: "secret body must not leak" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/x-amz-json-1.0" });
    if (target.endsWith("GetQueueAttributes"))
      res.end(
        JSON.stringify({
          Attributes: {
            QueueArn:
              (mode === "dlq" || mode === "foreign-source") &&
              requests.at(-1)!.input.QueueUrl === `${endpoint}/123456789012/grading-dlq`
                ? dlq
                : "arn:aws:sqs:us-east-1:123456789012:grading",
            RedriveAllowPolicy: JSON.stringify({
              redrivePermission: "byQueue",
              sourceQueueArns: ["arn:aws:sqs:us-east-1:123456789012:grading"],
            }),
            ...(mode === "no-redrive"
              ? {}
              : {
                  RedrivePolicy: JSON.stringify({
                    deadLetterTargetArn: mode === "wrong-dlq" ? "other" : dlq,
                    maxReceiveCount: "5",
                  }),
                }),
            SqsManagedSseEnabled: mode === "unencrypted" ? "false" : "true",
          },
        }),
      );
    else if (target.endsWith("ReceiveMessage"))
      res.end(
        JSON.stringify({
          Messages: [
            {
              Body: "{}",
              ReceiptHandle: "latest-handle",
              MessageId: "broker-id",
              ...(mode === "generation"
                ? {
                    MessageAttributes: {
                      gradingGeneration: { DataType: "Number", StringValue: "1" },
                    },
                    MD5OfMessageAttributes: "3f6be9ab00fd68af0d4f400ad9a88274",
                  }
                : {}),
              ...(mode === "dlq" || mode === "foreign-source"
                ? {
                    Attributes: {
                      DeadLetterQueueSourceArn:
                        mode === "foreign-source"
                          ? "arn:aws:sqs:us-east-1:123456789012:other"
                          : "arn:aws:sqs:us-east-1:123456789012:grading",
                    },
                  }
                : {}),
              MD5OfBody:
                mode === "bad-md5" ? "wrong" : createHash("md5").update("{}").digest("hex"),
            },
          ],
        }),
      );
    else res.end("{}");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture");
  endpoint = `http://127.0.0.1:${address.port}`;
});
beforeEach(() => {
  mode = "success";
  requests = [];
  adapter = new SqsConsumer({
    region: "us-east-1",
    endpoint,
    queueUrl: `${endpoint}/123456789012/grading`,
    timeoutMs: 100,
    visibilitySeconds: 60,
    waitSeconds: 0,
    deadLetterArn: dlq,
    maxReceiveCount: 5,
  });
});
afterEach(() => adapter.close());
afterAll(async () => {
  for (const [key, value] of Object.entries({
    AWS_ACCESS_KEY_ID: previous.key,
    AWS_SECRET_ACCESS_KEY: previous.secret,
    AWS_SESSION_TOKEN: previous.session,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await new Promise<void>((done) => server.close(() => done()));
});
describe("SQS consumer SDK local HTTP contract", () => {
  it("verifies encrypted queue, exact DLQ and bounded receive count before consuming", async () => {
    await adapter.verify();
    expect(requests).toHaveLength(1);
  });
  it.each(["no-redrive", "wrong-dlq", "unencrypted"] as const)(
    "rejects unsafe %s queue configuration",
    async (failure) => {
      mode = failure;
      await expect(adapter.verify()).rejects.toThrow("QUEUE_CONFIGURATION_INVALID");
    },
  );
  it("receives only admitted slots, uses current receipt for visibility/delete, and has no hidden SDK retries", async () => {
    expect(await adapter.receive(2)).toEqual([{ body: "{}", receipt: "latest-handle" }]);
    await adapter.extend("latest-handle");
    await adapter.acknowledge("latest-handle");
    expect(requests.map((r) => r.input)).toEqual([
      {
        QueueUrl: `${endpoint}/123456789012/grading`,
        MaxNumberOfMessages: 2,
        MessageAttributeNames: ["gradingGeneration"],
        WaitTimeSeconds: 0,
        VisibilityTimeout: 60,
      },
      {
        QueueUrl: `${endpoint}/123456789012/grading`,
        ReceiptHandle: "latest-handle",
        VisibilityTimeout: 60,
      },
      { QueueUrl: `${endpoint}/123456789012/grading`, ReceiptHandle: "latest-handle" },
    ]);
  });
  it("does not admit a corrupted body transport", async () => {
    mode = "bad-md5";
    await expect(adapter.receive(1)).rejects.toThrow("QUEUE_UNAVAILABLE");
  });
  it("bounds the complete pending call and does not retry", async () => {
    mode = "slow";
    const start = performance.now();
    await expect(adapter.receive(1)).rejects.toThrow("QUEUE_UNAVAILABLE");
    expect(performance.now() - start).toBeLessThan(400);
    expect(requests).toHaveLength(1);
  });
  it("redacts broker errors and uses one attempt", async () => {
    mode = "denied";
    await expect(adapter.acknowledge("handle")).rejects.toThrow("QUEUE_UNAVAILABLE");
    expect(requests).toHaveLength(1);
  });
});

describe("replay generation and DLQ transport identity", () => {
  it("receives the replay generation without mutating the event body", async () => {
    mode = "generation";
    expect(await adapter.receive(1)).toEqual([
      { body: "{}", receipt: "latest-handle", generation: 1 },
    ]);
    expect(requests[0]!.input.MessageAttributeNames).toEqual(["gradingGeneration"]);
  });
  it.each(["dlq", "foreign-source"] as const)(
    "verifies DLQ and treats %s source safely",
    async (value) => {
      mode = value;
      adapter.close();
      adapter = new SqsConsumer({
        region: "us-east-1",
        endpoint,
        queueUrl: `${endpoint}/123456789012/grading-dlq`,
        sourceQueueUrl: `${endpoint}/123456789012/grading`,
        timeoutMs: 100,
        visibilitySeconds: 60,
        waitSeconds: 0,
        deadLetterArn: dlq,
        maxReceiveCount: 5,
      });
      await adapter.verify();
      expect(requests.filter((r) => r.target.endsWith("GetQueueAttributes"))).toHaveLength(2);
      expect(await adapter.receive(1)).toEqual([
        {
          body: "{}",
          receipt: "latest-handle",
          ...(value === "foreign-source" ? { generation: null } : {}),
        },
      ]);
    },
  );
});
