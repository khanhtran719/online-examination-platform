import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../catalog-pages";

const state = vi.hoisted(() => ({ history: vi.fn(), browse: vi.fn(), lookup: vi.fn() }));
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({
    api: { getHistory: state.history, browseExams: state.browse },
    mode: "demo",
  }),
}));
vi.mock("../../../app/session", () => ({
  useSession: () => ({ profile: { displayName: "Lan Nguyễn" } }),
}));
vi.mock("../../../app/memory", () => ({ useMemory: () => ({ lookup: state.lookup }) }));
beforeEach(() => {
  state.browse.mockResolvedValue({ data: { items: [], next: null } });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}
describe("dashboard history scope", () => {
  it("loads the catalog independently and sends the selected category to the API", async () => {
    state.history.mockRejectedValue(new Error("Không tải được lịch sử"));
    state.browse.mockResolvedValue({
      data: {
        items: [
          {
            id: "catalog-exam",
            title: "Đề trắc nghiệm IELTS",
            category: "IELTS",
            durationSeconds: 1800,
            questionCount: 20,
          },
        ],
        next: "more-exams",
      },
    });
    mount();
    expect(await screen.findByRole("link", { name: /Đề trắc nghiệm IELTS/ })).toHaveAttribute(
      "href",
      "/exams/catalog-exam",
    );
    fireEvent.click(screen.getByRole("button", { name: "IELTS" }));
    await waitFor(() =>
      expect(state.browse).toHaveBeenCalledWith({ pageSize: 4, category: "IELTS" }),
    );
    expect(screen.getByRole("link", { name: /Xem tất cả đề thi/ })).toHaveAttribute(
      "href",
      "/exams?category=IELTS",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Không thực hiện được");
  });

  it("shows loaded results without declaring the complete history empty or computing totals", async () => {
    state.lookup.mockReturnValue(null);
    state.history.mockResolvedValue({
      data: {
        items: [
          {
            attemptId: "attempt",
            examId: "exam",
            publishedVersionId: "version-abc123",
            startedAt: "2026-10-07T01:00:00Z",
            status: "COMPLETED",
            earned: 5,
            possible: 6,
            expired: false,
          },
        ],
        next: "more",
      },
    });
    mount();
    expect(await screen.findByText("5/6 điểm")).toBeInTheDocument();
    expect(screen.getByText("Chưa có lượt đang làm trong dữ liệu đã tải")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Phiên bản/ })).toHaveAttribute(
      "href",
      "/attempts/attempt/result",
    );
    expect(screen.queryByText(/điểm trung bình/i)).toBeNull();
  });

  it("only uses a cached title for the exact version and owning exam", async () => {
    state.lookup.mockReturnValue({ title: "Tên đề khác", examId: "other" });
    state.history.mockResolvedValue({
      data: {
        items: [
          {
            attemptId: "running",
            examId: "exam",
            publishedVersionId: "frozen",
            startedAt: "2026-10-07T01:00:00Z",
            status: "IN_PROGRESS",
            earned: null,
            possible: null,
            expired: false,
          },
        ],
        next: null,
      },
    });
    mount();
    expect(await screen.findByRole("link", { name: "Vào phòng thi" })).toHaveAttribute(
      "href",
      "/attempts/running",
    );
    expect(screen.queryByText("Tên đề khác")).toBeNull();
  });
});
