import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../catalog-pages";

const state = vi.hoisted(() => ({ history: vi.fn(), lookup: vi.fn() }));
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({ api: { getHistory: state.history }, mode: "demo" }),
}));
vi.mock("../../../app/session", () => ({
  useSession: () => ({ profile: { displayName: "Lan Nguyễn" } }),
}));
vi.mock("../../../app/memory", () => ({ useMemory: () => ({ lookup: state.lookup }) }));
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
