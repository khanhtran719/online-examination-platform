import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "../dashboard-page";

const fixture = vi.hoisted(() => ({
  history: vi.fn(),
  browse: vi.fn(),
  lookup: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({ api: { getHistory: fixture.history, browseExams: fixture.browse } }),
}));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: "authenticated",
    needsReauth: false,
    epoch: 1,
    profile: { id: "actor", displayName: "Lan" },
  }),
}));
vi.mock("@web/app/memory", () => ({
  useMemory: () => ({ lookup: fixture.lookup, clear: fixture.clear }),
}));
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  fixture.browse.mockResolvedValue({ data: { items: [], next: null, pageSize: 3 } });
});
afterEach(cleanup);
const historyItem = {
  attemptId: "attempt",
  examId: "exam",
  publishedVersionId: "version-123",
  status: "COMPLETED",
  startedAt: "2026-10-13T00:00:00Z",
  earned: 0,
  possible: 10,
  expired: false,
};
describe("Dashboard truthful snapshots", () => {
  it("does not claim more history pages exist when the complete empty snapshot has no cursor", async () => {
    fixture.history.mockResolvedValue({ data: { items: [], next: null, pageSize: 20 } });
    mount();
    await screen.findByText("Chưa có lượt đang làm trong dữ liệu đã tải");
    expect(screen.queryByText(/Các lượt khác có thể nằm ở trang lịch sử tiếp theo/)).toBeNull();
  });
  it("does not use metadata for a different frozen version even when the owning exam matches", async () => {
    fixture.history.mockResolvedValue({ data: { items: [historyItem], next: null, pageSize: 20 } });
    fixture.lookup.mockReturnValue({
      examId: "exam",
      publishedVersionId: "other-version",
      title: "Wrong current title",
    });
    mount();
    await screen.findByText("0/10 điểm");
    expect(screen.queryByText("Wrong current title")).toBeNull();
  });
  it("retains zero score and routes all submitted states to status rather than opening a room", async () => {
    fixture.history.mockResolvedValue({
      data: {
        items: [
          historyItem,
          {
            ...historyItem,
            attemptId: "pending",
            status: "PROCESSING",
            earned: null,
            possible: null,
          },
          { ...historyItem, attemptId: "failed", status: "FAILED", earned: null, possible: null },
        ],
        next: null,
        pageSize: 20,
      },
    });
    mount();
    const zero = await screen.findByRole("link", { name: /0\/10 điểm/ });
    expect(zero).toHaveAttribute("href", "/attempts/attempt/result");
    expect(
      screen
        .getAllByRole("link", { name: /Chưa có điểm/ })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/attempts/pending/status", "/attempts/failed/status"]);
  });
});
