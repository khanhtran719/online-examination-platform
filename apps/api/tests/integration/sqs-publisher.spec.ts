import { createHash } from "node:crypto";
import { createServer, Server } from "node:http";
import { SqsPublisher } from "../../src/infrastructure/messaging/sqs/sqs-publisher";

let server: Server;
let endpoint: string;
let adapter: SqsPublisher;
let mode: "success" | "slow" | "transient" | "permanent" | "missing-ack" | "bad-md5";
let requests: Array<Record<string, unknown>>;
const previous = {
  key: process.env.AWS_ACCESS_KEY_ID,
  secret: process.env.AWS_SECRET_ACCESS_KEY,
  session: process.env.AWS_SESSION_TOKEN,
};

beforeAll(async () => {
  // Synthetic fixture credentials only; SDK SigV4 is actually exercised locally.
  process.env.AWS_ACCESS_KEY_ID = "LOCAL_FIXTURE_ONLY";
  process.env.AWS_SECRET_ACCESS_KEY = "local-fixture-not-a-secret";
  delete process.env.AWS_SESSION_TOKEN;
  server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk.toString();
    const parsed = JSON.parse(body) as Record<string, unknown>;
    requests.push(parsed);
    const status = mode === "transient" ? 503 : mode === "permanent" ? 400 : 200;
    const result =
      mode === "transient"
        ? { __type: "ServiceUnavailable", message: "fixture-sensitive-do-not-log" }
        : mode === "permanent"
          ? { __type: "InvalidMessageContents", message: "fixture-sensitive-do-not-log" }
          : {
              MessageId: mode === "missing-ack" ? undefined : "fixture-message-id",
              ...(parsed.MessageAttributes
                ? { MD5OfMessageAttributes: "3f6be9ab00fd68af0d4f400ad9a88274" }
                : {}),
              MD5OfMessageBody:
                mode === "bad-md5"
                  ? "00000000000000000000000000000000"
                  : createHash("md5").update(String(parsed.MessageBody)).digest("hex"),
            };
    const send = () => {
      res.writeHead(status, { "content-type": "application/x-amz-json-1.0" });
      res.end(JSON.stringify(result));
    };
    if (mode === "slow") setTimeout(send, 500);
    else send();
  });
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("HTTP fixture missing");
  endpoint = `http://127.0.0.1:${address.port}`;
});
beforeEach(() => {
  mode = "success";
  requests = [];
  adapter = new SqsPublisher({
    region: "us-east-1",
    queueUrl: `${endpoint}/123456789012/submissions`,
    endpoint,
    timeoutMs: 100,
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

describe("SQS publisher SDK local HTTP contract (not live AWS)", () => {
  it("sends the exact body and waits for valid broker ACK, without FIFO parameters", async () => {
    const body = JSON.stringify({ eventId: "stable-event", correlationId: "stable-correlation" });
    await adapter.publish(body);
    expect(requests).toEqual([
      { QueueUrl: `${endpoint}/123456789012/submissions`, MessageBody: body },
    ]);
  });
  it("times out a pending send without waiting for the server", async () => {
    mode = "slow";
    const started = performance.now();
    await expect(adapter.publish("{}")).rejects.toMatchObject({
      permanent: false,
      message: "QUEUE_UNAVAILABLE",
    });
    expect(performance.now() - started).toBeLessThan(400);
    expect(requests).toHaveLength(1);
  });
  it.each(["transient", "permanent", "missing-ack", "bad-md5"] as const)(
    "classifies %s safely and makes exactly one SDK attempt",
    async (failure) => {
      mode = failure;
      await expect(adapter.publish("{}")).rejects.toMatchObject({
        permanent: failure === "permanent",
        message: failure === "permanent" ? "QUEUE_REJECTED" : "QUEUE_UNAVAILABLE",
      });
      expect(requests).toHaveLength(1);
    },
  );
});

it("publishes a replay generation as metadata with the exact original envelope body", async () => {
  const body = JSON.stringify({ eventId: "stable-event" });
  await adapter.publish(body, 1);
  expect(requests[0]).toMatchObject({
    MessageBody: body,
    MessageAttributes: { gradingGeneration: { DataType: "Number", StringValue: "1" } },
  });
});
