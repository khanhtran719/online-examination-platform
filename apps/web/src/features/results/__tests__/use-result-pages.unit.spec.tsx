import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useHistory, useLeaderboard } from "../use-result-pages";

const state = vi.hoisted(() => ({ read: vi.fn(), memory: { clear: vi.fn() }, reauth: false }));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: {
      getHistory: (query: unknown) => state.read(query),
      getLeaderboard: (_exam: string, _version: string, query: unknown) => state.read(query),
    },
  }),
}));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: "authenticated",
    profile: { id: "actor" },
    needsReauth: state.reauth,
  }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.reauth = false;
  state.read.mockImplementation(async ({ cursor }) => ({
    data: { items: [{ id: cursor ?? "first" }], pageSize: 20, next: cursor ? null : "page-two" },
  }));
});
afterEach(cleanup);
function mount(kind: "history" | "leaderboard") {
  const client = new QueryClient(); // Verify the controller's own retry policy.
  let version = "version-a";
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => (kind === "history" ? useHistory() : useLeaderboard("exam", version)),
    { wrapper },
  );
  return {
    ...hook,
    client,
    version: (next: string) => {
      version = next;
      hook.rerender();
    },
  };
}
it.each(["history", "leaderboard"] as const)(
  "serializes %s load-more/refresh and restarts its cursor chain",
  async (kind) => {
    const { result } = mount(kind);
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => {
      await Promise.all([result.current.more(), result.current.more(), result.current.refresh()]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(state.read).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.all([result.current.refresh(), result.current.refresh()]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(state.read.mock.calls[2]![0]).toEqual({ pageSize: 20, cursor: undefined });
    expect(state.read).toHaveBeenCalledTimes(3);
  },
);
it.each(["history", "leaderboard"] as const)(
  "retains a %s snapshot on transient failure, without automatic retry",
  async (kind) => {
    const { result } = mount(kind);
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    state.read.mockRejectedValueOnce(
      new ApiError({ kind: "http", status: 503, errorCode: "Unavailable", message: "Unavailable" }),
    );
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.query.isError).toBe(true));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hidden).toBe(false);
    expect(result.current.query.failureCount).toBe(1);
    expect(state.read).toHaveBeenCalledTimes(2);
    await act(async () => {
      await result.current.refresh();
    });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  },
);
it("discards a late page from the previous leaderboard version", async () => {
  const { result, version, client } = mount("leaderboard");
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  let resolve!: (value: unknown) => void;
  state.read.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let pending!: Promise<unknown>;
  act(() => {
    pending = result.current.more();
  });
  version("version-b");
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  await act(async () => {
    resolve({ data: { items: [{ id: "old-private-page" }], next: null, pageSize: 20 } });
    await pending;
  });
  expect(result.current.items).toEqual([{ id: "first" }]);
  expect(client.getQueryData(["leaderboard", "actor", "exam", "version-a"])).toBeUndefined();
});
it.each(["history", "leaderboard"] as const)(
  "cannot restore a late %s page after session invalidation",
  async (kind) => {
    const { result, rerender, client } = mount(kind);
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    let resolve!: (value: unknown) => void;
    state.read.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.more();
    });
    state.reauth = true;
    rerender();
    await waitFor(() => expect(result.current.hidden).toBe(true));
    await act(async () => {
      resolve({ data: { items: [{ id: "late-private-page" }], next: null, pageSize: 20 } });
      await pending;
    });
    expect(result.current.items).toEqual([]);
    expect(
      client.getQueriesData({ queryKey: [kind] }).every(([, data]) => data === undefined),
    ).toBe(true);
  },
);
