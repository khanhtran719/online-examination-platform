import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useQuestionList } from "../use-question-list";

const api = vi.hoisted(() => ({
  listBankQuestions: vi.fn(),
  permissions: ["catalog.manage", "catalog.keys.read"],
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ api, mode: "demo", demo: { permissions: api.permissions } }),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.permissions = ["catalog.manage", "catalog.keys.read"];
  api.listBankQuestions.mockResolvedValue({
    data: {
      items: [
        { id: "q1", prompt: "Loaded question", type: "SINGLE_CHOICE", correctOptionPositions: [1] },
      ],
      next: "cursor-2",
    },
  });
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = renderHook(() => useQuestionList(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...view, client };
}
it("does not call a key-sensitive bank API with manage permission alone", () => {
  api.permissions = ["catalog.manage"];
  const view = setup();
  expect(view.result.current.unavailable).toBe(true);
  expect(api.listBankQuestions).not.toHaveBeenCalled();
});
it("filters only loaded data and clears private cached keys after permission loss", async () => {
  const view = setup();
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1));
  act(() => view.result.current.setSearch("unmatched"));
  expect(view.result.current.filtered).toEqual([]);
  expect(view.result.current.questions.hasNextPage).toBe(true);
  expect(api.listBankQuestions).toHaveBeenCalledTimes(1);
  api.permissions = ["catalog.manage"];
  view.rerender();
  expect(view.result.current.rows).toEqual([]);
  expect(view.client.getQueryData(["bank"])).toBeUndefined();
});
