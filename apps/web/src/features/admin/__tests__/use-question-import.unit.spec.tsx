import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";
import { IMPORT_TEMPLATE } from "@web/shared/validation";

import { useQuestionImport } from "../use-question-import";

const api = vi.hoisted(() => ({ importQuestions: vi.fn(), permissions: ["catalog.import"] }));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ api, mode: "demo", demo: { permissions: api.permissions } }),
}));
const report = {
  id: "report",
  valid: true,
  committed: false,
  issues: [],
  questions: [],
  createdAt: "2026-10-12T00:00:00Z",
};
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.permissions = ["catalog.import"];
});
it("retains the validated text snapshot after a lost dry-run acknowledgement retry", async () => {
  api.importQuestions
    .mockRejectedValueOnce(
      new ApiError({ kind: "network", status: 0, errorCode: "network", message: "Offline" }),
    )
    .mockResolvedValue({ data: report });
  const view = renderHook(() => useQuestionImport(vi.fn()));
  await act(async () => view.result.current.dryRun());
  expect(view.result.current.unknown).toBe(true);
  await act(async () => view.result.current.retry());
  expect(api.importQuestions.mock.calls[1]).toEqual(api.importQuestions.mock.calls[0]);
  expect(view.result.current.canCommit).toBe(true);
});
it("locks commit and file edits while an unknown write is unresolved", async () => {
  api.importQuestions
    .mockResolvedValueOnce({ data: report })
    .mockRejectedValueOnce(
      new ApiError({ kind: "http", status: 503, errorCode: "Unavailable", message: "Unavailable" }),
    );
  const view = renderHook(() => useQuestionImport(vi.fn()));
  await act(async () => view.result.current.dryRun());
  await act(async () => view.result.current.commit());
  expect(view.result.current.unknown).toBe(true);
  act(() => {
    view.result.current.edit("{}");
    void view.result.current.dryRun();
  });
  expect(view.result.current.text).toBe(IMPORT_TEMPLATE);
  expect(api.importQuestions).toHaveBeenCalledTimes(2);
});
it("ignores an older file read after newer manual input", async () => {
  let done!: (text: string) => void;
  const file = new File(["old"], "old.json");
  Object.defineProperty(file, "text", {
    value: () =>
      new Promise<string>((resolve) => {
        done = resolve;
      }),
  });
  const view = renderHook(() => useQuestionImport(vi.fn()));
  act(() => {
    void view.result.current.readFile(file);
  });
  act(() => view.result.current.edit("newer"));
  await act(async () => done("older"));
  expect(view.result.current.text).toBe("newer");
});
it("does not navigate or report success when commit returns a validation report", async () => {
  api.importQuestions.mockResolvedValueOnce({ data: report }).mockResolvedValueOnce({
    data: {
      ...report,
      valid: false,
      committed: false,
      issues: [{ clientRef: "q1", field: "type", message: "Invalid" }],
    },
  });
  const done = vi.fn();
  const view = renderHook(() => useQuestionImport(done));
  await act(async () => view.result.current.dryRun());
  await act(async () => view.result.current.commit());
  expect(done).not.toHaveBeenCalled();
  expect(view.result.current.canCommit).toBe(false);
});
it("does not resurrect a cleared report when an old request resolves after permissions are restored", async () => {
  let resolve!: (value: unknown) => void;
  api.importQuestions.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const done = vi.fn();
  const view = renderHook(() => useQuestionImport(done));
  act(() => {
    void view.result.current.dryRun();
  });
  api.permissions = [];
  view.rerender();
  api.permissions = ["catalog.import"];
  view.rerender();
  await act(async () => resolve({ data: report }));
  expect(view.result.current.report).toBeNull();
  expect(done).not.toHaveBeenCalled();
});
