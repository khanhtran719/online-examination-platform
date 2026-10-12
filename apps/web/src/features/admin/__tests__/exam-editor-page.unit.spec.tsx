import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { AdminExamEditorPage } from "../exam-editor-page";

const api = vi.hoisted(() => ({
  getAdminExam: vi.fn(),
  listBankQuestions: vi.fn(),
  unpublishExam: vi.fn(),
  archiveExam: vi.fn(),
  publishExam: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ mode: "demo", api, demo: { permissions: ["catalog.manage"] } }),
}));
beforeEach(() => {
  api.getAdminExam.mockResolvedValue({
    data: {
      id: "exam",
      title: "Đề thử",
      revision: 4,
      category: "IT_CERTIFICATION",
      published: true,
      archived: false,
      publishedVersionId: "version",
      durationSeconds: 5400,
      displayTimezone: "Asia/Ho_Chi_Minh",
      openAt: "2026-11-15T01:00:00Z",
      closeAt: "2026-11-15T05:00:00Z",
      attemptLimit: 3,
      explanationPolicy: "NEVER",
      leaderboardEnabled: false,
      sections: [
        {
          title: "Nền tảng",
          position: 1,
          questions: [{ bankQuestionId: "a", points: 10, position: 1 }],
        },
        {
          title: "Bảo mật",
          position: 2,
          questions: [{ bankQuestionId: "b", points: 20, position: 1 }],
        },
      ],
    },
  });
  api.listBankQuestions.mockResolvedValue({ data: { items: [], next: null } });
  api.unpublishExam.mockResolvedValue({ data: { resourceId: "exam", revision: 5 } });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
async function mount() {
  const router = createMemoryRouter(
    [
      { path: "/admin/exams/:examId/edit", element: <AdminExamEditorPage /> },
      { path: "/admin/exams", element: <p>Danh sách đích</p> },
    ],
    { initialEntries: ["/admin/exams/exam/edit"] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "Đề thử" });
  return router;
}
it("requires explicit unpublish confirmation and keeps pending actions inside the dialog", async () => {
  await mount();
  await userEvent.click(screen.getByRole("button", { name: "Gỡ phát hành" }));
  expect(api.unpublishExam).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog", { name: "Gỡ phát hành đề" });
  await userEvent.keyboard("{Escape}");
  expect(api.unpublishExam).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Gỡ phát hành" }));
  await userEvent.click(
    within(dialog.isConnected ? dialog : screen.getByRole("dialog")).getByRole("button", {
      name: "Xác nhận",
    }),
  );
  await waitFor(() => expect(api.unpublishExam).toHaveBeenCalledTimes(1));
  expect(api.unpublishExam.mock.calls[0]?.[2]).toEqual({ expectedRevision: 4 });
});
it("removes only local section membership after confirmation", async () => {
  await mount();
  await userEvent.click(screen.getByRole("button", { name: "Các phần & câu hỏi" }));
  await userEvent.click(screen.getAllByRole("button", { name: /Bỏ phần/ })[0]!);
  const dialog = screen.getByRole("dialog", { name: "Bỏ phần thi" });
  expect(screen.getAllByLabelText("Tên phần")).toHaveLength(2);
  await userEvent.click(within(dialog).getByRole("button", { name: "Bỏ phần" }));
  expect(screen.getAllByLabelText("Tên phần")).toHaveLength(1);
  expect((screen.getByLabelText("Tên phần") as HTMLInputElement).value).toBe("Bảo mật");
  expect(api.archiveExam).not.toHaveBeenCalled();
});
it("warns before leaving unsaved local edits and leaves only after explicit discard", async () => {
  const router = await mount();
  await userEvent.clear(screen.getByLabelText("Tiêu đề"));
  await userEvent.type(screen.getByLabelText("Tiêu đề"), "Local");
  await userEvent.click(screen.getByRole("link", { name: /Danh sách đề/ }));
  const dialog = screen.getByRole("dialog", { name: "Rời bản nháp chưa lưu?" });
  expect(router.state.location.pathname).toBe("/admin/exams/exam/edit");
  await userEvent.click(within(dialog).getByRole("button", { name: "Ở lại chỉnh sửa" }));
  expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Local");
  await userEvent.click(screen.getByRole("link", { name: /Danh sách đề/ }));
  await userEvent.click(screen.getByRole("button", { name: "Rời và bỏ thay đổi" }));
  await screen.findByText("Danh sách đích");
});
it("renders independent preflight errors and disables writes until local validation passes", async () => {
  await mount();
  await userEvent.clear(screen.getByLabelText("Đóng"));
  await userEvent.type(screen.getByLabelText("Đóng"), "2026-11-14T07:00");
  await userEvent.click(screen.getByRole("button", { name: "Kiểm tra & phát hành" }));
  expect(screen.getByRole("button", { name: "Lưu nháp" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("Giờ đóng phải sau giờ mở.")).toBeDefined();
  expect(screen.queryByRole("link", { name: "Giám sát đề này" })).toBeNull();
});

it("describes a lost publication acknowledgement as unknown rather than a definitive failure", async () => {
  const unpublished = (await api.getAdminExam()).data;
  api.getAdminExam.mockResolvedValue({ data: { ...unpublished, published: false } });
  api.publishExam.mockRejectedValue(
    new ApiError({ kind: "timeout", status: 0, errorCode: "Timeout", message: "timeout" }),
  );
  await mount();
  await userEvent.click(screen.getByRole("button", { name: "Phát hành" }));
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }),
  );
  await screen.findByText(/Chưa biết kết quả lần gửi/);
  expect(within(screen.getByRole("dialog")).queryByText("Không thực hiện được")).toBeNull();
});
