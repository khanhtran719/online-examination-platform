import { describe, expect, it } from "vitest";

import type { Attempt } from "@web/shared/api/dto";
import { canRestartPoll, monitorDelayMs, nextPollDelayMs } from "@web/shared/polling";

import { shouldStopPolling } from "../attempt-polling-policy";

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
