import { createElement as h, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminExamEditorPage } from "../admin-exams";
import { QuestionEditorPage } from "../admin-questions";
import { ImportPage } from "../admin-import";
import { ApiError } from "../../../shared/api/errors";

const api = vi.hoisted(() => ({
  listBankQuestions: vi.fn(),
  getAdminExam: vi.fn(),
  createExam: vi.fn(),
  replaceExamDraft: vi.fn(),
  createBankQuestion: vi.fn(),
  getBankQuestion: vi.fn(),
  archiveBankQuestion: vi.fn(),
  importQuestions: vi.fn(),
}));
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({
    mode: "demo",
    api,
    demo: { permissions: ["catalog.manage", "catalog.keys.read", "catalog.import"] },
  }),
}));
const bank = ["Bank A", "Bank B"].map((prompt, index) => ({
  id: `bank-${index}`,
  prompt,
  type: "SINGLE_CHOICE",
  points: index + 2,
  revision: 1,
  archived: false,
  options: [
    { position: 1, text: "One" },
    { position: 2, text: "Two" },
  ],
  correctOptionPositions: [1],
  explanation: null,
}));
const seed = (id: string) => ({
  id,
  title: `Draft ${id}`,
  revision: 4,
  published: false,
  archived: false,
  publishedVersionId: null,
  category: "IT_CERTIFICATION",
  durationSeconds: 2700,
  displayTimezone: "Asia/Ho_Chi_Minh",
  openAt: "2026-10-01T00:00:00Z",
  closeAt: "2026-12-01T00:00:00Z",
  attemptLimit: 1,
  explanationPolicy: "NEVER",
  leaderboardEnabled: false,
  sections: [
    {
      title: "Phần 1",
      position: 1,
      questions: [{ bankQuestionId: "bank-0", position: 1, points: 2 }],
    },
  ],
});
beforeEach(() => {
  api.listBankQuestions.mockResolvedValue({ data: { items: bank, next: null } });
  api.getAdminExam.mockImplementation((id: string) => Promise.resolve({ data: seed(id) }));
  api.createExam.mockResolvedValue({ data: { resourceId: "saved", revision: 1 } });
  api.createBankQuestion.mockResolvedValue({ data: { resourceId: "saved", revision: 1 } });
  api.getBankQuestion.mockResolvedValue({ data: bank[0] });
  api.archiveBankQuestion.mockResolvedValue({ data: { resourceId: "bank-0", revision: 2 } });
});

it("asks before archiving a question and sends the current revision only after confirmation", async () => {
  mount(QuestionEditorPage, "/admin/questions/bank-0/edit", "/admin/questions/:questionId/edit");
  await screen.findByRole("heading", { name: "Sửa câu" });
  await userEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
  expect(api.archiveBankQuestion).not.toHaveBeenCalled();
  const dialog = await screen.findByRole("dialog", { name: "Lưu trữ câu hỏi" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
  expect(api.archiveBankQuestion).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
  await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.archiveBankQuestion).toHaveBeenCalledTimes(1));
  expect(api.archiveBankQuestion.mock.calls[0]?.[2]).toEqual({ expectedRevision: 1 });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function mount(Component: ComponentType, route: string, pattern: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    h(
      QueryClientProvider,
      { client },
      h(
        MemoryRouter,
        { initialEntries: [route] },
        h(Link, { to: "/admin/exams/second/edit" }, "Đề tiếp theo"),
        h(
          "button",
          { onClick: () => void client.invalidateQueries({ queryKey: ["admin-exam"] }) },
          "Cập nhật quyền",
        ),
        h(
          Routes,
          null,
          h(Route, { path: pattern, element: h(Component) }),
          h(Route, { path: "/admin/questions/saved/edit", element: h("p", null, "Đã lưu câu") }),
          h(Route, { path: "/admin/exams/saved/edit", element: h("p", null, "Đã lưu đề") }),
          h(Route, { path: "/admin/imports/report", element: h("p", null, "Đã nhập") }),
        ),
      ),
    ),
  );
  return client;
}

it("preserves draft fields across editor steps and prevents selecting the same bank question in two sections", async () => {
  mount(AdminExamEditorPage, "/admin/exams/new", "/admin/exams/new");
  await userEvent.type(screen.getByLabelText("Tiêu đề"), "New exam");
  await userEvent.click(screen.getByRole("button", { name: "Các phần & câu hỏi" }));
  await userEvent.click(screen.getByRole("button", { name: "Chọn câu cho phần 1" }));
  const picker = await screen.findByRole("dialog", { name: "Chọn câu từ ngân hàng" });
  await userEvent.click(within(picker).getByRole("button", { name: /Thêm: Bank A/ }));
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Thêm phần" }));
  await userEvent.click(screen.getByRole("button", { name: "Chọn câu cho phần 2" }));
  expect(
    within(screen.getByRole("dialog"))
      .getByRole("button", { name: /Đã có: Bank A/ })
      .hasAttribute("disabled"),
  ).toBe(true);
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: /Thêm: Bank B/ }),
  );
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Thông tin" }));
  expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("New exam");
  await userEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() => expect(api.createExam).toHaveBeenCalledTimes(1));
  expect(api.createExam.mock.calls[0]?.[1]).toMatchObject({
    title: "New exam",
    expectedRevision: 0,
    sections: [
      { position: 1, questions: [{ bankQuestionId: "bank-0", position: 1, points: 2 }] },
      { position: 2, questions: [{ bankQuestionId: "bank-1", position: 1, points: 3 }] },
    ],
  });
});

it("loads the new exam draft and revision when the edit route changes", async () => {
  mount(AdminExamEditorPage, "/admin/exams/first/edit", "/admin/exams/:examId/edit");
  await waitFor(() =>
    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Draft first"),
  );
  await userEvent.click(screen.getByRole("link", { name: "Đề tiếp theo" }));
  await waitFor(() =>
    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Draft second"),
  );
});

it("clears a loaded exam editor and its query payload after a 403 response", async () => {
  const client = mount(AdminExamEditorPage, "/admin/exams/first/edit", "/admin/exams/:examId/edit");
  await waitFor(() =>
    expect((screen.getByLabelText("Tiêu đề") as HTMLInputElement).value).toBe("Draft first"),
  );
  api.getAdminExam.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "FORBIDDEN", message: "Không có quyền" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Cập nhật quyền" }));
  await waitFor(() => {
    expect(screen.queryByLabelText("Tiêu đề")).toBeNull();
    expect(client.getQueryData(["admin-exam", "first"])).toBeUndefined();
  });
});

it("uses native answer keys and asks before a type conversion discards multiple keys", async () => {
  mount(QuestionEditorPage, "/admin/questions/new", "/admin/questions/new");
  await userEvent.type(screen.getByLabelText("Đề bài"), "Pick words");
  await userEvent.type(screen.getByLabelText("Lựa chọn 1"), "One");
  await userEvent.type(screen.getByLabelText("Lựa chọn 2"), "Two");
  await userEvent.click(screen.getByRole("button", { name: "Thêm lựa chọn" }));
  await userEvent.type(screen.getByLabelText("Lựa chọn 3"), "Three");
  await userEvent.selectOptions(screen.getByLabelText("Loại"), "MULTIPLE_CHOICE");
  await userEvent.click(screen.getByRole("checkbox", { name: "Đáp án đúng 3" }));
  await userEvent.selectOptions(screen.getByLabelText("Loại"), "SINGLE_CHOICE");
  const dialog = await screen.findByRole("dialog", { name: "Đổi loại câu hỏi" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
  expect(
    (screen.getByRole("checkbox", { name: "Đáp án đúng 3" }) as HTMLInputElement).checked,
  ).toBe(true);
  await userEvent.selectOptions(screen.getByLabelText("Loại"), "SINGLE_CHOICE");
  await userEvent.click(screen.getByRole("button", { name: "Đổi loại" }));
  await userEvent.click(screen.getByRole("button", { name: "Lưu câu" }));
  await waitFor(() => expect(api.createBankQuestion).toHaveBeenCalledTimes(1));
  expect(api.createBankQuestion.mock.calls[0]?.[1]).toMatchObject({
    type: "SINGLE_CHOICE",
    correctOptionPositions: [1],
    expectedRevision: 0,
  });
});

it("rejects an oversized JSON file before reading it", async () => {
  mount(ImportPage, "/admin/imports/new", "/admin/imports/new");
  const file = new File(["{}"], "large.json", { type: "application/json" });
  const read = vi.fn().mockResolvedValue("{}");
  Object.defineProperty(file, "size", { value: 1_048_577 });
  Object.defineProperty(file, "text", { value: read });
  await userEvent.upload(screen.getByLabelText("Chọn tệp JSON"), file);
  await screen.findByText("Tệp vượt quá 1 MiB.");
  expect(read).not.toHaveBeenCalled();
  expect(api.importQuestions).not.toHaveBeenCalled();
});

it("requires an explicit commit confirmation after a successful dry run and uses a distinct key", async () => {
  api.importQuestions.mockImplementation((_key, body) =>
    Promise.resolve({
      data: {
        id: "report",
        valid: true,
        committed: !body.dryRun,
        issues: [],
        questions: [],
        createdAt: "2026-10-07T00:00:00Z",
      },
    }),
  );
  mount(ImportPage, "/admin/imports/new", "/admin/imports/new");
  await userEvent.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));
  await screen.findByText("Chưa ghi ngân hàng");
  await userEvent.click(screen.getByRole("button", { name: "Nhập câu hỏi" }));
  const dialog = await screen.findByRole("dialog", { name: "Xác nhận nhập câu hỏi" });
  expect(api.importQuestions).toHaveBeenCalledTimes(1);
  await userEvent.click(within(dialog).getByRole("button", { name: "Nhập vào ngân hàng" }));
  await waitFor(() => expect(api.importQuestions).toHaveBeenCalledTimes(2));
  expect(api.importQuestions.mock.calls[0]?.[0]).not.toBe(api.importQuestions.mock.calls[1]?.[0]);
  expect(api.importQuestions.mock.calls[1]?.[1]).toMatchObject({ dryRun: false, schemaVersion: 1 });
});
