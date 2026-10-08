import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { LeaderboardPage } from "../result-pages";
import { ApiError } from "../../../shared/api/errors";

const readBoard = vi.hoisted(() => vi.fn());
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({ api: { getLeaderboard: readBoard } }),
}));
vi.mock("../../../app/memory", () => ({ useMemory: () => ({ lookup: () => null }) }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("resets the version watermark on manual refresh instead of retaining a previous page", async () => {
  let fresh = false;
  readBoard.mockImplementation((_exam, _version, query) =>
    Promise.resolve({
      data: {
        items: [
          {
            rank: query.cursor ? 2 : 1,
            pseudonym: query.cursor ? "paper-old-page" : fresh ? "paper-new" : "paper-first",
            earned: 5,
            possible: 6,
            completedAt: "2026-10-07T01:00:00Z",
          },
        ],
        next: query.cursor ? null : "cursor",
      },
    }),
  );
  render(
    <MemoryRouter initialEntries={["/exams/exam/versions/version/leaderboard"]}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <Routes>
          <Route
            path="/exams/:examId/versions/:versionId/leaderboard"
            element={<LeaderboardPage />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await screen.findByText(/paper-first/);
  await userEvent.click(screen.getByRole("button", { name: "Tải thêm" }));
  await screen.findByText(/paper-old-page/);
  fresh = true;
  await userEvent.click(screen.getByRole("button", { name: "Làm mới" }));
  await screen.findByText(/paper-new/);
  expect(screen.queryByText(/paper-old-page/)).toBeNull();
});

it("removes a previously loaded board when the server denies access", async () => {
  readBoard.mockResolvedValueOnce({
    data: {
      items: [
        {
          rank: 1,
          pseudonym: "private-board",
          earned: 5,
          possible: 6,
          completedAt: "2026-10-07T01:00:00Z",
        },
      ],
      next: null,
    },
  });
  readBoard.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "FORBIDDEN", message: "Không có quyền" }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={["/exams/exam/versions/version/leaderboard"]}>
      <QueryClientProvider client={client}>
        <button onClick={() => void client.invalidateQueries({ queryKey: ["leaderboard"] })}>
          Cập nhật quyền
        </button>
        <Routes>
          <Route
            path="/exams/:examId/versions/:versionId/leaderboard"
            element={<LeaderboardPage />}
          />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await screen.findByText(/private-board/);
  await userEvent.click(screen.getByRole("button", { name: "Cập nhật quyền" }));
  await screen.findByRole("heading", { name: "Bảng xếp hạng không mở" });
  expect(screen.queryByText(/private-board/)).toBeNull();
  expect(client.getQueryData(["leaderboard", "exam", "version"])).toBeUndefined();
});
