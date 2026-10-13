import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { AdminAttemptPage } from "../admin-attempt-page";
import { SubmissionsPage } from "../submissions-page";

const runtime = vi.hoisted(() => ({
  api: {
    getAdminResult: vi.fn(),
    getAdminReview: vi.fn(),
    listSubmissions: vi.fn(),
    replayFailedAttempt: vi.fn(),
  },
  permissions: ["reporting.read", "assessment.review.admin", "assessment.replay"],
}));
vi.mock("@web/app/runtime", () => ({
  useRuntime: () => ({
    api: runtime.api,
    mode: "demo",
    demo: { permissions: runtime.permissions, replayRevision: () => 3 },
  }),
}));
afterEach(cleanup);
const attemptId = "019a82d0-3000-7000-8000-000000000001";
const forbidden = () =>
  new ApiError({ kind: "http", status: 403, errorCode: "Forbidden", message: "Không đủ quyền." });
beforeEach(() => {
  vi.resetAllMocks();
  runtime.permissions = ["reporting.read", "assessment.review.admin", "assessment.replay"];
  runtime.api.getAdminReview.mockResolvedValue({ data: { items: [], next: null, pageSize: 20 } });
});
function setup(page: "attempt" | "submissions") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const node = (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/${page}/${attemptId}`]}>
        <Routes>
          <Route path="/attempt/:attemptId" element={<AdminAttemptPage />} />
          <Route path="/submissions/:examId" element={<SubmissionsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { client, ...render(node), node };
}
it("purges cached review when the owning result read is forbidden", async () => {
  runtime.api.getAdminResult.mockResolvedValueOnce({
    data: {
      pending: false,
      result: { earned: 1, possible: 2, percentageBasisPoints: 5000 },
      attempt: null,
    },
  });
  const view = setup("attempt");
  await waitFor(() => expect(runtime.api.getAdminReview).toHaveBeenCalledTimes(1));
  runtime.api.getAdminResult.mockRejectedValue(forbidden());
  await act(async () => {
    await view.client.invalidateQueries({ queryKey: ["admin-result", attemptId] });
  });
  await waitFor(() =>
    expect(view.client.getQueryData(["admin-review", attemptId])).toBeUndefined(),
  );
});
it("does not offer replay for a completed result", async () => {
  runtime.api.getAdminResult.mockResolvedValue({
    data: {
      pending: false,
      result: {
        publishedVersionId: attemptId,
        earned: 1,
        possible: 2,
        percentageBasisPoints: 5000,
      },
      attempt: null,
    },
  });
  setup("attempt");
  await screen.findByText("1/2 điểm");
  expect(screen.queryByRole("button", { name: "Yêu cầu xử lý lại" })).toBeNull();
});
it("does not unlock a forbidden ledger by applying another version filter", async () => {
  runtime.api.listSubmissions.mockRejectedValue(forbidden());
  setup("submissions");
  await screen.findByText("Không đủ quyền.");
  await userEvent.type(screen.getByLabelText("Lọc theo phiên bản đã phát hành"), attemptId);
  await userEvent.click(screen.getByRole("button", { name: "Áp dụng bộ lọc" }));
  expect(runtime.api.listSubmissions).toHaveBeenCalledTimes(1);
});
it("requires replay confirmation and reuses the exact intent after a 503", async () => {
  runtime.api.getAdminResult.mockResolvedValue({
    data: {
      pending: true,
      result: null,
      attempt: {
        id: attemptId,
        examId: attemptId,
        startedAt: "2026-10-12T02:00:00.000Z",
        deadline: "2026-10-12T04:00:00.000Z",
        submittedAt: "2026-10-12T03:00:00.000Z",
        expired: false,
        status: "FAILED",
        publishedVersionId: attemptId,
        replayPending: false,
      },
    },
  });
  runtime.api.replayFailedAttempt
    .mockRejectedValueOnce(
      new ApiError({ kind: "http", status: 503, errorCode: "Unavailable", message: "Unavailable" }),
    )
    .mockResolvedValue({ data: { accepted: true } });
  setup("attempt");
  await screen.findByText("Chưa có điểm");
  await userEvent.type(screen.getByLabelText("Lý do"), "Phụ thuộc đã được khôi phục.");
  await userEvent.click(screen.getByRole("button", { name: "Yêu cầu xử lý lại" }));
  expect(runtime.api.replayFailedAttempt).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  await userEvent.click(await screen.findByRole("button", { name: "Thử gửi lại cùng nội dung" }));
  await waitFor(() => expect(runtime.api.replayFailedAttempt).toHaveBeenCalledTimes(2));
  expect(runtime.api.replayFailedAttempt.mock.calls[1]).toEqual(
    runtime.api.replayFailedAttempt.mock.calls[0],
  );
});
