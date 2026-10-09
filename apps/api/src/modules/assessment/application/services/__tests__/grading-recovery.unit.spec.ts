import { GradingRecovery } from "../grading-recovery";
import { GradingFailureRepository } from "../../ports/grading-failure-repository.port";
import { GradingAttempt } from "../../ports/grading-repository.port";
import { submissionEvent } from "../../../domain/assessment-policy";

const id = "11111111-1111-4111-8111-111111111111";
const exam = "22222222-2222-4222-8222-222222222222";
const version = "33333333-3333-4333-8333-333333333333";
const eventId = "44444444-4444-4444-8444-444444444444";
const event = submissionEvent({
  eventId,
  attemptId: id,
  examId: exam,
  publishedVersionId: version,
  submissionId: "55555555-5555-4555-8555-555555555555",
  occurredAt: "2026-10-09T00:01:00.000Z",
  deadline: "2026-10-09T01:00:00.000Z",
  expired: false,
  submissionKind: "MANUAL",
  correlationId: eventId,
  causationId: eventId,
});
let state: GradingAttempt;
let failures: string[], poison: string[];
let auditUnavailable: boolean;
let service: GradingRecovery;
beforeEach(() => {
  state = {
    id,
    examId: exam,
    userId: id,
    publishedVersionId: version,
    status: "SUBMITTED",
    startedAt: Date.parse("2026-10-09T00:00:00Z"),
    deadline: Date.parse(event.payload.deadline),
    submittedAt: Date.parse(event.occurredAt),
    submissionId: event.payload.submissionId,
    submissionEventId: eventId,
    submissionKind: "MANUAL",
    expired: false,
    replayPending: false,
    resultPresent: false,
    gradingGeneration: 0,
  };
  failures = [];
  poison = [];
  auditUnavailable = false;
  const repository: GradingFailureRepository = {
    lock: async (target) => (target === id ? { ...state } : null),
    quarantine: async (_digest, code) => {
      poison.push(code);
    },
    recordFailure: async (_attempt, _event, _digest, code) => {
      state.status = "FAILED";
      state.replayPending = false;
      state.failurePresent = true;
      failures.push(code);
      if (auditUnavailable) throw new Error("audit unavailable");
    },
  };
  service = new GradingRecovery(repository, {
    transaction: async <T>(work: () => Promise<T>) => {
      const before = structuredClone({ state, failures, poison });
      try {
        return await work();
      } catch (error) {
        ({ state, failures, poison } = before);
        throw error;
      }
    },
  });
});
describe("terminal grading recovery", () => {
  it("settles exhausted work once and clears pending replay only for that generation", async () => {
    expect(await service.consume(event, "digest", 0, "RETRY_EXHAUSTED")).toBe("terminal");
    expect(state.status).toBe("FAILED");
    expect(await service.consume(event, "digest", 0, "RETRY_EXHAUSTED")).toBe("terminal");
    expect(failures).toEqual(["RETRY_EXHAUSTED"]);
    state.gradingGeneration = 1;
    state.replayPending = true;
    expect(await service.consume(event, "digest", 1, "SCORING_INVALID")).toBe("terminal");
    expect(state.replayPending).toBe(false);
    expect(failures).toEqual(["RETRY_EXHAUSTED", "SCORING_INVALID"]);
  });
  it("does not let an old DLQ generation cancel an authorized replay", async () => {
    state.status = "FAILED";
    state.replayPending = true;
    state.gradingGeneration = 1;
    expect(await service.consume(event, "digest", 0, "RETRY_EXHAUSTED")).toBe("stale");
    expect(state.replayPending).toBe(true);
    expect(failures).toEqual([]);
  });
  it("rolls back terminal state and quarantine when audit persistence fails", async () => {
    auditUnavailable = true;
    await expect(service.consume(event, "digest", 0, "RETRY_EXHAUSTED")).rejects.toThrow();
    expect(state.status).toBe("SUBMITTED");
    expect(failures).toEqual([]);
  });
  it("leaves completed results terminal when a delayed DLQ arrives", async () => {
    state.status = "COMPLETED";
    state.resultPresent = true;
    expect(await service.consume(event, "digest", 0, "RETRY_EXHAUSTED")).toBe("duplicate");
    expect(state.status).toBe("COMPLETED");
    expect(failures).toEqual([]);
  });
  it.each([
    null,
    { ...event, payload: { ...event.payload, submissionId: id } },
    { ...event, eventId: id },
  ])("quarantines poison without failing a claimed attempt", async (body) => {
    expect(await service.consume(body, "digest", 0, "RETRY_EXHAUSTED")).toBe("quarantined");
    expect(state.status).toBe("SUBMITTED");
    expect(failures).toEqual([]);
  });
  it("rejects a future generation without authorizing it", async () => {
    expect(await service.consume(event, "digest", 1, "RETRY_EXHAUSTED")).toBe("quarantined");
    expect(state.status).toBe("SUBMITTED");
    expect(failures).toEqual([]);
  });
});
