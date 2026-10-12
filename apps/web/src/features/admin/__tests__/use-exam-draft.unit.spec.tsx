import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { AdminExam } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { useExamDraft } from "../use-exam-draft";

const api = vi.hoisted(() => ({
  getAdminExam: vi.fn(),
  createExam: vi.fn(),
  listBankQuestions: vi.fn(),
  replaceExamDraft: vi.fn(),
  publishExam: vi.fn(),
  unpublishExam: vi.fn(),
  archiveExam: vi.fn(),
}));
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    mode: "demo",
    api,
    demo: { permissions: access.allowed ? ["catalog.manage"] : [] },
  }),
}));
const original: AdminExam = {
  id: "exam",
  title: "Đề gốc",
  revision: 4,
  published: false,
  archived: false,
  publishedVersionId: null,
  category: "IT_CERTIFICATION",
  durationSeconds: 90,
  displayTimezone: "Asia/Ho_Chi_Minh",
  openAt: "2026-11-15T01:00:23Z",
  closeAt: "2026-11-15T05:00:23Z",
  attemptLimit: 3,
  explanationPolicy: "NEVER",
  leaderboardEnabled: false,
  sections: [
    {
      title: "Kiến thức nền",
      position: 1,
      questions: [{ bankQuestionId: "bank", position: 1, points: 10 }],
    },
  ],
};
const unknown = () =>
  new ApiError({ kind: "timeout", status: 0, errorCode: "timeout", message: "Chưa xác nhận" });
beforeEach(() => {
  access.allowed = true;
  api.createExam.mockResolvedValue({ data: { resourceId: "exam", revision: 1 } });
  api.getAdminExam.mockResolvedValue({ data: original });
  api.listBankQuestions.mockResolvedValue({ data: { items: [], next: null } });
  api.replaceExamDraft.mockResolvedValue({ data: { resourceId: "exam", revision: 5 } });
  api.publishExam.mockResolvedValue({ data: { resourceId: "exam", revision: 6 } });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
async function mount(isNew = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const hook = renderHook(() => useExamDraft(isNew, isNew ? "" : "exam"), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  });
  if (!isNew) await waitFor(() => expect(hook.result.current.title).toBe("Đề gốc"));
  return { ...hook, client };
}
it("maps minutes to integer seconds without losing second-precision schedule fields", async () => {
  const { result } = await mount();
  expect(result.current.duration).toBe("1.5");
  await act(() => result.current.save(false));
  expect(api.replaceExamDraft.mock.calls[0]?.[2]).toMatchObject({
    durationSeconds: 90,
    openAt: "2026-11-15T01:00:23.000Z",
    closeAt: "2026-11-15T05:00:23.000Z",
    expectedRevision: 4,
  });
});
it("retries only the unconfirmed publication after an acknowledged save", async () => {
  const { result } = await mount();
  act(() => result.current.setDuration("90"));
  act(() => result.current.setTitle("Đề chỉnh sửa"));
  api.publishExam.mockRejectedValueOnce(unknown());
  await act(() => result.current.save(true));
  expect(result.current.unknown).toBe(true);
  expect(result.current.notice).toContain("Đã lưu bản nháp");
  await act(() => result.current.retry());
  expect(api.replaceExamDraft).toHaveBeenCalledTimes(1);
  expect(api.publishExam).toHaveBeenCalledTimes(2);
  expect(api.publishExam.mock.calls[1]).toEqual(api.publishExam.mock.calls[0]);
  expect(api.publishExam.mock.calls[1]?.[2]).toEqual({ expectedRevision: 5 });
  expect(result.current.notice).toContain("Đã phát hành");
});
it("blocks a competing operation during an unknown save and retries its exact key/body", async () => {
  const { result } = await mount();
  act(() => result.current.setDuration("90"));
  api.replaceExamDraft.mockRejectedValueOnce(unknown());
  await act(() => result.current.save(false));
  await act(() => result.current.mutate("archive"));
  expect(api.archiveExam).not.toHaveBeenCalled();
  await act(() => result.current.retry());
  expect(api.replaceExamDraft.mock.calls[1]).toEqual(api.replaceExamDraft.mock.calls[0]);
});
it("guards duplicate calls throughout save then publication", async () => {
  const { result } = await mount();
  act(() => result.current.setDuration("90"));
  let resolve!: (value: unknown) => void;
  api.publishExam.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  let running!: Promise<void>;
  act(() => {
    running = result.current.save(true);
  });
  await waitFor(() => expect(api.publishExam).toHaveBeenCalledTimes(1));
  await act(() => result.current.save(false));
  await act(() => result.current.mutate("archive"));
  expect(api.replaceExamDraft).toHaveBeenCalledTimes(1);
  expect(api.archiveExam).not.toHaveBeenCalled();
  await act(async () => {
    resolve({ data: { resourceId: "exam", revision: 6 } });
    await running;
  });
});
it("preserves local edits on conflict and adopts fresh fields/revision only by explicit choice", async () => {
  const { result } = await mount();
  act(() => result.current.setDuration("90"));
  act(() => result.current.setTitle("Local"));
  api.getAdminExam.mockResolvedValue({
    data: { ...original, title: "Latest", revision: 7, durationSeconds: 4500 },
  });
  api.replaceExamDraft.mockRejectedValueOnce(
    new ApiError({
      kind: "http",
      status: 409,
      errorCode: "Version conflict",
      message: "Version conflict",
    }),
  );
  await act(() => result.current.save(false));
  expect(result.current.title).toBe("Local");
  expect(result.current.revision).toBe(4);
  expect(result.current.conflict).toBe(true);
  act(() => result.current.useLatest());
  expect(result.current.title).toBe("Latest");
  expect(result.current.duration).toBe("75");
  expect(result.current.revision).toBe(7);
  expect(result.current.dirty).toBe(false);
  await act(() => result.current.save(false));
  expect(api.replaceExamDraft.mock.calls[1]?.[2]).toMatchObject({
    expectedRevision: 7,
    title: "Latest",
  });
});
it("hides cached private content after a forbidden write", async () => {
  const { result, client } = await mount();
  act(() => result.current.setDuration("90"));
  api.replaceExamDraft.mockRejectedValueOnce(
    new ApiError({ kind: "http", status: 403, errorCode: "Forbidden", message: "Forbidden" }),
  );
  await act(() => result.current.save(false));
  await waitFor(() => expect(result.current.hidden).toBe(true));
  expect(client.getQueryData(["admin-exam", "exam"])).toBeUndefined();
  await act(() => result.current.mutate("archive"));
  expect(api.archiveExam).not.toHaveBeenCalled();
});
it("does not mutate an archived exam", async () => {
  api.getAdminExam.mockResolvedValue({ data: { ...original, archived: true } });
  const { result } = await mount();
  await act(() => result.current.save(false));
  await act(() => result.current.mutate("publish"));
  expect(api.replaceExamDraft).not.toHaveBeenCalled();
  expect(api.publishExam).not.toHaveBeenCalled();
});

it("retains create identity after an unknown response and never sends a replacement before receipt", async () => {
  const { result } = await mount(true);
  act(() => {
    result.current.setTitle("New");
    result.current.setSections([
      { title: "One", questions: [{ bankQuestionId: "bank", points: 1 }] },
    ]);
  });
  api.createExam.mockRejectedValueOnce(unknown());
  await act(() => result.current.save(false));
  expect(result.current.unknown).toBe(true);
  await act(() => result.current.retry());
  expect(api.createExam.mock.calls[1]).toEqual(api.createExam.mock.calls[0]);
  expect(api.replaceExamDraft).not.toHaveBeenCalled();
});
it("continues a new exam publication using the create receipt even if its read projection is older", async () => {
  const { result } = await mount(true);
  act(() => {
    result.current.setTitle("New");
    result.current.setSections([
      { title: "One", questions: [{ bankQuestionId: "bank", points: 1 }] },
    ]);
  });
  api.publishExam.mockRejectedValueOnce(unknown());
  await act(() => result.current.save(true));
  expect(result.current.revision).toBe(1);
  expect(api.publishExam.mock.calls[0]?.[2]).toEqual({ expectedRevision: 1 });
  await act(() => result.current.retry());
  expect(api.createExam).toHaveBeenCalledTimes(1);
  expect(api.publishExam.mock.calls[1]).toEqual(api.publishExam.mock.calls[0]);
  expect(api.getAdminExam.mock.calls.every(([id]) => id === "exam")).toBe(true);
});

it("clears local/private state and stops the publication continuation when capability is revoked during save", async () => {
  const { result, rerender, client } = await mount();
  act(() => result.current.setTitle("Local"));
  let resolve!: (value: unknown) => void;
  api.replaceExamDraft.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  let running!: Promise<void>;
  act(() => {
    running = result.current.save(true);
  });
  access.allowed = false;
  rerender();
  await waitFor(() => expect(result.current.title).toBe(""));
  expect(result.current.unavailable).toBe(true);
  expect(client.getQueryData(["admin-exam", "exam"])).toBeUndefined();
  await act(async () => {
    resolve({ data: { resourceId: "exam", revision: 5 } });
    await running;
  });
  expect(api.publishExam).not.toHaveBeenCalled();
});
it("clears an older success notice when a new operation has no acknowledgement", async () => {
  const { result } = await mount();
  await act(() => result.current.mutate("publish"));
  expect(result.current.notice).toContain("Đã phát hành");
  api.replaceExamDraft.mockRejectedValueOnce(unknown());
  await act(() => result.current.save(true));
  expect(result.current.unknown).toBe(true);
  expect(result.current.notice).toBe("");
});
