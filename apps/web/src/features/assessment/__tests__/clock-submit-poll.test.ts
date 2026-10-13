import { describe, expect, it } from "vitest";

import type { SubmitReceipt } from "@web/shared/api/dto";

import { clockMilestone, formatRemaining, remainingMs } from "../clock";
import {
  beginDeadlineSubmit,
  beginManualSubmit,
  cancelBlockedSubmit,
  createSubmitState,
  markSubmitAccepted,
  markSubmitUnknown,
  noteSavesSettled,
} from "../submit-flow";

const sample = {
  serverNowMs: Date.parse("2026-10-06T13:10:00.000Z"),
  monotonicAtSample: 1_000,
  deadlineMs: Date.parse("2026-10-06T13:45:00.000Z"),
  rttMs: 400,
  canSave: true,
};

describe("server clock", () => {
  it("uses monotonic elapsed and ignores a wall-clock jump", () => {
    expect(remainingMs(sample, 1_000)).toBe(35 * 60 * 1000 - 200);
    expect(remainingMs(sample, 61_000)).toBe(34 * 60 * 1000 - 200);
    expect(remainingMs({ ...sample, monotonicAtSample: 500_000 }, 500_000)).toBe(
      35 * 60 * 1000 - 200,
    );
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
