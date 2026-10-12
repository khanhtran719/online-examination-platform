import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { AdminExamListPage } from "../exam-list-page";

const state = vi.hoisted(() => ({ list: vi.fn(), mode: "demo", permissions: ["catalog.manage"] }));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: { listAdminExams: state.list },
    mode: state.mode,
    demo: { permissions: state.permissions },
  }),
}));
const row = {
  id: "exam",
  title: "Cloud fundamentals",
  category: "IT_CERTIFICATION",
  durationSeconds: 5400,
  revision: 8,
  published: false,
  archived: false,
  publishedVersionId: "older",
  openAt: "2026-11-15T01:00:00Z",
  closeAt: "2026-11-15T05:00:00Z",
  displayTimezone: "Asia/Ho_Chi_Minh",
};
beforeEach(() => {
  state.mode = "demo";
  state.permissions = ["catalog.manage"];
  state.list.mockResolvedValue({ data: { items: [row], next: "page-2" } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AdminExamListPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
  return { ...render(tree), client, tree };
}
it("filters only loaded rows, keeps previous publication provenance and preserves cursor loading", async () => {
  mount();
  expect(await screen.findByText("Cloud fundamentals")).toBeVisible();
  expect(screen.getByText("Có phiên bản từng phát hành")).toBeVisible();
  expect(screen.getByText(/08:00/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Tìm trong các đề đã tải"), {
    target: { value: "absent" },
  });
  expect(screen.queryByText("Cloud fundamentals")).toBeNull();
  expect(screen.getByText("Không khớp trong phần đã tải")).toBeVisible();
  expect(screen.getByText("Đã tải 1 đề")).toBeVisible();
  expect(state.list).toHaveBeenCalledTimes(1);
  state.list.mockResolvedValueOnce({
    data: { items: [{ ...row, id: "next", title: "absent matching" }], next: null },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tải thêm đề" }));
  expect(await screen.findByText("absent matching")).toBeVisible();
  expect(state.list).toHaveBeenLastCalledWith({ pageSize: 20, cursor: "page-2" });
  expect(screen.getByText("Đã tải 2 đề")).toBeVisible();
});
it("does not request or expose cached rows without capability or in live mode", async () => {
  state.mode = "live";
  const { client, rerender, tree } = mount();
  client.setQueryData(["admin-exams"], {
    pages: [{ items: [row], next: null }],
    pageParams: [undefined],
  });
  rerender(tree);
  await waitFor(() => expect(screen.getByText("Chưa mở được trang này")).toBeVisible());
  expect(state.list).not.toHaveBeenCalled();
  expect(screen.queryByText(row.title)).toBeNull();
});

it("hides previously loaded private rows after a forbidden refresh and stops further reads", async () => {
  mount();
  expect(await screen.findByText(row.title)).toBeVisible();
  state.list.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "Forbidden", message: "Forbidden" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Làm mới/ }));
  await waitFor(() => expect(screen.queryByText(row.title)).toBeNull());
  expect(screen.queryByText("Đã tải 1 đề")).toBeNull();
  expect(screen.getByRole("button", { name: /Làm mới|Đang tải/ })).toBeDisabled();
  expect(state.list).toHaveBeenCalledTimes(2);
});
