import { Attempt } from "../attempt";
const state = () => ({
  id: "a",
  examId: "e",
  userId: "u",
  status: "IN_PROGRESS" as const,
  startedAt: 1000,
  deadline: 5000,
  submittedAt: null,
  expired: false,
});
describe("Attempt lifecycle", () => {
  it("rejects saving at the exact server deadline", () => {
    expect(() => Attempt.restore(state()).assertCanSave(5000)).toThrow("Attempt is closed");
  });
  it("permits saving before deadline", () => {
    expect(() => Attempt.restore(state()).assertCanSave(4999)).not.toThrow();
  });
  it("makes duplicate submission a no-op", () => {
    const a = Attempt.restore(state());
    expect(a.submit(4000)).toBe(true);
    expect(a.submit(4500)).toBe(false);
    expect(a.snapshot().submittedAt).toBe(4000);
  });
  it("records server expiration and keeps it after completion", () => {
    const a = Attempt.restore(state());
    a.submit(5001);
    expect(a.snapshot().status).toBe("EXPIRED");
    a.processing();
    a.complete();
    expect(a.snapshot()).toMatchObject({ status: "COMPLETED", expired: true });
  });
  it("forbids saves after submit even before deadline", () => {
    const a = Attempt.restore(state());
    a.submit(2000);
    expect(() => a.assertCanSave(3000)).toThrow("Attempt is closed");
  });
  it("does not complete a running attempt", () => {
    expect(() => Attempt.restore(state()).complete()).toThrow();
  });
});
describe("Attempt state integrity", () => {
  it("does not let returned snapshots mutate aggregate state", () => {
    const a = Attempt.restore(state());
    const copy = a.snapshot();
    copy.status = "COMPLETED";
    expect(a.snapshot().status).toBe("IN_PROGRESS");
  });
  it("rejects a deadline earlier than its start", () => {
    expect(() => Attempt.restore({ ...state(), deadline: 500 })).toThrow();
  });
  it("records a failed grading transition for an explicit retry", () => {
    const a = Attempt.restore(state());
    a.submit(2000);
    a.processing();
    a.fail();
    expect(a.snapshot().status).toBe("FAILED");
    a.processing();
    a.complete();
    expect(a.snapshot().status).toBe("COMPLETED");
  });
  it("rejects non-finite server time", () => {
    expect(() => Attempt.restore(state()).submit(NaN)).toThrow();
  });
});

describe("Restored lifecycle invariants", () => {
  it.each([
    { ...state(), status: "CANCELED" as import("../attempt").AttemptStatus },
    { ...state(), expired: true },
    { ...state(), status: "CREATED" as const, expired: true },
    { ...state(), status: "SUBMITTED" as const, submittedAt: 5000 },
    {
      ...state(),
      status: "SUBMITTED" as const,
      submittedAt: 5001,
      expired: true,
    },
    {
      ...state(),
      status: "EXPIRED" as const,
      submittedAt: 2000,
      expired: true,
    },
    { ...state(), status: "COMPLETED" as const, submittedAt: 5001 },
    { ...state(), status: "FAILED" as const, submittedAt: 2000, expired: true },
  ])("rejects inconsistent restored status/expiration: %j", (invalid) => {
    expect(() => Attempt.restore(invalid)).toThrow("Invalid attempt state");
  });

  it("starts a created attempt and prevents a second start", () => {
    const attempt = Attempt.restore({ ...state(), status: "CREATED" });
    attempt.start();
    expect(attempt.snapshot().status).toBe("IN_PROGRESS");
    expect(() => attempt.start()).toThrow("Attempt cannot start");
  });

  it("restores a completed expired submission without changing its provenance", () => {
    const persisted = {
      ...state(),
      status: "COMPLETED" as const,
      submittedAt: 5000,
      expired: true,
    };
    expect(Attempt.restore(persisted).snapshot()).toEqual(persisted);
  });
});
