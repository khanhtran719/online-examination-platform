import { SubmittedEvent } from "../../../domain/assessment-policy";
import { LockedAttempt } from "../../../domain/repositories/attempt.repository";
import { DeadlineSweep } from "../deadline-sweep";

function row(id: string, deadline: string, serverNow: string): LockedAttempt {
  return {
    id,
    examId: "00000000-0000-4000-8000-000000000001",
    publishedVersionId: "00000000-0000-4000-8000-000000000002",
    userId: "00000000-0000-4000-8000-000000000003",
    revision: 1,
    status: "IN_PROGRESS",
    startedAt: "2026-10-08T00:00:00.000Z",
    deadline,
    submittedAt: null,
    expired: false,
    replayPending: false,
    submissionId: null,
    submissionKind: null,
    serverNow,
  };
}

describe("DeadlineSweep", () => {
  it("expires due rows, skips a future recheck, and does not count a rolled-back failure", async () => {
    const due = row(
      "00000000-0000-4000-8000-000000000011",
      "2026-10-08T00:45:00.000Z",
      "2026-10-08T00:46:00.000Z",
    );
    const future = row(
      "00000000-0000-4000-8000-000000000012",
      "2026-10-08T01:00:00.000Z",
      "2026-10-08T00:46:00.000Z",
    );
    const poison = row(
      "00000000-0000-4000-8000-000000000013",
      "2026-10-08T00:40:00.000Z",
      "2026-10-08T00:46:00.000Z",
    );
    const available = [poison, due, future];
    const events: SubmittedEvent[] = [];
    let commits = 0;
    const repo = {
      async claimDue(exclude: readonly string[]) {
        return (
          available.find((item) => item.status === "IN_PROGRESS" && !exclude.includes(item.id)) ??
          null
        );
      },
      async submit(input: { attemptId: string; submissionId: string; submittedAt: string }) {
        if (input.attemptId === poison.id) throw new Error("outbox down");
        const found = available.find((item) => item.id === input.attemptId);
        if (!found) return null;
        found.status = "EXPIRED";
        found.submittedAt = input.submittedAt;
        found.expired = true;
        found.submissionId = input.submissionId;
        found.submissionKind = "DEADLINE";
        found.revision += 1;
        return found;
      },
      async dueBacklog() {
        const open = available.filter((item) => item.status === "IN_PROGRESS");
        return { due: open.length, oldestDueAgeMs: open.length ? 1 : null };
      },
      async deferExpiry() {
        /* PostgreSQL integration tests own durable cooldown behavior. */
      },
    };
    const outbox = {
      async append(event: SubmittedEvent) {
        events.push(event);
      },
    };
    const sweep = new DeadlineSweep(
      repo,
      outbox,
      {
        async transaction(work) {
          const result = await work();
          commits += 1;
          return result;
        },
      },
      10,
    );
    const first = await sweep.runOnce("00000000-0000-4000-8000-000000000099");
    expect(first.processed).toBe(1);
    expect(first.failed).toBe(1);
    expect(first.skipped).toBe(1);
    expect(first.empty).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.submissionKind).toBe("DEADLINE");
    expect(events[0]?.causationId).toBe("00000000-0000-4000-8000-000000000099");
    expect(poison.status).toBe("IN_PROGRESS");
    expect(due.status).toBe("EXPIRED");
    expect(commits).toBe(4); // Includes the separate retry-scheduling commit.
    const second = await sweep.runOnce("00000000-0000-4000-8000-000000000098");
    expect(second.processed).toBe(0);
    expect(events).toHaveLength(1);
    expect(due.revision).toBe(2);
  });

  it("does not increment the success counter when the transaction rejects", async () => {
    const sweep = new DeadlineSweep(
      {
        async claimDue() {
          throw new Error("database unavailable");
        },
        async submit() {
          return null;
        },
        async dueBacklog() {
          return { due: 1, oldestDueAgeMs: 5 };
        },
        async deferExpiry() {
          throw new Error("No row was claimed");
        },
      },
      {
        async append() {
          /* unused */
        },
      },
      {
        async transaction(work) {
          return work();
        },
      },
      5,
    );
    await expect(sweep.runOnce("00000000-0000-4000-8000-000000000099")).rejects.toThrow(
      "database unavailable",
    );
  });
});
