import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Attempt } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";
import { nextPollDelayMs } from "@web/shared/polling";

import { StatusPage } from "../status-page";
import { useAttemptPolling } from "../use-attempt-polling";

const state = vi.hoisted(() => ({
  api: { getAttemptStatus: vi.fn() },
  session: { status: "authenticated", needsReauth: false, profile: { id: "actor" } },
  memory: { clear: vi.fn() },
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api }) }));
vi.mock("@web/app/session", () => ({ useSession: () => state.session }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
const pending: Attempt = {
  id: "first",
  examId: "exam",
  publishedVersionId: "version",
  revision: 1,
  status: "SUBMITTED",
  startedAt: "2026-10-13T10:00:00Z",
  deadline: "2026-10-13T11:00:00Z",
  submittedAt: "2026-10-13T10:30:00Z",
  expired: false,
  serverNow: "2026-10-13T10:30:00Z",
  canSave: false,
  resultAvailable: false,
  pollAfterSeconds: 2,
  replayPending: false,
};
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  state.session.profile.id = "actor";
  state.session.needsReauth = false;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.useRealTimers();
});

it("never shortens server poll/Retry-After hints with the exponential cap or jitter", () => {
  expect(
    nextPollDelayMs({ attemptIndex: 0, pollAfterSeconds: 8, retryAfterSeconds: 60, random: 0 }),
  ).toBeGreaterThanOrEqual(60_000);
  expect(
    nextPollDelayMs({ attemptIndex: 0, pollAfterSeconds: 8, retryAfterSeconds: null, random: 0 }),
  ).toBeGreaterThanOrEqual(8_000);
});
it.each([401, 403, 404])("clears the loaded status and stops after %i", async (status) => {
  state.api.getAttemptStatus
    .mockResolvedValueOnce({ data: pending, meta: {} })
    .mockRejectedValue(
      new ApiError({ kind: "http", status, errorCode: "DENIED", message: "Không thể xem" }),
    );
  const hook = renderHook(() => useAttemptPolling("first"));
  await advance();
  expect(hook.result.current.attempt?.id).toBe("first");
  await advance(2_000);
  expect(hook.result.current.attempt).toBeNull();
  await advance(60_000);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(2);
  expect(state.memory.clear).toHaveBeenCalled();
});
it("does not bypass Retry-After when the tab becomes visible", async () => {
  state.api.getAttemptStatus.mockRejectedValue(
    new ApiError({
      kind: "http",
      status: 429,
      errorCode: "RATE_LIMITED",
      message: "Chờ",
      retryAfterSeconds: 60,
    }),
  );
  renderHook(() => useAttemptPolling("first"));
  await advance();
  document.dispatchEvent(new Event("visibilitychange"));
  await advance(59_999);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(2);
});
it("does not issue a request after the five-minute budget expires in a hidden tab", async () => {
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  state.api.getAttemptStatus.mockResolvedValue({ data: pending, meta: {} });
  const hook = renderHook(() => useAttemptPolling("first"));
  await advance(300_000);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  document.dispatchEvent(new Event("visibilitychange"));
  await advance();
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
  expect(hook.result.current.stopped).toContain("5 phút");
});
it("offers an explicit check when the budget expires before any status was loaded", async () => {
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  state.api.getAttemptStatus.mockResolvedValue({ data: pending, meta: {} });
  render(
    <MemoryRouter initialEntries={["/attempts/first/status"]}>
      <Routes>
        <Route path="/attempts/:attemptId/status" element={<StatusPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await advance(300_000);
  expect(screen.getByRole("button", { name: "Kiểm tra lại" })).toBeTruthy();
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
});
it("hides an old actor's status immediately and ignores its late response", async () => {
  let resolve!: (value: unknown) => void;
  state.api.getAttemptStatus
    .mockResolvedValueOnce({ data: pending, meta: {} })
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockImplementation(() => new Promise(() => undefined));
  const hook = renderHook(() => useAttemptPolling("first"));
  await advance();
  await advance(2_000);
  state.session.profile.id = "second-actor";
  hook.rerender();
  expect(hook.result.current.attempt).toBeNull();
  await act(async () => resolve({ data: { ...pending, status: "COMPLETED" }, meta: {} }));
  expect(hook.result.current.attempt).toBeNull();
});
it("rejects a status response belonging to another attempt", async () => {
  state.api.getAttemptStatus.mockResolvedValue({ data: { ...pending, id: "other" }, meta: {} });
  const hook = renderHook(() => useAttemptPolling("first"));
  await advance();
  expect(hook.result.current.attempt).toBeNull();
  expect(hook.result.current.error).toBeTruthy();
});
it("does not overlap a slow read and hides data when reauthentication is needed", async () => {
  state.api.getAttemptStatus
    .mockResolvedValueOnce({ data: pending, meta: {} })
    .mockImplementation(() => new Promise(() => undefined));
  const hook = renderHook(() => useAttemptPolling("first"));
  await advance(20_000);
  document.dispatchEvent(new Event("visibilitychange"));
  await advance(20_000);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(2);
  state.session.needsReauth = true;
  hook.rerender();
  expect(hook.result.current.attempt).toBeNull();
});
