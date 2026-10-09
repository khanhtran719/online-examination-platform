import { AssessmentRetention } from "../assessment-retention";
import { AssessmentRetentionRepository } from "../../ports/assessment-retention.repository";
import { RetentionState } from "../../../domain/retention";

const now = Date.parse("2026-10-09T00:00:00Z");
function fixture() {
  let current: RetentionState | null = {
    id: "old",
    status: "COMPLETED",
    submittedAt: now - 366 * 86400000,
    completedAt: now - 8 * 86400000,
    serverNow: now,
    resultPresent: true,
    inboxPresent: true,
    replayPending: false,
    outstandingDelivery: false,
    unresolvedFailure: false,
    recentReceipt: false,
    purged: false,
  };
  let transactions = 0,
    fail = false;
  const seen: string[] = [];
  const repo: AssessmentRetentionRepository = {
    pruneReceipts: async () => {
      seen.push("receipts");
      return 3;
    },
    lockNext: async () => {
      seen.push("lock");
      return current;
    },
    purgeLocked: async () => {
      seen.push("purge");
      if (fail) throw new Error("audit unavailable");
      current = null;
      return { purged: true, answers: 2, selections: 3 };
    },
  };
  const uow = {
    transaction: async <T>(work: () => Promise<T>) => {
      transactions++;
      return work();
    },
  };
  const service = new AssessmentRetention(repo, uow, { receiptBatch: 10, attemptBatch: 2 });
  return {
    service,
    seen,
    repo,
    uow,
    current,
    transactions: () => transactions,
    fail: () => {
      fail = true;
    },
  };
}
describe("Assessment retention transaction orchestration", () => {
  it("uses one bounded receipt transaction and a separate UoW per attempt", async () => {
    const f = fixture();
    expect(await f.service.runOnce("tick")).toEqual({
      receipts: 3,
      attempts: 1,
      answers: 2,
      selections: 3,
    });
    expect(f.seen).toEqual(["receipts", "lock", "purge", "lock"]);
    expect(f.transactions()).toBe(3);
  });
  it("fails closed when an adapter supplies protected state", async () => {
    const f = fixture();
    f.current!.replayPending = true;
    await expect(f.service.runOnce("tick")).rejects.toThrow("RETENTION_STATE_UNAVAILABLE");
    expect(f.seen).not.toContain("purge");
  });
  it("propagates transactional failure rather than reporting a successful purge", async () => {
    const f = fixture();
    f.fail();
    await expect(f.service.runOnce("tick")).rejects.toThrow("audit unavailable");
  });
  it("stops admission before work and between committed batches", async () => {
    const f = fixture();
    expect(await f.service.runOnce("tick", () => true)).toEqual({
      receipts: 0,
      attempts: 0,
      answers: 0,
      selections: 0,
    });
    expect(f.transactions()).toBe(0);
    expect(await f.service.runOnce("tick", () => f.seen.includes("purge"))).toMatchObject({
      attempts: 1,
    });
    expect(f.seen).toEqual(["receipts", "lock", "purge"]);
  });
  it("rejects unbounded or fractional batch settings", () => {
    const f = fixture();
    for (const receiptBatch of [0, 1001, NaN, 1.5])
      expect(
        () => new AssessmentRetention(f.repo, f.uow, { receiptBatch, attemptBatch: 1 }),
      ).toThrow();
    for (const attemptBatch of [0, 51, NaN, 1.5])
      expect(
        () => new AssessmentRetention(f.repo, f.uow, { receiptBatch: 1, attemptBatch }),
      ).toThrow();
  });
});
