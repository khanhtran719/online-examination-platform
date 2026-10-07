import { describe, expect, it } from "vitest";
import { clockMilestone, formatRemaining, remainingMs } from "../clock";
import { canRestartPoll, monitorDelayMs, nextPollDelayMs, shouldStopPolling } from "../polling";
import {
  beginDeadlineSubmit,
  beginManualSubmit,
  cancelBlockedSubmit,
  createSubmitState,
  markSubmitAccepted,
  markSubmitUnknown,
  noteSavesSettled,
} from "../submit-flow";
import type { Attempt, SubmitReceipt } from "../../../shared/api/dto";

const sample = {
  serverNowMs: Date.parse("2026-10-06T13:10:00.000Z"),
  monotonicAtSample: 1_000,
  deadlineMs: Date.parse("2026-10-06T13:45:00.000Z"),
  rttMs: 400,
  canSave: true,
};

describe("server clock", () => {
  it("uses monotonic elapsed and ignores a wall-clock jump", () => {
    expect(remainingMs(sample, 1_000)).toBe(35 * 60 * 1000);
    expect(remainingMs(sample, 61_000)).toBe(34 * 60 * 1000);
    expect(remainingMs({ ...sample, monotonicAtSample: 500_000 }, 500_000)).toBe(35 * 60 * 1000);
    expect(remainingMs(sample, 1_000 + 36 * 60 * 1000)).toBe(0);
  });

  it("announces only the five-minute, one-minute and zero milestones", () => {
    expect(clockMilestone(6 * 60 * 1000, 5 * 60 * 1000)).toBe("five");
    expect(clockMilestone(90_000, 60_000)).toBe("one");
    expect(clockMilestone(1_000, 0)).toBe("zero");
    expect(clockMilestone(20_000, 19_000)).toBeNull();
    expect(formatRemaining(32 * 60 * 1000 + 14_000)).toBe("32:14");
  });
});

describe("submit flow", () => {
  it("keeps one key, blocks on failed saves, and reconciles a lost acknowledgement", () => {
    const started = beginManualSubmit(createSubmitState(), 2, () => "submit-key");
    expect(started.phase).toBe("flushing");
    const blocked = noteSavesSettled(started, 1);
    expect(blocked.phase).toBe("save-blocked");
    expect(cancelBlockedSubmit(blocked).phase).toBe("idle");
    const posting = noteSavesSettled(started, 0);
    expect(posting.phase).toBe("posting");
    expect(posting.key).toBe("submit-key");
    const unknown = markSubmitUnknown(posting);
    expect(unknown.phase).toBe("verifying");
    expect(unknown.key).toBe("submit-key");
    const again = beginManualSubmit(unknown, 0, () => "other-key");
    expect(again.key).toBe("submit-key");
    const receipt: SubmitReceipt = {
      attemptId: "00000000-0000-4000-8000-000000000004",
      submissionId: "00000000-0000-4000-8000-000000000005",
      acceptedAt: "2026-10-06T13:44:50.000Z",
      acceptanceState: "SUBMITTED",
      expired: false,
    };
    expect(markSubmitAccepted(unknown, receipt).phase).toBe("accepted");
  });

  it("submits persisted answers at the deadline and retains the unconfirmed count", () => {
    const deadline = beginDeadlineSubmit(createSubmitState(), 3, () => "deadline-key");
    const posting = noteSavesSettled(deadline, 3);
    expect(posting.phase).toBe("posting");
    expect(posting.unconfirmedCount).toBe(3);
    expect(posting.key).toBe("deadline-key");
  });
});

describe("status polling", () => {
  const attempt = {
    id: "00000000-0000-4000-8000-000000000004",
    examId: "00000000-0000-4000-8000-000000000001",
    publishedVersionId: "00000000-0000-4000-8000-000000000002",
    revision: 1,
    status: "SUBMITTED",
    startedAt: "2026-10-06T13:00:00.000Z",
    deadline: "2026-10-06T13:45:00.000Z",
    submittedAt: "2026-10-06T13:44:50.000Z",
    expired: false,
    serverNow: "2026-10-06T13:44:50.000Z",
    canSave: false,
    resultAvailable: false,
    pollAfterSeconds: 0,
    replayPending: false,
  } satisfies Attempt;

  it("backs off with jitter, honors hints, and stops on terminal states or five minutes", () => {
    expect(
      nextPollDelayMs({
        attemptIndex: 0,
        pollAfterSeconds: 0,
        retryAfterSeconds: null,
        random: 0.5,
      }),
    ).toBe(2000);
    expect(
      nextPollDelayMs({ attemptIndex: 3, pollAfterSeconds: 0, retryAfterSeconds: null, random: 0 }),
    ).toBe(8000);
    expect(
      nextPollDelayMs({ attemptIndex: 0, pollAfterSeconds: 0, retryAfterSeconds: 8, random: 0.5 }),
    ).toBe(8000);
    expect(shouldStopPolling(attempt, 1_000)).toBe(false);
    expect(shouldStopPolling({ ...attempt, status: "COMPLETED" }, 1_000)).toBe(true);
    expect(shouldStopPolling({ ...attempt, status: "FAILED", replayPending: false }, 1_000)).toBe(
      true,
    );
    expect(shouldStopPolling({ ...attempt, status: "FAILED", replayPending: true }, 1_000)).toBe(
      false,
    );
    expect(shouldStopPolling(attempt, 5 * 60 * 1000)).toBe(true);
  });

  it("does not restart a stopped or in-flight poll when the tab becomes visible", () => {
    expect(
      canRestartPoll({ hidden: false, cancelled: false, stopped: true, inFlight: false }),
    ).toBe(false);
    expect(
      canRestartPoll({ hidden: false, cancelled: false, stopped: false, inFlight: true }),
    ).toBe(false);
    expect(
      canRestartPoll({ hidden: true, cancelled: false, stopped: false, inFlight: false }),
    ).toBe(false);
    expect(
      canRestartPoll({ hidden: false, cancelled: false, stopped: false, inFlight: false }),
    ).toBe(true);
  });

  it("keeps monitor refresh between 10 and 15 seconds", () => {
    expect(monitorDelayMs(0)).toBe(10_000);
    expect(monitorDelayMs(1)).toBe(15_000);
    expect(monitorDelayMs(0.5)).toBe(12_500);
  });
});
