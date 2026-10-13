import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { HistoryItem, LeaderboardEntry, Page } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { HistoryPage, LeaderboardPage } from "../result-pages";

const state = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getLeaderboard: vi.fn(),
  memory: { lookup: vi.fn(), clear: vi.fn() },
  actor: "candidate-a",
  needsReauth: false,
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state }) }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
vi.mock("@web/app/session", () => ({
  useSession: () => ({
    status: "authenticated",
    profile: { id: state.actor },
    needsReauth: state.needsReauth,
  }),
}));
const attempt: HistoryItem = {
  attemptId: "attempt-first",
  examId: "exam",
  publishedVersionId: "version-first",
  startedAt: "2026-10-07T01:00:00Z",
  status: "COMPLETED",
  expired: true,
  earned: 0,
  possible: 6,
};
const entry: LeaderboardEntry = {
  rank: 1,
  pseudonym: "private-alias",
  earned: 5,
  possible: 6,
  completedAt: "2026-10-07T01:00:00Z",
};
beforeEach(() => {
  vi.resetAllMocks();
  state.actor = "candidate-a";
  state.needsReauth = false;
  state.memory.lookup.mockReturnValue(null);
  state.getHistory.mockResolvedValue({ data: { items: [attempt], next: null } });
  state.getLeaderboard.mockResolvedValue({ data: { items: [entry], next: null } });
});
afterEach(cleanup);
function mount(kind: "history" | "leaderboard") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function App() {
    return (
      <MemoryRouter
        initialEntries={[
          kind === "history" ? "/history" : "/exams/exam/versions/version-first/leaderboard",
        ]}
      >
        <QueryClientProvider client={client}>
          <button onClick={() => void client.invalidateQueries({ queryKey: [kind] })}>
            Recheck
          </button>
          <Routes>
            <Route path="/history" element={<HistoryPage />} />
            <Route
              path="/exams/:examId/versions/:versionId/leaderboard"
              element={<LeaderboardPage />}
            />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  const view = render(<App />);
  return { ...view, client, update: () => view.rerender(<App />) };
}
function deny(status: number) {
  return new ApiError({ kind: "http", status, errorCode: "Denied", message: "Denied" });
}
it.each([401, 403])(
  "hides and purges loaded History after %s, without a retry escape",
  async (status) => {
    const { client } = mount("history");
    await screen.findByRole("link", { name: /Kết quả|Xem kết quả/ });
    state.getHistory.mockRejectedValue(deny(status));
    await userEvent.click(screen.getByRole("button", { name: "Recheck" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Lịch sử các lượt thi" })).toBeNull(),
    );
    expect(state.memory.clear).toHaveBeenCalled();
    expect(
      client.getQueriesData({ queryKey: ["history"] }).every(([, data]) => data === undefined),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Làm mới" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
);
it.each([401, 404])("closes the version board and purges its snapshot after %s", async (status) => {
  const { client } = mount("leaderboard");
  await screen.findByText("private-alias");
  state.getLeaderboard.mockRejectedValue(deny(status));
  await userEvent.click(screen.getByRole("button", { name: "Recheck" }));
  await screen.findByRole("heading", { name: "Bảng xếp hạng không mở" });
  expect(screen.queryByText("private-alias")).toBeNull();
  await waitFor(() =>
    expect(
      client.getQueriesData({ queryKey: ["leaderboard"] }).every(([, data]) => data === undefined),
    ).toBe(true),
  );
  expect(screen.getByRole("button", { name: "Làm mới" })).toBeDisabled();
});
it("does not attach a title from the wrong frozen version to History", async () => {
  state.memory.lookup.mockReturnValue({
    examId: "exam",
    publishedVersionId: "different-version",
    title: "Wrong frozen title",
    version: 9,
  });
  mount("history");
  await screen.findByRole("region", { name: "Lịch sử các lượt thi" });
  expect(screen.queryByText("Wrong frozen title")).toBeNull();
});
it("keeps real zero scores and routes completed expired attempts to the result", async () => {
  mount("history");
  const result = await screen.findByRole("link", { name: /Kết quả|Xem kết quả/ });
  expect(result).toHaveAttribute("href", "/attempts/attempt-first/result");
  expect(screen.queryByText("Chưa có điểm")).toBeNull();
  expect(screen.getByRole("region", { name: "Lịch sử các lượt thi" })).toHaveTextContent(
    /0\s*\/\s*6/,
  );
});
it("removes actor A history while the actor B request is unresolved", async () => {
  const { update } = mount("history");
  await screen.findByRole("link", { name: /Kết quả|Xem kết quả/ });
  state.getHistory.mockImplementation(() => new Promise(() => {}));
  state.actor = "candidate-b";
  update();
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Lịch sử các lượt thi" })).toBeNull(),
  );
});
it.each(["history", "leaderboard"] as const)(
  "discards a late %s response after leaving the scope",
  async (kind) => {
    let resolve!: (value: { data: Page<HistoryItem | LeaderboardEntry> }) => void;
    const response = new Promise<{ data: Page<HistoryItem | LeaderboardEntry> }>((r) => {
      resolve = r;
    });
    (kind === "history" ? state.getHistory : state.getLeaderboard).mockReturnValue(response);
    const { unmount, client } = mount(kind);
    await waitFor(() =>
      expect(kind === "history" ? state.getHistory : state.getLeaderboard).toHaveBeenCalledTimes(1),
    );
    unmount();
    await act(async () => {
      resolve({
        data: { items: [kind === "history" ? attempt : entry], next: null, pageSize: 20 },
      });
      await response;
    });
    expect(
      client.getQueriesData({ queryKey: [kind] }).every(([, data]) => data === undefined),
    ).toBe(true);
  },
);
it("drops loaded data and stops requests while session reauthentication is required", async () => {
  const { update } = mount("history");
  await screen.findByRole("region", { name: "Lịch sử các lượt thi" });
  state.needsReauth = true;
  update();
  await waitFor(() =>
    expect(screen.queryByRole("region", { name: "Lịch sử các lượt thi" })).toBeNull(),
  );
  expect(screen.getByRole("button", { name: "Làm mới" })).toBeDisabled();
});

it.each(["history", "leaderboard"] as const)("shows an explicit empty %s state", async (kind) => {
  (kind === "history" ? state.getHistory : state.getLeaderboard).mockResolvedValue({
    data: { items: [], next: null, pageSize: 20 },
  });
  mount(kind);
  await screen.findByRole("heading", {
    name: kind === "history" ? "Chưa có lượt thi" : "Chưa có dòng nào",
  });
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.getByRole("button", { name: "Làm mới" })).toBeEnabled();
});

it("maps every History lifecycle to a safe destination and keeps incomplete score pairs nullable", async () => {
  const statuses: HistoryItem["status"][] = [
    "CREATED",
    "IN_PROGRESS",
    "SUBMITTED",
    "PROCESSING",
    "COMPLETED",
    "EXPIRED",
    "FAILED",
  ];
  state.getHistory.mockResolvedValue({
    data: {
      items: statuses.map((status) => ({
        ...attempt,
        attemptId: status,
        status,
        earned: status === "COMPLETED" ? 0 : null,
        possible: status === "FAILED" ? 6 : null,
      })),
      next: null,
      pageSize: 20,
    },
  });
  mount("history");
  const table = await screen.findByRole("table");
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(7);
  for (const [i, status] of statuses.entries()) {
    const row = within(rows[i]!);
    const active = status === "CREATED" || status === "IN_PROGRESS";
    expect(row.getByRole("link")).toHaveAttribute(
      "href",
      `/attempts/${status}${active ? "" : status === "COMPLETED" ? "/result" : "/status"}`,
    );
    expect(row.getByText("Chưa có điểm")).toBeVisible();
  }
  expect(screen.queryByRole("button", { name: /Xử lý lại/ })).toBeNull();
});
