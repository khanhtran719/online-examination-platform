import "@testing-library/jest-dom/vitest";

import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus } from "@web/app/session";
import type { ApiSuccess, Exam, HistoryItem, Page, Profile } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { DashboardPage } from "../dashboard-page";
import { useDashboard } from "../use-dashboard";

const state = vi.hoisted(() => ({
  getHistory: vi.fn(),
  browseExams: vi.fn(),
  memory: { lookup: vi.fn(), clear: vi.fn() },
  session: {
    status: "authenticated" as SessionStatus,
    epoch: 0,
    profile: null as Profile | null,
    error: null,
    logoutError: null,
    needsReauth: false,
    hasUnconfirmed: false,
    setUnconfirmed: vi.fn(),
    reload: vi.fn(),
    adoptProfile: vi.fn(),
    syncProfile: vi.fn(),
    replaceActor: vi.fn(),
    logout: vi.fn(),
    recover: vi.fn(),
  },
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: { getHistory: state.getHistory, browseExams: state.browseExams },
    mode: "demo",
  }),
}));
vi.mock("@web/app/session", () => ({ useSession: () => state.session }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));

function profile(actor: string): Profile {
  return {
    id: actor,
    email: `${actor}@example.test`,
    displayName: actor,
    emailVerifiedAt: "2026-10-13T00:00:00Z",
    leaderboardOptIn: false,
    revision: 1,
  };
}
function history(actor: string): ApiSuccess<Page<HistoryItem>> {
  return {
    data: {
      pageSize: 20,
      next: `${actor}-next`,
      items: [
        {
          attemptId: `${actor}-running`,
          examId: `${actor}-exam`,
          publishedVersionId: `${actor}-version`,
          startedAt: "2026-10-13T00:00:00Z",
          status: "IN_PROGRESS",
          expired: false,
          earned: null,
          possible: null,
        },
        {
          attemptId: `${actor}-completed`,
          examId: `${actor}-exam`,
          publishedVersionId: `${actor}-version`,
          startedAt: "2026-10-12T00:00:00Z",
          status: "COMPLETED",
          expired: false,
          earned: 5,
          possible: 6,
        },
      ],
    },
    meta: {
      httpStatus: 200,
      correlationId: null,
      retryAfterSeconds: null,
      idempotencyReplayed: false,
    },
  };
}
function catalog(actor: string): ApiSuccess<Page<Exam>> {
  return {
    data: {
      pageSize: 3,
      next: `${actor}-catalog-next`,
      items: [
        {
          id: `${actor}-exam`,
          title: `${actor} catalog fixture`,
          category: "TOEIC",
          publishedVersionId: `${actor}-version`,
          version: 1,
          durationSeconds: 1800,
          openAt: "2026-10-13T00:00:00Z",
          closeAt: "2026-10-14T00:00:00Z",
          displayTimezone: "Asia/Ho_Chi_Minh",
          attemptLimit: 3,
          questionCount: 10,
          scoringPolicy: "EXACT_MATCH_V1",
          explanationPolicy: "NEVER",
          leaderboardEnabled: false,
          sections: [],
        },
      ],
    },
    meta: {
      httpStatus: 200,
      correlationId: null,
      retryAfterSeconds: null,
      idempotencyReplayed: false,
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
const clients: QueryClient[] = [];
function mount(options: { page?: boolean; defaultRetry?: boolean | number } = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: options.defaultRetry ?? false,
        retryDelay: 0,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={["/dashboard"]}>
      <QueryClientProvider client={client}>
        {options.page ? <DashboardPage /> : null}
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );
  return { ...renderHook(() => useDashboard(), { wrapper }), client };
}
type Dashboard = ReturnType<typeof useDashboard> & {
  retryHistory?: () => Promise<unknown>;
  retryCatalog?: () => Promise<unknown>;
};
function retryHistory(value: Dashboard) {
  return value.retryHistory ? value.retryHistory() : value.history.refetch();
}
function retryCatalog(value: Dashboard) {
  return value.retryCatalog ? value.retryCatalog() : value.catalog.refetch();
}
function storedActor(client: QueryClient, actor: string) {
  return client
    .getQueryCache()
    .getAll()
    .filter((query) => query.queryKey.includes("dashboard"))
    .some((query) => JSON.stringify(query.state.data ?? null).includes(`${actor}-`));
}
async function flushResponses() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}
beforeEach(() => {
  vi.resetAllMocks();
  state.session.status = "authenticated";
  state.session.profile = profile("actor-a");
  state.session.epoch = 0;
  state.session.needsReauth = false;
  state.memory.lookup.mockReturnValue(null);
  state.getHistory.mockResolvedValue(history("actor-a"));
  state.browseExams.mockResolvedValue(catalog("actor-a"));
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  focusManager.setFocused(undefined);
});

describe("dashboard actor and protected-read fences", () => {
  it("hides and purges actor A snapshots before actor B's pending reads finish", async () => {
    const { result, rerender, client } = mount();
    await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
    await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
    const nextHistory = deferred<ApiSuccess<Page<HistoryItem>>>();
    const nextCatalog = deferred<ApiSuccess<Page<Exam>>>();
    state.getHistory.mockReturnValue(nextHistory.promise);
    state.browseExams.mockReturnValue(nextCatalog.promise);
    state.session.profile = profile("actor-b");
    state.session.epoch += 1;
    rerender();
    expect(result.current.current).toBeUndefined();
    expect(result.current.recent).toEqual([]);
    expect(result.current.catalog.data).toBeUndefined();
    expect(storedActor(client, "actor-a")).toBe(false);
    await waitFor(() => expect(state.getHistory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(state.browseExams).toHaveBeenCalledTimes(2));
    await act(async () => {
      nextHistory.resolve(history("actor-b"));
      nextCatalog.resolve(catalog("actor-b"));
      await flushResponses();
    });
    expect(result.current.current?.attemptId).toBe("actor-b-running");
    expect(result.current.catalog.data?.items[0]?.id).toBe("actor-b-exam");
  });

  it("rejects late actor A history and catalog responses after the actor changes", async () => {
    const oldHistory = deferred<ApiSuccess<Page<HistoryItem>>>();
    const oldCatalog = deferred<ApiSuccess<Page<Exam>>>();
    state.getHistory.mockReturnValueOnce(oldHistory.promise);
    state.browseExams.mockReturnValueOnce(oldCatalog.promise);
    const { result, rerender, client } = mount();
    state.getHistory.mockResolvedValue(history("actor-b"));
    state.browseExams.mockResolvedValue(catalog("actor-b"));
    state.session.profile = profile("actor-b");
    state.session.epoch += 1;
    rerender();
    await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-b-running"));
    await act(async () => {
      oldHistory.resolve(history("actor-a"));
      oldCatalog.resolve(catalog("actor-a"));
      await flushResponses();
    });
    expect(result.current.current?.attemptId).toBe("actor-b-running");
    expect(result.current.recent.map((item) => item.attemptId)).toEqual(["actor-b-completed"]);
    expect(result.current.catalog.data?.items[0]?.id).toBe("actor-b-exam");
    expect(storedActor(client, "actor-a")).toBe(false);
  });

  it.each(["anonymous", "loading", "unavailable", "reauth"] as const)(
    "hides and purges both snapshots when the session becomes %s",
    async (transition) => {
      const { result, rerender, client } = mount();
      await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
      await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
      state.session.epoch += 1;
      if (transition === "reauth") state.session.needsReauth = true;
      else {
        state.session.status = transition;
        state.session.profile = null;
      }
      rerender();
      expect(result.current.current).toBeUndefined();
      expect(result.current.recent).toEqual([]);
      expect(result.current.catalog.data).toBeUndefined();
      expect(storedActor(client, "actor-a")).toBe(false);
      expect(state.memory.clear).toHaveBeenCalled();
      const requests = [state.getHistory.mock.calls.length, state.browseExams.mock.calls.length];
      await act(async () => {
        await retryHistory(result.current);
        await retryCatalog(result.current);
      });
      expect([state.getHistory.mock.calls.length, state.browseExams.mock.calls.length]).toEqual(
        requests,
      );
    },
  );

  it.each([401, 403])(
    "removes cached attempts and latches history denial after %s",
    async (status) => {
      const { result, client } = mount();
      await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
      await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
      state.getHistory.mockRejectedValue(
        new ApiError({ kind: "http", status, errorCode: "Denied", message: "Denied" }),
      );
      await act(async () => {
        await retryHistory(result.current);
        await flushResponses();
      });
      expect(result.current.current).toBeUndefined();
      expect(result.current.recent).toEqual([]);
      expect(result.current.history.data).toBeUndefined();
      expect(result.current.catalog.data?.items[0]?.id).toBe("actor-a-exam");
      expect(
        client
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? null).includes("actor-a-running")),
      ).toBe(false);
      const requests = state.getHistory.mock.calls.length;
      await act(async () => {
        await retryHistory(result.current);
      });
      expect(state.getHistory).toHaveBeenCalledTimes(requests);
    },
  );

  it.each([401, 403])(
    "removes cached catalog and latches catalog denial after %s",
    async (status) => {
      const { result } = mount();
      await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
      await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
      state.browseExams.mockRejectedValue(
        new ApiError({ kind: "http", status, errorCode: "Denied", message: "Denied" }),
      );
      await act(async () => {
        await retryCatalog(result.current);
        await flushResponses();
      });
      expect(result.current.catalog.data).toBeUndefined();
      expect(result.current.current?.attemptId).toBe("actor-a-running");
      const requests = state.browseExams.mock.calls.length;
      await act(async () => {
        await retryCatalog(result.current);
      });
      expect(state.browseExams).toHaveBeenCalledTimes(requests);
    },
  );

  it("does not recreate private query data from responses arriving after unmount", async () => {
    const pendingHistory = deferred<ApiSuccess<Page<HistoryItem>>>();
    const pendingCatalog = deferred<ApiSuccess<Page<Exam>>>();
    state.getHistory.mockReturnValue(pendingHistory.promise);
    state.browseExams.mockReturnValue(pendingCatalog.promise);
    const { unmount, client } = mount();
    unmount();
    await act(async () => {
      pendingHistory.resolve(history("actor-a"));
      pendingCatalog.resolve(catalog("actor-a"));
      await flushResponses();
    });
    expect(storedActor(client, "actor-a")).toBe(false);
  });

  it("retains the loaded history after a transient read error with a truthful snapshot notice", async () => {
    const { result } = mount({ page: true });
    expect(await screen.findByText("5/6 điểm")).toBeInTheDocument();
    state.getHistory.mockRejectedValue(
      new ApiError({
        kind: "network",
        status: 0,
        errorCode: "Unavailable",
        message: "Unavailable",
      }),
    );
    await act(async () => {
      await retryHistory(result.current);
    });
    expect(result.current.current?.attemptId).toBe("actor-a-running");
    expect(screen.getByText("5/6 điểm")).toBeInTheDocument();
    expect(await screen.findByText(/Dữ liệu từ lần tải trước/i)).toBeInTheDocument();
  });

  it("serializes explicit retries independently for the two read channels", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
    await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
    const pendingHistory = deferred<ApiSuccess<Page<HistoryItem>>>();
    const pendingCatalog = deferred<ApiSuccess<Page<Exam>>>();
    state.getHistory.mockReturnValue(pendingHistory.promise);
    state.browseExams.mockReturnValue(pendingCatalog.promise);
    let retries!: Promise<unknown[]>;
    act(() => {
      retries = Promise.all([
        retryHistory(result.current),
        retryHistory(result.current),
        retryCatalog(result.current),
        retryCatalog(result.current),
      ]);
    });
    expect(state.getHistory).toHaveBeenCalledTimes(2);
    expect(state.browseExams).toHaveBeenCalledTimes(2);
    await act(async () => {
      pendingHistory.resolve(history("actor-a"));
      pendingCatalog.resolve(catalog("actor-a"));
      await retries;
    });
  });

  it("overrides automatic retry even when the QueryClient defaults enable it", async () => {
    state.getHistory.mockRejectedValue(
      new ApiError({
        kind: "network",
        status: 0,
        errorCode: "Unavailable",
        message: "Unavailable",
      }),
    );
    const { result } = mount({ defaultRetry: 2 });
    await waitFor(() => expect(result.current.history.error).not.toBeNull());
    await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
    expect(state.getHistory).toHaveBeenCalledTimes(1);
    expect(state.browseExams).toHaveBeenCalledTimes(1);
  });

  it("does not refresh the loaded dashboard automatically on window focus", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.current?.attemptId).toBe("actor-a-running"));
    await waitFor(() => expect(result.current.catalog.data?.items).toHaveLength(1));
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await flushResponses();
    });
    expect(state.getHistory).toHaveBeenCalledTimes(1);
    expect(state.browseExams).toHaveBeenCalledTimes(1);
  });
});
