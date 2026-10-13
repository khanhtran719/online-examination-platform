import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";

import { ApiError } from "@web/shared/api/errors";

import { ReviewPage } from "../result-pages";

const api = vi.hoisted(() => ({
  getResult: vi.fn(),
  getReleasedReview: vi.fn(),
  getAttemptStatus: vi.fn(),
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api }) }));
vi.mock("@web/app/session", () => ({
  useSession: () => ({ status: "authenticated", needsReauth: false, profile: { id: "actor" } }),
}));
const memory = { clear: vi.fn(), lookup: vi.fn() };
vi.mock("@web/app/memory", () => ({ useMemory: () => memory }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("removes released answer keys and explanations from the page and cache after access is revoked", async () => {
  api.getResult.mockResolvedValue({
    data: {
      pending: false,
      result: {
        attemptId: "first",
        publishedVersionId: "version",
        review: { href: "/v1/attempts/first/review" },
      },
    },
  });
  api.getAttemptStatus.mockResolvedValue({
    data: { id: "first", publishedVersionId: "version", examId: "exam" },
  });
  api.getReleasedReview.mockResolvedValueOnce({
    data: {
      items: [
        {
          question: {
            id: "question",
            sectionId: "section",
            position: 1,
            type: "SINGLE_CHOICE",
            points: 1,
            prompt: "Released prompt",
            options: [{ id: "key", position: 1, text: "Released key" }],
          },
          selectedOptionIds: ["key"],
          correctOptionIds: ["key"],
          correct: true,
          explanation: "Released explanation",
        },
      ],
      next: null,
    },
  });
  api.getReleasedReview.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "FORBIDDEN", message: "Không có quyền" }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter initialEntries={["/attempts/first/review"]}>
      <QueryClientProvider client={client}>
        <button
          onClick={() => void client.invalidateQueries({ queryKey: ["review", "actor", "first"] })}
        >
          Kiểm tra quyền
        </button>
        <Routes>
          <Route path="/attempts/:attemptId/review" element={<ReviewPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  await screen.findByText("Released explanation");
  await userEvent.click(screen.getByRole("button", { name: "Kiểm tra quyền" }));
  await waitFor(() => {
    expect(screen.queryByText("Released explanation")).toBeNull();
    expect(screen.queryByText("Released key")).toBeNull();
    expect(client.getQueryData(["review", "actor", "first"])).toBeUndefined();
  });
  expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
  expect(screen.getByRole("button", { name: "Làm mới quyền xem" }).hasAttribute("disabled")).toBe(
    true,
  );
  expect(api.getReleasedReview).toHaveBeenCalledTimes(2);
  client.clear();
});
