import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { StatusPage } from "../result-pages";

const statusApi = vi.hoisted(() => ({ getAttemptStatus: vi.fn() }));
const readStatus = statusApi.getAttemptStatus;
vi.mock("../../../app/runtime", () => ({
  useRuntime: () => ({ api: statusApi }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("clears the previous attempt and result action when navigating to another status route", async () => {
  readStatus.mockImplementation((id: string) =>
    id === "first"
      ? Promise.resolve({
          data: {
            id,
            status: "COMPLETED",
            resultAvailable: true,
            expired: false,
            replayPending: false,
          },
          meta: {},
        })
      : new Promise(() => undefined),
  );
  render(
    <MemoryRouter initialEntries={["/attempts/first/status"]}>
      <Link to="/attempts/second/status">Lượt tiếp theo</Link>
      <Routes>
        <Route path="/attempts/:attemptId/status" element={<StatusPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const action = await screen.findByRole("link", { name: "Xem kết quả" });
  expect(action.getAttribute("href")).toBe("/attempts/first/result");
  await userEvent.click(screen.getByRole("link", { name: "Lượt tiếp theo" }));
  expect(screen.queryByRole("link", { name: "Xem kết quả" })).toBeNull();
  expect(screen.queryByText("Đã có kết quả")).toBeNull();
});

it("checks a stopped failed attempt again only after a manual request", async () => {
  readStatus
    .mockResolvedValueOnce({
      data: {
        id: "first",
        status: "FAILED",
        resultAvailable: false,
        expired: false,
        replayPending: false,
      },
      meta: {},
    })
    .mockResolvedValueOnce({
      data: {
        id: "first",
        status: "COMPLETED",
        resultAvailable: true,
        expired: false,
        replayPending: false,
      },
      meta: {},
    });
  render(
    <MemoryRouter initialEntries={["/attempts/first/status"]}>
      <Routes>
        <Route path="/attempts/:attemptId/status" element={<StatusPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("Bài chưa xử lý xong");
  expect(readStatus).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Kiểm tra lại" }));
  expect((await screen.findByRole("link", { name: "Xem kết quả" })).getAttribute("href")).toBe(
    "/attempts/first/result",
  );
  expect(readStatus).toHaveBeenCalledTimes(2);
});
