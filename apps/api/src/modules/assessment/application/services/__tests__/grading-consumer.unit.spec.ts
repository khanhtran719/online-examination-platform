import { GradingConsumer } from "../grading-consumer";
import { GradingAttempt, GradingRepository } from "../../ports/grading-repository.port";
import { submissionEvent } from "../../../domain/assessment-policy";
import { Grade } from "../../../domain/grading";
import { GradingRecovery } from "../grading-recovery";

const attemptId = "11111111-1111-4111-8111-111111111111";
const examId = "22222222-2222-4222-8222-222222222222";
const versionId = "33333333-3333-4333-8333-333333333333";
const eventId = "44444444-4444-4444-8444-444444444444";
const submissionId = "55555555-5555-4555-8555-555555555555";
const event = submissionEvent({
  eventId,
  attemptId,
  examId,
  publishedVersionId: versionId,
  submissionId,
  occurredAt: "2026-10-09T00:01:00.000Z",
  deadline: "2026-10-09T01:00:00.000Z",
  expired: false,
  submissionKind: "MANUAL",
  correlationId: eventId,
  causationId: eventId,
});
let state: GradingAttempt;
let durable: Grade | null;
let quarantine: string[];
let inbox: string[];
let consumer: GradingConsumer;
beforeEach(() => {
  state = {
    id: attemptId,
    examId,
    userId: "user",
    status: "SUBMITTED",
    publishedVersionId: versionId,
    startedAt: Date.parse("2026-10-09T00:00:00Z"),
    deadline: Date.parse(event.payload.deadline),
    submittedAt: Date.parse(event.occurredAt),
    expired: false,
    submissionId,
    submissionEventId: eventId,
    submissionKind: "MANUAL",
    replayPending: false,
    resultPresent: false,
    gradingGeneration: 0,
  };
  durable = null;
  quarantine = [];
  inbox = [];
  const repo: GradingRepository = {
    lock: async (id) => (id === attemptId ? { ...state } : null),
    begin: async () => {
      state.status = "PROCESSING";
    },
    answers: async () => [{ questionId: "q", selected: ["a"] }],
    complete: async (_attempt, grade) => {
      durable = grade;
      state.status = "COMPLETED";
      state.resultPresent = true;
      state.replayPending = false;
    },
    inbox: async (id) => {
      inbox.push(id);
    },
    quarantine: async (_digest, code) => {
      quarantine.push(code);
    },
  };
  const uow = {
    transaction: async <T>(work: () => Promise<T>) => {
      const before = structuredClone({ state, durable, inbox });
      try {
        return await work();
      } catch (error) {
        ({ state, durable, inbox } = before);
        throw error;
      }
    },
  };
  consumer = new GradingConsumer(
    repo,
    {
      getScoringSnapshot: async () => [
        {
          questionId: "q",
          sectionId: "s",
          position: 1,
          type: "SINGLE_CHOICE",
          points: 5,
          optionIds: ["a", "b"],
          correctOptionIds: ["a"],
        },
      ],
    },
    uow,
    new GradingRecovery(
      {
        ...repo,
        recordFailure: async () => {
          state.status = "FAILED";
          state.replayPending = false;
        },
      },
      uow,
    ),
  );
});
describe("grading admission and atomic outcome", () => {
  it("completes the accepted attempt and returns duplicate on redelivery", async () => {
    expect(await consumer.consume(event, "digest")).toBe("completed");
    expect(durable).toMatchObject({ earned: 5, possible: 5 });
    expect(await consumer.consume(event, "digest")).toBe("duplicate");
    expect(state.status).toBe("COMPLETED");
  });
  it.each([null, { ...event, version: 2 }, { ...event, answers: ["secret"] }])(
    "quarantines invalid schema %j without touching attempt",
    async (body) => {
      expect(await consumer.consume(body, "digest")).toBe("quarantined");
      expect(quarantine).toEqual(["INVALID_SCHEMA"]);
      expect(state.status).toBe("SUBMITTED");
      expect(inbox).toEqual([]);
    },
  );
  it("quarantines a forged submission without affecting its referenced attempt", async () => {
    expect(
      await consumer.consume(
        { ...event, payload: { ...event.payload, submissionId: eventId } },
        "digest",
      ),
    ).toBe("quarantined");
    expect(quarantine).toEqual(["SUBMISSION_MISMATCH"]);
    expect(state.status).toBe("SUBMITTED");
  });
  it("does not allow an unrelated event ID to start grading", async () => {
    expect(await consumer.consume({ ...event, eventId: submissionId }, "digest")).toBe(
      "quarantined",
    );
    expect(durable).toBeNull();
  });
  it("allows matching completed submission under another event ID without another effect", async () => {
    await consumer.consume(event, "digest");
    const original = structuredClone(durable);
    expect(await consumer.consume({ ...event, eventId: submissionId }, "digest")).toBe("duplicate");
    expect(durable).toEqual(original);
  });
  it("does not silently replay a FAILED attempt without operator authorization", async () => {
    state.status = "FAILED";
    await expect(consumer.consume(event, "digest")).rejects.toThrow("GRADING_STATE_UNAVAILABLE");
    expect(state.status).toBe("FAILED");
    expect(durable).toBeNull();
    expect(inbox).toEqual([]);
  });
  it("clears replay authorization only on successful completion", async () => {
    state.status = "FAILED";
    state.replayPending = true;
    expect(await consumer.consume(event, "digest")).toBe("completed");
    expect(state.replayPending).toBe(false);
  });
  it("does not execute an old source delivery after replay authorization", async () => {
    state.status = "FAILED";
    state.replayPending = true;
    state.gradingGeneration = 1;
    expect(await consumer.consume(event, "digest", 0)).toBe("stale");
    expect(state.replayPending).toBe(true);
    expect(durable).toBeNull();
  });
  it("does not accept a future generation from a transport attribute", async () => {
    expect(await consumer.consume(event, "digest", 1)).toBe("quarantined");
    expect(state.status).toBe("SUBMITTED");
    expect(durable).toBeNull();
  });
});
