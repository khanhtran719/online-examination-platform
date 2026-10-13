import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useReportPages } from "../use-report-pages";

afterEach(cleanup);
function setup(
  read: (cursor?: string) => Promise<{ items: string[]; next: string | null; pageSize: number }>,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = renderHook(
    ({ allowed, version }) =>
      useReportPages({ key: ["report", version], scope: ["report"], allowed, read }),
    {
      initialProps: { allowed: true, version: "v1" },
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  return { ...view, client };
}
it("restarts at the first page instead of replaying old cursor chains", async () => {
  const read = vi.fn(async (cursor?: string) => ({
    items: [cursor ?? "first"],
    next: cursor ? null : "opaque-next",
    pageSize: 1,
  }));
  const view = setup(read);
  await waitFor(() => expect(view.result.current.items).toEqual(["first"]));
  await act(() => view.result.current.more());
  await waitFor(() => expect(view.result.current.items).toEqual(["first", "opaque-next"]));
  await act(() => view.result.current.refresh());
  expect(read.mock.calls.map(([c]) => c)).toEqual([undefined, "opaque-next", undefined]);
  await waitFor(() => expect(view.result.current.items).toEqual(["first"]));
});
it("serializes refresh/load-more and preserves prior rows on a transient refresh error", async () => {
  const read = vi.fn().mockResolvedValueOnce({ items: ["old"], next: "next", pageSize: 1 });
  const view = setup(read);
  await waitFor(() => expect(view.result.current.items).toEqual(["old"]));
  let reject!: (e: unknown) => void;
  read.mockImplementation(
    () =>
      new Promise((_resolve, r) => {
        reject = r;
      }),
  );
  let first!: Promise<void>;
  act(() => {
    first = view.result.current.refresh();
    void view.result.current.refresh();
    void view.result.current.more();
  });
  expect(read).toHaveBeenCalledTimes(2);
  await act(async () => {
    reject(new Error("transient"));
    await first;
  });
  expect(view.result.current.items).toEqual(["old"]);
  await waitFor(() => expect(view.result.current.query.error).toBeTruthy());
});
it("cancels private data on permission loss and discards an old response after regrant", async () => {
  let resolve!: (p: { items: string[]; next: null; pageSize: number }) => void;
  const read = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue({ items: ["new"], next: null, pageSize: 1 });
  const view = setup(read);
  await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  view.rerender({ allowed: false, version: "v1" });
  expect(view.result.current.items).toEqual([]);
  expect(view.client.getQueryData(["report", "v1"])).toBeUndefined();
  view.rerender({ allowed: true, version: "v1" });
  await waitFor(() => expect(view.result.current.items).toEqual(["new"]));
  await act(async () => {
    resolve({ items: ["secret-old"], next: null, pageSize: 1 });
  });
  expect(view.result.current.items).toEqual(["new"]);
});
it("purges every cached filter in the protected report scope after 403", async () => {
  const read = vi
    .fn()
    .mockRejectedValue(
      new ApiError({ kind: "http", status: 403, errorCode: "Forbidden", message: "denied" }),
    );
  const view = setup(read);
  view.client.setQueryData(["report", "other-version"], { secret: true });
  await waitFor(() => expect(view.result.current.hidden).toBe(true));
  expect(view.client.getQueryData(["report", "other-version"])).toBeUndefined();
  view.rerender({ allowed: true, version: "another" });
  await act(() => view.result.current.refresh());
  expect(read).toHaveBeenCalledTimes(1);
});
