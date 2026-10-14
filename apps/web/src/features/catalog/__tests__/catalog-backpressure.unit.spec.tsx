import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useBrowse, useExamDetail } from "../use-catalog";

const state = vi.hoisted(() => ({
  api: { browseExams: vi.fn(), getExam: vi.fn() },
  session: {
    status: "authenticated",
    needsReauth: false,
    epoch: 0,
    profile: { id: "candidate-a" },
  },
  memory: { clear: vi.fn(), remember: vi.fn() },
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api }) }));
vi.mock("@web/app/session", () => ({ useSession: () => state.session }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));

const clients: QueryClient[] = [];
function provider(initialEntries = ["/exams?category=TOEIC&keep=1"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}
function browse(initialEntries?: string[]) {
  return renderHook(() => ({ catalog: useBrowse(), navigate: useNavigate() }), {
    wrapper: provider(initialEntries),
  });
}
function detail() {
  return renderHook(() => useExamDetail("exam-a"), { wrapper: provider() });
}
function limited(retryAfterSeconds: number | null) {
  return new ApiError({
    kind: "http",
    status: 429,
    errorCode: "RATE_LIMITED",
    message: "Vui lòng chờ trước khi thử lại.",
    retryAfterSeconds,
  });
}
async function advance(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function loaded(hook: ReturnType<typeof browse>) {
  await advance();
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
}

beforeEach(() => {
  onlineManager.setOnline(true);
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-13T10:00:00Z"));
  state.session.profile.id = "candidate-a";
  state.session.epoch = 0;
  state.session.needsReauth = false;
  state.api.browseExams.mockImplementation(async ({ category, cursor }) => ({
    data: {
      items: [{ id: `${category ?? "all"}-${cursor ?? "first"}`, title: "Loaded exam" }],
      next: cursor === "cursor-two" ? "cursor-three" : cursor ? null : "cursor-two",
    },
  }));
  state.api.getExam.mockResolvedValue({ data: { id: "exam-a", title: "Loaded detail" } });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

it("blocks a second browse refresh before its two-second rate limit is rendered", async () => {
  const hook = browse();
  await loaded(hook);
  state.api.browseExams.mockRejectedValueOnce(limited(2));

  await act(async () => {
    await hook.result.current.catalog.refresh();
    await hook.result.current.catalog.refresh();
  });

  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
});

it("keeps all loaded cursor pages when refresh and load-more are attempted during a wait", async () => {
  const hook = browse();
  await loaded(hook);
  await act(async () => hook.result.current.catalog.more());
  await advance();
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual([
    "TOEIC-first",
    "TOEIC-cursor-two",
  ]);
  state.api.browseExams.mockRejectedValueOnce(limited(3));
  await act(async () => hook.result.current.catalog.more());
  await advance();

  await act(async () => {
    await hook.result.current.catalog.refresh();
    await hook.result.current.catalog.more();
  });
  await advance();

  expect(state.api.browseExams).toHaveBeenCalledTimes(3);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual([
    "TOEIC-first",
    "TOEIC-cursor-two",
  ]);
});

it.each(["category", "page size"])(
  "does not send a new browse request from changing %s while rate limited",
  async (control) => {
    const hook = browse();
    await loaded(hook);
    state.api.browseExams.mockRejectedValueOnce(limited(3));
    await act(async () => {
      await hook.result.current.catalog.refresh();
      if (control === "category") hook.result.current.catalog.choose("IELTS");
      else hook.result.current.catalog.setPageSize(40);
    });
    await advance();

    expect(state.api.browseExams).toHaveBeenCalledTimes(2);
    await advance(3_000);
    expect(state.api.browseExams).toHaveBeenCalledTimes(2);
    await act(async () => hook.result.current.catalog.refresh());
    expect(state.api.browseExams).toHaveBeenCalledTimes(3);
  },
);

it("keeps browser Back from bypassing the wait and requires an explicit retry for the new URL", async () => {
  const hook = browse(["/exams?category=IELTS&keep=1", "/exams?category=TOEIC&keep=1"]);
  await loaded(hook);
  state.api.browseExams.mockRejectedValueOnce(limited(3));
  await act(async () => hook.result.current.catalog.refresh());
  await advance();
  act(() => hook.result.current.navigate(-1));
  await advance();

  expect(hook.result.current.catalog.category).toBe("IELTS");
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  await advance(3_000);
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  await act(async () => hook.result.current.catalog.refresh());
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(3);
  expect(state.api.browseExams.mock.calls[2]![0]).toEqual({
    category: "IELTS",
    pageSize: 20,
    cursor: undefined,
  });
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["IELTS-first"]);
});

it("waits sixty seconds when browse is rate limited without Retry-After", async () => {
  state.api.browseExams.mockRejectedValueOnce(limited(null));
  const hook = browse();
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(1);

  await advance(59_999);
  await act(async () => hook.result.current.catalog.refresh());
  expect(state.api.browseExams).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(state.api.browseExams).toHaveBeenCalledTimes(1);
  await act(async () => hook.result.current.catalog.refresh());
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
});

it("does not automatically retry browse when the advertised wait elapses", async () => {
  state.api.browseExams.mockRejectedValueOnce(limited(2));
  const hook = browse();
  await advance();
  await advance(2_000);

  expect(state.api.browseExams).toHaveBeenCalledTimes(1);
  await act(async () => hook.result.current.catalog.refresh());
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
});

it("does not retry rate-limited browse or detail implicitly when connectivity returns", async () => {
  state.api.browseExams.mockRejectedValueOnce(limited(3));
  state.api.getExam.mockRejectedValueOnce(limited(3));
  const browseHook = browse();
  const detailHook = detail();
  await advance();

  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(1);
  expect(state.api.getExam).toHaveBeenCalledTimes(1);
  await advance(3_000);
  onlineManager.setOnline(false);
  onlineManager.setOnline(true);
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(1);
  expect(state.api.getExam).toHaveBeenCalledTimes(1);

  await act(async () => {
    await browseHook.result.current.catalog.refresh();
    await detailHook.result.current.refresh();
  });
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  expect(state.api.getExam).toHaveBeenCalledTimes(2);
});

it("keeps detail data and blocks a duplicate refresh until its two-second wait expires", async () => {
  const hook = detail();
  await advance();
  expect(hook.result.current.data?.id).toBe("exam-a");
  state.api.getExam.mockRejectedValueOnce(limited(2));
  await act(async () => {
    await hook.result.current.refresh();
    await hook.result.current.refresh();
  });
  await advance();

  expect(state.api.getExam).toHaveBeenCalledTimes(2);
  expect(hook.result.current.data?.id).toBe("exam-a");
  await advance(1_999);
  await act(async () => hook.result.current.refresh());
  expect(state.api.getExam).toHaveBeenCalledTimes(2);
  await advance(1);
  expect(state.api.getExam).toHaveBeenCalledTimes(2);
  await act(async () => hook.result.current.refresh());
  await advance();
  expect(state.api.getExam).toHaveBeenCalledTimes(3);
  expect(hook.result.current.query.error).toBeNull();
});

it("uses an explicit detail retry after the sixty-second fallback when no Retry-After is sent", async () => {
  state.api.getExam.mockRejectedValueOnce(limited(null));
  const hook = detail();
  await advance();
  await advance(59_999);
  await act(async () => hook.result.current.refresh());

  expect(state.api.getExam).toHaveBeenCalledTimes(1);
  expect(hook.result.current.data).toBeUndefined();
  await advance(1);
  expect(state.api.getExam).toHaveBeenCalledTimes(1);
  await act(async () => hook.result.current.refresh());
  await advance();
  expect(state.api.getExam).toHaveBeenCalledTimes(2);
  expect(hook.result.current.data?.id).toBe("exam-a");
});

it("does not apply an old actor's delayed rate limit to the current actor's browse reads", async () => {
  const hook = browse();
  await loaded(hook);
  let reject!: (error: unknown) => void;
  state.api.browseExams.mockImplementationOnce(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  let pending!: Promise<unknown>;
  act(() => {
    pending = hook.result.current.catalog.refresh();
  });
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  state.session.profile.id = "candidate-b";
  state.session.epoch += 1;
  hook.rerender();
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(3);

  await act(async () => {
    reject(limited(3));
    await pending;
  });
  await advance();
  await act(async () => hook.result.current.catalog.refresh());
  await advance();

  expect(state.api.browseExams).toHaveBeenCalledTimes(4);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
  expect(hook.result.current.catalog.query.error).toBeNull();
});

it("honors an advertised service-unavailable wait without an automatic retry", async () => {
  const hook = browse();
  await loaded(hook);
  state.api.browseExams.mockRejectedValueOnce(
    new ApiError({
      kind: "unavailable",
      status: 503,
      errorCode: "Unavailable",
      message: "Busy",
      retryAfterSeconds: 2,
    }),
  );
  await act(async () => hook.result.current.catalog.refresh());
  await advance(1_999);
  await act(async () => hook.result.current.catalog.refresh());
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  await advance(1);
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  await act(async () => hook.result.current.catalog.refresh());
  expect(state.api.browseExams).toHaveBeenCalledTimes(3);
});

it("permits explicit recovery from an unavailable read without retry advice", async () => {
  const hook = browse();
  await loaded(hook);
  state.api.browseExams.mockRejectedValueOnce(
    new ApiError({ kind: "unavailable", status: 503, errorCode: "Unavailable", message: "Busy" }),
  );
  await act(async () => hook.result.current.catalog.refresh());
  await advance();
  expect(state.api.browseExams).toHaveBeenCalledTimes(2);
  expect(hook.result.current.catalog.loaded.map((exam) => exam.id)).toEqual(["TOEIC-first"]);
  await act(async () => hook.result.current.catalog.refresh());
  expect(state.api.browseExams).toHaveBeenCalledTimes(3);
});
