import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Attempt } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { viewAnswer } from "../autosave";
import { RoomDialogs } from "../room-dialogs";
import { useExamRoom } from "../use-exam-room";

const state = vi.hoisted(() => ({
  api: {
    resumeAttempt: vi.fn(),
    getQuestions: vi.fn(),
    getAnswers: vi.fn(),
    saveAnswers: vi.fn(),
    submitAttempt: vi.fn(),
    getAttemptStatus: vi.fn(),
  },
  session: {
    status: "authenticated",
    needsReauth: false,
    profile: { id: "actor", email: "a@test.invalid" },
    setUnconfirmed: vi.fn(),
    adoptProfile: vi.fn(),
    replaceActor: vi.fn(),
  },
  memory: { clear: vi.fn() },
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api }) }));
vi.mock("@web/app/session", () => ({ useSession: () => state.session }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
const attempt: Attempt = {
  id: "first",
  examId: "exam",
  publishedVersionId: "version",
  revision: 1,
  status: "IN_PROGRESS",
  startedAt: "2026-10-13T10:00:00Z",
  deadline: "2026-10-13T11:00:00Z",
  submittedAt: null,
  expired: false,
  serverNow: "2026-10-13T10:00:00Z",
  canSave: true,
  resultAvailable: false,
  pollAfterSeconds: 2,
  replayPending: false,
};
const question = {
  id: "q",
  sectionId: "s",
  position: 1,
  type: "SINGLE_CHOICE",
  prompt: "Private question",
  points: 2,
  options: [
    { id: "a", text: "A", position: 1 },
    { id: "b", text: "B", position: 2 },
  ],
};
const envelope = <T,>(data: T) => ({ data, meta: {} });
const failure = (status: number, retryAfterSeconds?: number) =>
  new ApiError({
    kind: "http",
    status,
    message: "Không thể tiếp tục",
    errorCode: "DENIED",
    retryAfterSeconds,
  });
function setup(id = "first") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return {
    client,
    ...renderHook(({ attemptId }) => useExamRoom(attemptId), {
      wrapper,
      initialProps: { attemptId: id },
    }),
  };
}
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function ready(hook: ReturnType<typeof setup>) {
  for (let i = 0; i < 20 && !viewAnswer(hook.result.current.save, "q").known; i += 1)
    await advance(50);
  expect(viewAnswer(hook.result.current.save, "q").known).toBe(true);
}
beforeEach(() => {
  onlineManager.setOnline(true);
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  state.session.status = "authenticated";
  state.session.needsReauth = false;
  state.session.profile.id = "actor";
  state.api.resumeAttempt.mockImplementation(async (id: string) => envelope({ ...attempt, id }));
  state.api.getQuestions.mockResolvedValue(envelope({ items: [question], next: null }));
  state.api.getAnswers.mockResolvedValue(envelope({ items: [], next: null }));
  state.api.saveAnswers.mockResolvedValue(
    envelope({
      attemptId: "first",
      acceptedAt: "2026-10-13T10:01:00Z",
      answers: [{ questionId: "q", version: 1 }],
    }),
  );
  state.api.submitAttempt.mockRejectedValue(failure(503));
  state.api.getAttemptStatus.mockResolvedValue(envelope(attempt));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.useRealTimers();
});

it("does not read private room data without an authenticated actor", async () => {
  state.session.status = "anonymous";
  const hook = setup();
  await advance(2_000);
  expect(state.api.resumeAttempt).not.toHaveBeenCalled();
  expect(hook.result.current.questions.data).toBeUndefined();
});
it("allows editing loaded questions once the answer scope is complete without loading every question page", async () => {
  state.api.getQuestions.mockResolvedValue(envelope({ items: [question], next: "more-questions" }));
  const hook = setup();
  await advance(100);
  expect(hook.result.current.questions.hasNextPage).toBe(true);
  expect(hook.result.current.answers.hasNextPage).toBe(false);
  expect(viewAnswer(hook.result.current.save, "q").known).toBe(true);
  act(() => hook.result.current.change("q", ["a"], false));
  await advance(750);
  expect(state.api.saveAnswers).toHaveBeenCalledTimes(1);
  expect(state.api.getQuestions).toHaveBeenCalledTimes(1);
});
it("keys room reads by actor and discards the old actor's cached questions", async () => {
  const hook = setup();
  await ready(hook);
  expect(hook.result.current.questions.data?.pages[0]?.items[0]?.prompt).toBe("Private question");
  state.api.getQuestions.mockImplementation(() => new Promise(() => undefined));
  state.session.profile.id = "other";
  hook.rerender({ attemptId: "first" });
  expect(hook.result.current.questions.data).toBeUndefined();
  await advance(50);
  expect(state.api.resumeAttempt).toHaveBeenCalledTimes(2);
  expect(hook.client.getQueryData(["attempt-questions", "actor", "first"])).toBeUndefined();
});
it("ignores a save response from an attempt that is no longer mounted", async () => {
  let reject!: (error: unknown) => void;
  state.api.saveAnswers.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.change("q", ["a"], false));
  await advance(750);
  hook.rerender({ attemptId: "second" });
  await advance(50);
  await act(async () => reject(failure(401)));
  expect(hook.result.current.save.authenticated).toBe(true);
  expect(hook.result.current.save.inFlight).toBeNull();
  expect(hook.result.current.notice).toBeNull();
});
it.each([403, 404])(
  "clears questions and drafts after a save is denied with %i",
  async (status) => {
    state.api.saveAnswers.mockRejectedValue(failure(status));
    const hook = setup();
    await ready(hook);
    act(() => hook.result.current.change("q", ["a"], false));
    await advance(750);
    expect(hook.result.current.questions.data).toBeUndefined();
    expect(hook.result.current.save.drafts).toEqual({});
    expect(state.memory.clear).toHaveBeenCalled();
    await advance(30_000);
    expect(state.api.saveAnswers).toHaveBeenCalledTimes(1);
  },
);
it("does not retain partial questions when answer access is forbidden", async () => {
  state.api.getAnswers.mockRejectedValue(failure(403));
  const hook = setup();
  await advance(100);
  expect(hook.result.current.questions.data).toBeUndefined();
  expect(hook.result.current.attemptQuery.data).toBeUndefined();
  expect(state.memory.clear).toHaveBeenCalled();
});
it("does not resolve a conflict from a snapshot missing the conflicted answer", async () => {
  state.api.saveAnswers.mockRejectedValue(failure(409));
  state.api.getAnswers
    .mockResolvedValueOnce(
      envelope({
        items: [
          { questionId: "q", selectedOptionIds: ["b"], marked: false, version: 2, updatedAt: null },
        ],
        next: null,
      }),
    )
    .mockResolvedValue(
      envelope({
        items: [
          {
            questionId: "unrelated",
            selectedOptionIds: ["x"],
            marked: false,
            version: 1,
            updatedAt: "2026-10-13T10:01:00Z",
          },
        ],
        next: null,
      }),
    );
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.change("q", ["a"], false));
  await advance(750);
  expect(hook.result.current.save.phase).toBe("conflict");
  act(() => hook.result.current.resolveServer());
  expect(hook.result.current.save.phase).toBe("conflict");
  expect(viewAnswer(hook.result.current.save, "q").selectedOptionIds).toEqual(["a"]);
});
it("keeps offline edits in memory and freezes editing at the server deadline", async () => {
  state.api.resumeAttempt.mockResolvedValue(
    envelope({ ...attempt, deadline: "2026-10-13T10:00:03Z" }),
  );
  const hook = setup();
  await ready(hook);
  act(() => window.dispatchEvent(new Event("offline")));
  act(() => hook.result.current.change("q", ["a"], false));
  expect(viewAnswer(hook.result.current.save, "q").selectedOptionIds).toEqual(["a"]);
  await advance(3_000);
  expect(hook.result.current.save.editingFrozen).toBe(true);
  expect(state.api.saveAnswers).not.toHaveBeenCalled();
});
it("does not label a batch saved when its receipt omits the captured answer", async () => {
  state.api.saveAnswers.mockResolvedValue(
    envelope({ attemptId: "first", acceptedAt: "2026-10-13T10:01:00Z", answers: [] }),
  );
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.change("q", ["a"], false));
  await advance(750);
  expect(state.api.saveAnswers).toHaveBeenCalledTimes(1);
  expect(hook.result.current.save.lastAcceptedAt).toBeNull();
});
it("stops unknown submit checks after five minutes, including a held request", async () => {
  state.api.getAttemptStatus.mockImplementation(() => new Promise(() => undefined));
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(301_000);
  expect(hook.result.current.submitStopped).toBe(true);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(1);
  expect(hook.result.current.submit.phase).toBe("verifying");
});
it("does not overlap slow status reconciliation after an unknown submit", async () => {
  state.api.getAttemptStatus.mockImplementation(() => new Promise(() => undefined));
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(15_000);
  expect(state.api.submitAttempt).toHaveBeenCalledTimes(1);
  expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(1);
  expect(hook.result.current.submit.phase).toBe("verifying");
});
it("warns before closing the page while submission remains unconfirmed", async () => {
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(300);
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});
it("honors Retry-After before reconciling or replaying an unknown submit", async () => {
  state.api.submitAttempt.mockRejectedValue(failure(503, 60));
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(59_000);
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
  expect(state.api.submitAttempt).toHaveBeenCalledTimes(1);
});
it("does not accept a submission receipt belonging to a different attempt", async () => {
  state.api.submitAttempt.mockResolvedValue(
    envelope({
      attemptId: "other",
      submissionId: "submission",
      acceptedAt: "2026-10-13T10:01:00Z",
      acceptanceState: "SUBMITTED",
      expired: false,
    }),
  );
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(500);
  expect(hook.result.current.submit.phase).not.toBe("accepted");
});
it("pauses submit reconciliation while the same actor needs reauthentication", async () => {
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.requestSubmit());
  await advance(300);
  state.session.needsReauth = true;
  hook.rerender({ attemptId: "first" });
  const posts = state.api.submitAttempt.mock.calls.length;
  await advance(10_000);
  expect(state.api.submitAttempt).toHaveBeenCalledTimes(posts);
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
});
it("hides the conflict dialog while reauthentication is required", async () => {
  state.api.saveAnswers.mockRejectedValue(failure(409));
  const hook = setup();
  await ready(hook);
  act(() => hook.result.current.change("q", ["a"], false));
  await advance(750);
  state.session.needsReauth = true;
  hook.rerender({ attemptId: "first" });
  render(
    <RoomDialogs
      room={hook.result.current}
      progress="1/1"
      confirmSubmit={false}
      leave={false}
      onCloseSubmit={() => undefined}
      onCloseLeave={() => undefined}
      onLeave={() => undefined}
    />,
  );
  expect(screen.queryByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" })).toBeNull();
});
