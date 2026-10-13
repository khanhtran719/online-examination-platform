import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { ExamDetailPage } from "../exam-detail-page";

const state = vi.hoisted(() => ({
  api: { getExam: vi.fn(), startAttempt: vi.fn() },
  remember: vi.fn(),
  clear: vi.fn(),
  actor: "candidate-a",
  status: "authenticated",
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api }) }));
vi.mock("@web/app/memory", () => ({
  useMemory: () => ({ remember: state.remember, clear: state.clear }),
}));
vi.mock("@web/app/session", () => ({
  useSession: () => ({ status: state.status, profile: { id: state.actor } }),
}));
const exam = {
  id: "exam-a",
  title: "Đề đang xem",
  publishedVersionId: "version-a",
  version: 1,
  category: "IT_CERTIFICATION",
  durationSeconds: 5401,
  questionCount: 3,
  attemptLimit: 2,
  explanationPolicy: "AFTER_COMPLETION",
  leaderboardEnabled: true,
  displayTimezone: "Asia/Ho_Chi_Minh",
  openAt: "2026-10-12T00:00:00.000Z",
  closeAt: "2026-10-13T00:00:00.000Z",
  sections: [
    {
      id: "section-a",
      title: "Tên phần đủ dài cần hiển thị đầy đủ",
      questionCount: 3,
      possible: 6,
    },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  state.actor = "candidate-a";
  state.status = "authenticated";
  state.api.getExam.mockImplementation(async (id) => ({ data: { ...exam, id } }));
});
afterEach(cleanup);
function Jump() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/exams/exam-b")}>Đổi đề để kiểm thử</button>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/exams/exam-a"]}>
        <Jump />
        <Routes>
          <Route path="/exams/:examId" element={<ExamDetailPage />} />
          <Route path="/attempts/:attemptId" element={<h1>Đã vào phòng thi</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { ...view, client, rerenderSession: () => view.rerender(tree()) };
}
async function confirm() {
  await screen.findByRole("heading", { name: "Đề đang xem" });
  fireEvent.click(screen.getByRole("button", { name: "Bắt đầu" }));
  return screen.getByRole("dialog");
}
it("sends once when two confirmation clicks occur before the pending render", async () => {
  let resolve!: (value: unknown) => void;
  state.api.startAttempt.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  mount();
  const dialog = await confirm();
  const button = within(dialog).getByRole("button", { name: "Bắt đầu" });
  act(() => {
    button.click();
    button.click();
  });
  expect(state.api.startAttempt).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ data: { id: "accepted-attempt", examId: "exam-a" } }));
  expect(await screen.findByRole("heading", { name: "Đã vào phòng thi" })).toBeVisible();
});
it.each(["timeout", "malformed", "network", "http"] as const)(
  "retains the exact start key after an unknown %s outcome",
  async (kind) => {
    state.api.startAttempt.mockRejectedValue(
      new ApiError({
        kind,
        status: kind === "http" ? 503 : 0,
        errorCode: "Unknown",
        message: "Unknown",
      }),
    );
    mount();
    await confirm();
    fireEvent.click(screen.getAllByRole("button", { name: "Bắt đầu" }).at(-1)!);
    await waitFor(() => expect(screen.queryByText("Đang bắt đầu…")).toBeNull());
    const retry =
      screen.queryByRole("button", { name: "Thử lại cùng yêu cầu" }) ??
      screen.getAllByRole("button", { name: "Bắt đầu" }).at(-1)!;
    fireEvent.click(retry);
    await waitFor(() => expect(state.api.startAttempt).toHaveBeenCalledTimes(2));
    expect(state.api.startAttempt.mock.calls[1]).toEqual(state.api.startAttempt.mock.calls[0]);
    expect(screen.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  },
);
it("ignores a late start ACK after navigation to another exam", async () => {
  let resolve!: (value: unknown) => void;
  state.api.startAttempt.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  mount();
  await confirm();
  fireEvent.click(screen.getAllByRole("button", { name: "Bắt đầu" }).at(-1)!);
  fireEvent.click(screen.getByRole("button", { name: "Đổi đề để kiểm thử" }));
  await waitFor(() => expect(state.api.getExam).toHaveBeenCalledWith("exam-b"));
  await act(async () => resolve({ data: { id: "old-attempt", examId: "exam-a" } }));
  expect(screen.queryByRole("heading", { name: "Đã vào phòng thi" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Đề đang xem" })).toBeVisible();
});
it("does not repopulate frozen metadata from an unmounted detail read", async () => {
  let resolve!: (value: unknown) => void;
  state.api.getExam.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = mount();
  await waitFor(() => expect(state.api.getExam).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => resolve({ data: exam }));
  expect(state.remember).not.toHaveBeenCalled();
});
it.each([401, 403])(
  "removes cached detail and start controls after a %s refresh",
  async (status) => {
    const view = mount();
    await screen.findByRole("heading", { name: "Đề đang xem" });
    state.api.getExam.mockRejectedValue(
      new ApiError({
        kind: "http",
        status,
        errorCode: "Permission denied",
        message: "Permission denied",
      }),
    );
    await act(async () => {
      await view.client.invalidateQueries();
    });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Đề đang xem" })).toBeNull());
    expect(screen.queryByRole("button", { name: "Bắt đầu" })).toBeNull();
    expect(state.clear).toHaveBeenCalled();
    await waitFor(() =>
      expect(
        view.client
          .getQueryCache()
          .getAll()
          .every((query) => query.state.data === undefined),
      ).toBe(true),
    );
  },
);

it("keeps a mismatched ACK unknown and retries the same intent", async () => {
  state.api.startAttempt.mockResolvedValue({ data: { id: "other-attempt", examId: "exam-b" } });
  mount();
  const dialog = await confirm();
  fireEvent.click(within(dialog).getByRole("button", { name: "Bắt đầu" }));
  expect(await screen.findByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Đã vào phòng thi" })).toBeNull();
  expect(within(dialog).queryByRole("button", { name: "Đóng" })).toBeNull();
  expect(within(dialog).getByRole("button", { name: "Chưa bắt đầu" })).toBeDisabled();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại cùng yêu cầu" }));
  await waitFor(() => expect(state.api.startAttempt).toHaveBeenCalledTimes(2));
  expect(state.api.startAttempt.mock.calls[1]).toEqual(state.api.startAttempt.mock.calls[0]);
});
it("ignores a late ACK after the session loses access", async () => {
  let resolve!: (value: unknown) => void;
  state.api.startAttempt.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const view = mount();
  const dialog = await confirm();
  fireEvent.click(within(dialog).getByRole("button", { name: "Bắt đầu" }));
  state.status = "anonymous";
  view.rerenderSession();
  await act(async () => resolve({ data: { id: "old-attempt", examId: "exam-a" } }));
  expect(screen.queryByRole("heading", { name: "Đã vào phòng thi" })).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("releases a definitively rejected request so a new confirmation gets a new key", async () => {
  state.api.startAttempt.mockRejectedValue(
    new ApiError({ kind: "http", status: 422, errorCode: "Attempt is closed", message: "Closed" }),
  );
  mount();
  const dialog = await confirm();
  fireEvent.click(within(dialog).getByRole("button", { name: "Bắt đầu" }));
  await waitFor(() =>
    expect(within(dialog).getByRole("button", { name: "Chưa bắt đầu" })).toBeEnabled(),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Chưa bắt đầu" }));
  const again = await confirm();
  fireEvent.click(within(again).getByRole("button", { name: "Bắt đầu" }));
  await waitFor(() => expect(state.api.startAttempt).toHaveBeenCalledTimes(2));
  expect(state.api.startAttempt.mock.calls[1]![1]).not.toBe(
    state.api.startAttempt.mock.calls[0]![1],
  );
});
