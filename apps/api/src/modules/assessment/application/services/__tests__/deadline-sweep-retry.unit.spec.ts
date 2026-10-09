import { LockedAttempt } from "../../../domain/repositories/attempt.repository";
import { DeadlineSweep } from "../deadline-sweep";

const row = (suffix: string): LockedAttempt => ({
  id: `00000000-0000-4000-8000-0000000000${suffix}`,
  examId: "00000000-0000-4000-8000-000000000001",
  publishedVersionId: "00000000-0000-4000-8000-000000000002",
  userId: "00000000-0000-4000-8000-000000000003",
  revision: 1,
  status: "IN_PROGRESS",
  startedAt: "2026-10-08T00:00:00.000Z",
  deadline: "2026-10-08T00:45:00.000Z",
  serverNow: "2026-10-08T00:46:00.000Z",
  submittedAt: null,
  expired: false,
  replayPending: false,
  submissionId: null,
  submissionKind: null,
});

it("keeps a healthy attempt progressing after recomposition past a full failed batch", async () => {
  const rows = [row("11"), row("12"), row("13")];
  const cooling = new Set<string>();
  const repo = {
    async claimDue(exclude: readonly string[]) {
      return (
        rows.find(
          (item) =>
            item.status === "IN_PROGRESS" && !cooling.has(item.id) && !exclude.includes(item.id),
        ) ?? null
      );
    },
    async submit(input: { attemptId: string; submissionId: string; submittedAt: string }) {
      const found = rows.find((item) => item.id === input.attemptId)!;
      if (found !== rows[2]) throw new Error("row persist failed");
      found.status = "EXPIRED";
      found.expired = true;
      found.submittedAt = input.submittedAt;
      found.submissionId = input.submissionId;
      found.submissionKind = "DEADLINE";
      found.revision += 1;
      return found;
    },
    async deferExpiry(id: string) {
      cooling.add(id);
    },
    async dueBacklog() {
      return {
        due: rows.filter((item) => item.status === "IN_PROGRESS").length,
        oldestDueAgeMs: 1,
      };
    },
  };
  const outbox = { append: async () => undefined };
  const uow = { transaction: async <T>(work: () => Promise<T>) => work() };
  await new DeadlineSweep(repo, outbox, uow, 2).runOnce("00000000-0000-4000-8000-000000000099");
  const next = await new DeadlineSweep(repo, outbox, uow, 2).runOnce(
    "00000000-0000-4000-8000-000000000098",
  );
  expect(next.processed).toBe(1);
  expect(rows[2]).toMatchObject({ status: "EXPIRED", revision: 2 });
  expect(rows.slice(0, 2).map((item) => item.status)).toEqual(["IN_PROGRESS", "IN_PROGRESS"]);
});

it("observes only after commit and preserves acceptance when telemetry throws", async () => {
  const attempt = row("14");
  let committed = false;
  let observations = 0;
  let events = 0;
  const repo = {
    async claimDue() {
      return attempt.status === "IN_PROGRESS" ? attempt : null;
    },
    async submit(input: { submissionId: string; submittedAt: string }) {
      attempt.status = "EXPIRED";
      attempt.expired = true;
      attempt.submittedAt = input.submittedAt;
      attempt.submissionId = input.submissionId;
      attempt.submissionKind = "DEADLINE";
      attempt.revision += 1;
      return attempt;
    },
    async deferExpiry() {
      throw new Error("Accepted row must not be retried");
    },
    async dueBacklog() {
      return { due: 0, oldestDueAgeMs: null };
    },
  };
  const sweep = new DeadlineSweep(
    repo,
    {
      append: async () => {
        events += 1;
      },
    },
    {
      transaction: async <T>(work: () => Promise<T>) => {
        const result = await work();
        committed = true;
        return result;
      },
    },
    2,
    {
      committed(sample) {
        expect(committed).toBe(true);
        expect(sample).toEqual({ deadline: attempt.deadline, acceptedAt: attempt.submittedAt });
        observations += 1;
        throw new Error("Collector down");
      },
    },
  );
  expect(await sweep.runOnce("00000000-0000-4000-8000-000000000099")).toMatchObject({
    processed: 1,
    failed: 0,
  });
  expect(await sweep.runOnce("00000000-0000-4000-8000-000000000098")).toMatchObject({
    processed: 0,
    failed: 0,
  });
  expect({ observations, events, revision: attempt.revision }).toEqual({
    observations: 1,
    events: 1,
    revision: 2,
  });
});
