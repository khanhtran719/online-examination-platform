import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useBusinessMetrics } from "../use-business-metrics";
import { useMonitorExam } from "../use-operations";
import { useAudit } from "../use-report-insights";

const runtime = vi.hoisted(() => ({
  api: {
    getBusinessMetrics: vi.fn(),
    getSystemBusinessMetrics: vi.fn(),
    getAudit: vi.fn(),
    listActiveCandidates: vi.fn(),
  },
  permissions: ["reporting.read", "audit.read"],
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: runtime.api,
    mode: "demo",
    demo: { permissions: runtime.permissions },
  }),
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.resetAllMocks();
  runtime.permissions = ["reporting.read", "audit.read"];
});
function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...renderHook(hook, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    }),
  };
}
it("uses reporting permission for business data and clears it on loss without calling technical metrics", async () => {
  runtime.api.getBusinessMetrics.mockResolvedValue({ data: { asOf: "snapshot" } });
  const view = setup(useBusinessMetrics);
  await waitFor(() => expect(view.result.current.data?.asOf).toBe("snapshot"));
  expect(runtime.api.getSystemBusinessMetrics).not.toHaveBeenCalled();
  runtime.permissions = ["system.metrics.read"];
  view.rerender();
  expect(view.result.current.data).toBeUndefined();
  expect(view.client.getQueryData(["business-metrics"])).toBeUndefined();
  expect(runtime.api.getBusinessMetrics).toHaveBeenCalledTimes(1);
});
it("cannot expose a late clipboard notice in a different audit drawer or after permission loss", async () => {
  runtime.api.getAudit.mockResolvedValue({
    data: {
      items: [
        { id: "a", correlationId: "correlation-a" },
        { id: "b", correlationId: "correlation-b" },
      ],
      next: null,
      pageSize: 20,
    },
  });
  let resolve!: () => void;
  const writeText = vi.fn(
    () =>
      new Promise<void>((r) => {
        resolve = r;
      }),
  );
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const view = setup(useAudit);
  await waitFor(() => expect(view.result.current.items).toHaveLength(2));
  act(() => view.result.current.select("a"));
  let copy!: Promise<void>;
  act(() => {
    copy = view.result.current.copy();
  });
  act(() => view.result.current.select("b"));
  await act(async () => {
    resolve();
    await copy;
  });
  expect(writeText).toHaveBeenCalledWith("correlation-a");
  expect(view.result.current.copyNote).toBeNull();
  runtime.permissions = [];
  view.rerender();
  expect(view.result.current.selected).toBeUndefined();
  expect(view.client.getQueryData(["audit"])).toBeUndefined();
});
it("pauses monitor reads while hidden and never overlaps a slow visible refresh", async () => {
  const page = { items: [], next: null, pageSize: 20, asOf: "2026-10-12T03:00:00.000Z" };
  runtime.api.listActiveCandidates.mockResolvedValue({ data: page });
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.useFakeTimers();
  const view = setup(() => useMonitorExam("exam"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(runtime.api.listActiveCandidates).toHaveBeenCalledTimes(1);
  hidden.mockReturnValue(true);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(runtime.api.listActiveCandidates).toHaveBeenCalledTimes(1);
  let resolve!: (r: unknown) => void;
  runtime.api.listActiveCandidates.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  hidden.mockReturnValue(false);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(runtime.api.listActiveCandidates).toHaveBeenCalledTimes(2);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(runtime.api.listActiveCandidates).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolve({ data: page });
    await vi.advanceTimersByTimeAsync(1);
  });
  runtime.permissions = [];
  view.rerender();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(runtime.api.listActiveCandidates).toHaveBeenCalledTimes(2);
});
