import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useBrowse } from "../use-catalog";

const state = vi.hoisted(() => ({ browseExams: vi.fn(), memory: { clear: vi.fn() } }));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state }) }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
vi.mock("@web/app/session", () => ({
  useSession: () => ({ status: "authenticated", profile: { id: "candidate-a" } }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  state.browseExams.mockImplementation(async ({ cursor }) => ({
    data: {
      items: [{ id: cursor ?? "first", title: cursor ? "Beta" : "Alpha" }],
      next: cursor ? null : "cursor-two",
    },
  }));
});
afterEach(cleanup);
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/exams?category=TOEIC&keep=1"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  const hook = renderHook(
    () => ({ catalog: useBrowse(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
  return { ...hook, client };
}
it("searches only loaded titles without another remote request", async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  act(() => result.current.catalog.setSearch(" ALPHA "));
  expect(result.current.catalog.items).toHaveLength(1);
  act(() => result.current.catalog.setSearch("Beta"));
  expect(result.current.catalog.items).toHaveLength(0);
  expect(result.current.catalog.loaded).toHaveLength(1);
  expect(state.browseExams).toHaveBeenCalledTimes(1);
});
it("serializes load-more calls and refreshes only the first cursor page", async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  await act(async () => {
    await Promise.all([result.current.catalog.more(), result.current.catalog.more()]);
  });
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(2));
  expect(state.browseExams).toHaveBeenCalledTimes(2);
  await act(async () => {
    await result.current.catalog.refresh();
  });
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  expect(state.browseExams.mock.calls[2]![0]).toEqual({
    category: "TOEIC",
    pageSize: 20,
    cursor: undefined,
  });
  expect(state.browseExams).toHaveBeenCalledTimes(3);
});
it("keeps unrelated URL parameters and supports Back across category changes", async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  act(() => {
    result.current.catalog.setSearch("Alpha");
    result.current.catalog.choose("IELTS");
  });
  await waitFor(() => expect(result.current.catalog.category).toBe("IELTS"));
  expect(result.current.catalog.search).toBe("");
  expect(result.current.location.search).toContain("keep=1");
  act(() => result.current.navigate(-1));
  await waitFor(() => expect(result.current.catalog.category).toBe("TOEIC"));
});
it("does not append a late old-category response to the new category", async () => {
  const { result } = mount();
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  let resolve!: (value: unknown) => void;
  state.browseExams.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  let pending!: Promise<unknown>;
  act(() => {
    pending = result.current.catalog.more();
  });
  act(() => result.current.catalog.choose("IELTS"));
  await waitFor(() => expect(result.current.catalog.category).toBe("IELTS"));
  await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
  await act(async () => {
    resolve({ data: { items: [{ id: "old", title: "Secret old page" }], next: null } });
    await pending;
  });
  expect(result.current.catalog.loaded.map((item) => item.id)).toEqual(["first"]);
});
it.each([401, 403])(
  "purges all loaded category caches and latches access denial after %s",
  async (status) => {
    const { result, client } = mount();
    await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
    act(() => result.current.catalog.choose("IELTS"));
    await waitFor(() => expect(result.current.catalog.loaded).toHaveLength(1));
    state.browseExams.mockRejectedValue(
      new ApiError({ kind: "http", status, errorCode: "Denied", message: "Denied" }),
    );
    await act(async () => {
      await result.current.catalog.refresh();
    });
    await waitFor(() => expect(result.current.catalog.hidden).toBe(true));
    expect(result.current.catalog.loaded).toEqual([]);
    expect(state.memory.clear).toHaveBeenCalled();
    expect(
      client
        .getQueryCache()
        .getAll()
        .every((query) => query.state.data === undefined),
    ).toBe(true);
    const count = state.browseExams.mock.calls.length;
    act(() => result.current.catalog.choose("TOEIC"));
    await act(async () => {
      await result.current.catalog.refresh();
      await result.current.catalog.more();
    });
    expect(state.browseExams).toHaveBeenCalledTimes(count);
  },
);
