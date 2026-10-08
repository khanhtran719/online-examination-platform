import { SubmittedEvent } from "../../../domain/assessment-policy";
import { LockedAttempt } from "../../../domain/repositories/attempt.repository";
import { acceptAttemptSubmission } from "../attempt-submission";

const ids = {
  attemptId: "00000000-0000-4000-8000-000000000004",
  examId: "00000000-0000-4000-8000-000000000001",
  versionId: "00000000-0000-4000-8000-000000000002",
  userId: "00000000-0000-4000-8000-000000000003",
  correlationId: "00000000-0000-4000-8000-000000000007",
  causationId: "00000000-0000-4000-8000-000000000008",
};

function locked(overrides: Partial<LockedAttempt> = {}): LockedAttempt {
  return {
    id: ids.attemptId,
    examId: ids.examId,
    publishedVersionId: ids.versionId,
    userId: ids.userId,
    revision: 2,
    status: "IN_PROGRESS",
    startedAt: "2026-10-08T00:00:00.000Z",
    deadline: "2026-10-08T00:45:00.000Z",
    submittedAt: null,
    expired: false,
    replayPending: false,
    submissionId: null,
    submissionKind: null,
    serverNow: "2026-10-08T00:44:00.000Z",
    ...overrides,
  };
}

describe("acceptAttemptSubmission", () => {
  it("persists one manual acceptance and returns the same ids when repeated", async () => {
    const events: SubmittedEvent[] = [];
    const writes: unknown[] = [];
    const repo = {
      async submit(input: unknown) {
        writes.push(input);
        const command = input as {
          submissionId: string;
          eventId: string;
          submittedAt: string;
          expired: boolean;
          submissionKind: "MANUAL" | "DEADLINE";
          status: "SUBMITTED" | "EXPIRED";
        };
        return {
          ...locked(),
          revision: 3,
          status: command.status,
          submittedAt: command.submittedAt,
          expired: command.expired,
          submissionId: command.submissionId,
          submissionKind: command.submissionKind,
        };
      },
    };
    const outbox = {
      async append(event: SubmittedEvent) {
        events.push(event);
      },
    };
    const first = await acceptAttemptSubmission(repo, outbox, {
      locked: locked(),
      kind: "MANUAL",
      correlationId: ids.correlationId,
      causationId: ids.causationId,
    });
    expect(first.written).toBe(true);
    expect(first.receipt.acceptanceState).toBe("SUBMITTED");
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.submissionKind).toBe("MANUAL");
    expect(JSON.stringify(events[0])).not.toContain(ids.userId);
    const again = await acceptAttemptSubmission(repo, outbox, {
      locked: locked({
        status: "SUBMITTED",
        submittedAt: first.receipt.acceptedAt,
        expired: false,
        submissionId: first.receipt.submissionId,
        submissionKind: "MANUAL",
        revision: 3,
      }),
      kind: "MANUAL",
      correlationId: ids.correlationId,
      causationId: ids.causationId,
    });
    expect(again.written).toBe(false);
    expect(again.receipt).toEqual(first.receipt);
    expect(events).toHaveLength(1);
    expect(writes).toHaveLength(1);
  });

  it("expires at the exact post-lock deadline and refuses DEADLINE before that instant", async () => {
    const events: SubmittedEvent[] = [];
    const repo = {
      async submit(input: {
        status: "SUBMITTED" | "EXPIRED";
        submittedAt: string;
        expired: boolean;
        submissionId: string;
        submissionKind: "MANUAL" | "DEADLINE";
      }) {
        return {
          ...locked({ serverNow: "2026-10-08T00:45:00.000Z" }),
          revision: 3,
          status: input.status,
          submittedAt: input.submittedAt,
          expired: input.expired,
          submissionId: input.submissionId,
          submissionKind: input.submissionKind,
        };
      },
    };
    const outbox = {
      async append(event: SubmittedEvent) {
        events.push(event);
      },
    };
    const due = await acceptAttemptSubmission(repo, outbox, {
      locked: locked({ serverNow: "2026-10-08T00:45:00.000Z" }),
      kind: "DEADLINE",
      correlationId: ids.correlationId,
      causationId: ids.causationId,
    });
    expect(due.receipt).toMatchObject({
      acceptanceState: "EXPIRED",
      expired: true,
      acceptedAt: "2026-10-08T00:45:00.000Z",
    });
    expect(events[0]?.payload).toMatchObject({ submissionKind: "DEADLINE", expired: true });
    expect(events[0]?.occurredAt).toBe(due.receipt.acceptedAt);
    await expect(
      acceptAttemptSubmission(repo, outbox, {
        locked: locked({ serverNow: "2026-10-08T00:44:59.000Z" }),
        kind: "DEADLINE",
        correlationId: ids.correlationId,
        causationId: ids.causationId,
      }),
    ).rejects.toThrow("Attempt cannot submit");
    expect(events).toHaveLength(1);
  });
});
