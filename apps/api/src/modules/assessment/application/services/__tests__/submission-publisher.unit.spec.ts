import { randomUUID } from "node:crypto";
import { submissionEvent } from "../../../domain/assessment-policy";
import { QueuePublishError } from "../../../../../shared/application/ports/queue-publisher.port";
import { SubmissionClaim, SubmissionDispatch } from "../../ports/submission-dispatch.port";
import { PublisherPolicy, SubmissionPublisher } from "../submission-publisher";

const policy: PublisherPolicy = {
  concurrency: 2,
  leaseMs: 15000,
  maxAttempts: 3,
  maxAgeMs: 86400000,
  backoffInitialMs: 1000,
  backoffMaxMs: 30000,
};

function claim(): SubmissionClaim {
  const event = submissionEvent({
    eventId: randomUUID(),
    attemptId: randomUUID(),
    examId: randomUUID(),
    publishedVersionId: randomUUID(),
    submissionId: randomUUID(),
    occurredAt: "2026-10-08T00:00:00.000Z",
    deadline: "2026-10-08T01:00:00.000Z",
    expired: false,
    submissionKind: "MANUAL",
    correlationId: randomUUID(),
    causationId: randomUUID(),
  });
  return {
    eventId: event.eventId,
    aggregateId: event.aggregateId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    payload: event,
    token: randomUUID(),
    attempts: 1,
    ageMs: 0,
  };
}

function fixture(rows: SubmissionClaim[], failure?: QueuePublishError) {
  const history: string[] = [];
  const failed: Array<{ code: string; delay: number; park: boolean }> = [];
  const bodies: string[] = [];
  let claims = 0;
  let acknowledge = true;
  const repository: SubmissionDispatch = {
    claim: async (limit, lease) => {
      expect(limit).toBe(policy.concurrency);
      expect(lease).toBe(policy.leaseMs);
      claims += 1;
      history.push("claim committed");
      return rows;
    },
    delivered: async () => {
      history.push("mark");
      return acknowledge;
    },
    failed: async (_c, code, delay, park) => {
      failed.push({ code, delay, park });
      return acknowledge;
    },
    backlog: async () => ({ pending: 0, parked: 0, oldestPendingAgeMs: 0 }),
  };
  return {
    history,
    failed,
    bodies,
    repository,
    count: () => claims,
    fence: () => {
      acknowledge = false;
    },
    queue: {
      publish: async (body: string) => {
        history.push("send acknowledged");
        bodies.push(body);
        if (failure) throw failure;
      },
    },
  };
}

describe("Assessment submission publication", () => {
  it("sends the exact stable envelope after claim commit and marks after ACK", async () => {
    const row = claim();
    const f = fixture([row]);
    expect(await new SubmissionPublisher(f.repository, f.queue, policy).runOnce()).toEqual({
      claimed: 1,
      delivered: 1,
      retried: 0,
      parked: 0,
      fenced: 0,
    });
    expect(f.history).toEqual(["claim committed", "send acknowledged", "mark"]);
    expect(JSON.parse(f.bodies[0]!)).toEqual(row.payload);
  });
  it.each([0, 0.5, 1])(
    "persists bounded exponential jitter after failure (random=%s)",
    async (random) => {
      const row = { ...claim(), attempts: 2 };
      const f = fixture([row], new QueuePublishError(false));
      await new SubmissionPublisher(f.repository, f.queue, policy, () => random).runOnce();
      expect(f.history).not.toContain("mark");
      expect(f.failed).toEqual([
        { code: "QUEUE_UNAVAILABLE", delay: Math.floor(2000 * (0.5 + random * 0.5)), park: false },
      ]);
    },
  );
  it.each([3, 4])(
    "parks exhausted/crashed-final claims without unbounded retry (attempt=%s)",
    async (attempts) => {
      const f = fixture([{ ...claim(), attempts }], new QueuePublishError(false));
      expect((await new SubmissionPublisher(f.repository, f.queue, policy).runOnce()).parked).toBe(
        1,
      );
      expect(f.bodies).toHaveLength(attempts > 3 ? 0 : 1);
      expect(f.failed[0]).toMatchObject({ code: "RETRY_EXHAUSTED", park: true });
    },
  );
  it.each(["secret field", "wrong identity", "null payload", "invalid date"])(
    "parks %s before send",
    async (kind) => {
      const row = claim();
      const event = row.payload as Record<string, unknown>;
      if (kind === "secret field") event.answers = ["must never publish"];
      if (kind === "wrong identity") row.eventId = randomUUID();
      if (kind === "null payload") row.payload = null;
      if (kind === "invalid date") event.occurredAt = "2026-02-31T00:00:00.000Z";
      const f = fixture([row]);
      expect((await new SubmissionPublisher(f.repository, f.queue, policy).runOnce()).parked).toBe(
        1,
      );
      expect(f.bodies).toEqual([]);
      expect(f.failed).toEqual([{ code: "INVALID_EVENT", delay: 0, park: true }]);
    },
  );
  it("parks aged/permanently rejected records without changing attempt business state", async () => {
    const f = fixture(
      [{ ...claim(), ageMs: policy.maxAgeMs }, claim()],
      new QueuePublishError(true),
    );
    expect((await new SubmissionPublisher(f.repository, f.queue, policy).runOnce()).parked).toBe(2);
    expect(f.failed.map((f) => f.code)).toEqual(["EVENT_TOO_OLD", "QUEUE_REJECTED"]);
    expect(f.bodies).toHaveLength(1);
  });
  it("reports a fenced acknowledgement without counting delivery", async () => {
    const f = fixture([claim()]);
    f.fence();
    expect(await new SubmissionPublisher(f.repository, f.queue, policy).runOnce()).toMatchObject({
      delivered: 0,
      fenced: 1,
    });
  });
  it("stops admission before claim and isolates observer failures", async () => {
    const f = fixture([claim()]);
    const worker = new SubmissionPublisher(
      f.repository,
      f.queue,
      policy,
      () => 0.5,
      () => {
        throw new Error("observer");
      },
    );
    expect((await worker.runOnce(() => true)).claimed).toBe(0);
    expect(f.count()).toBe(0);
    expect((await worker.runOnce()).delivered).toBe(1);
  });
});
