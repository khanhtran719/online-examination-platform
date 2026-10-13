import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { useDashboard } from "../use-dashboard";

const fixture = vi.hoisted(() => ({
  history: vi.fn(),
  browse: vi.fn(),
  actor: "actor-a",
  epoch: 0,
  memory: { lookup: vi.fn(), clear: vi.fn() },
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ api: { getHistory: fixture.history, browseExams: fixture.browse } }),
}));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: "authenticated",
    needsReauth: false,
    epoch: fixture.epoch,
    profile: { id: fixture.actor },
  }),
}));
vi.mock("@web/app/memory", () => ({ useMemory: () => fixture.memory }));
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient();
  clients.push(client);
  return renderHook(() => useDashboard(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
function error(status: number) {
  return new ApiError({
    kind: "http",
    status,
    errorCode: "Safe error",
    message: "Safe error",
    retryAfterSeconds: 90,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.actor = "actor-a";
  fixture.epoch = 0;
  fixture.history.mockResolvedValue({ data: { items: [], next: null, pageSize: 20 } });
  fixture.browse.mockResolvedValue({ data: { items: [], next: null, pageSize: 3 } });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
});
it.each([401, 403, 429])(
  "blocks another history refresh before rendering its %s response",
  async (status) => {
    const h = mount();
    await waitFor(() => expect(h.result.current.history.isSuccess).toBe(true));
    fixture.history.mockRejectedValue(error(status));
    await act(async () => {
      await h.result.current.retryHistory();
      await h.result.current.retryHistory();
    });
    expect(fixture.history).toHaveBeenCalledTimes(2);
  },
);
it("does not issue a new category query before rendering a catalog rate limit", async () => {
  const h = mount();
  await waitFor(() => expect(h.result.current.catalog.isSuccess).toBe(true));
  fixture.browse.mockRejectedValue(error(429));
  await act(async () => {
    await h.result.current.retryCatalog();
    h.result.current.setCategory("IELTS");
  });
  expect(h.result.current.category).toBeUndefined();
  expect(fixture.browse).toHaveBeenCalledTimes(2);
});
it("does not carry another actor's retry clock into the new dashboard scope", async () => {
  const h = mount();
  await waitFor(() => expect(h.result.current.history.isSuccess).toBe(true));
  fixture.history.mockRejectedValueOnce(error(429));
  await act(async () => h.result.current.retryHistory());
  await waitFor(() => expect(h.result.current.historyWait).toBe(90));
  fixture.actor = "actor-b";
  fixture.epoch++;
  h.rerender();
  await waitFor(() => expect(h.result.current.history.isSuccess).toBe(true));
  expect(h.result.current.historyWait).toBe(0);
});

it("clears frozen metadata when the authenticated Dashboard scope changes actor or epoch", async () => {
  const h = mount();
  await waitFor(() => expect(h.result.current.history.isSuccess).toBe(true));
  expect(fixture.memory.clear).not.toHaveBeenCalled();
  fixture.actor = "actor-b";
  fixture.epoch++;
  h.rerender();
  expect(fixture.memory.clear).toHaveBeenCalled();
});
