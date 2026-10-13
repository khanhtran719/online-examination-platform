import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Attempt, Result, ReviewQuestion } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { ResultPage, ReviewPage } from "../result-pages";

const state = vi.hoisted(() => ({
  api: {
    getResult: vi.fn(),
    getReleasedReview: vi.fn(),
    getAttemptStatus: vi.fn(),
    resumeAttempt: vi.fn(),
  },
  session: { status: "authenticated", needsReauth: false, profile: { id: "actor" } },
  memory: { clear: vi.fn(), lookup: vi.fn() },
}));
vi.mock("@web/app/runtime", () => ({ useRuntime: () => ({ api: state.api }) }));
vi.mock("@web/app/session", () => ({ useSession: () => state.session }));
vi.mock("@web/app/memory", () => ({ useMemory: () => state.memory }));
const score: Result = {
  attemptId: "first",
  publishedVersionId: "version",
  submissionId: "submission",
  completedAt: "2026-10-13T10:00:00Z",
  earned: 5,
  possible: 6,
  correct: 2,
  total: 3,
  percentageBasisPoints: 8333,
  expired: false,
  scoringPolicy: "EXACT_MATCH_V1",
  sections: [{ sectionId: "section", earned: 5, possible: 6, correct: 2, total: 3 }],
  review: { href: "/v1/attempts/first/review" },
};
const attempt: Attempt = {
  id: "first",
  examId: "exam",
  publishedVersionId: "version",
  revision: 1,
  status: "COMPLETED",
  startedAt: "2026-10-13T09:00:00Z",
  deadline: "2026-10-13T11:00:00Z",
  submittedAt: "2026-10-13T10:00:00Z",
  expired: false,
  serverNow: "2026-10-13T10:00:00Z",
  canSave: false,
  resultAvailable: true,
  pollAfterSeconds: 0,
  replayPending: false,
};
const row: ReviewQuestion = {
  question: {
    id: "question",
    sectionId: "section",
    position: 1,
    type: "SINGLE_CHOICE",
    points: 1,
    prompt: "Released prompt",
    options: [
      { id: "key", position: 1, text: "Released key" },
      { id: "other", position: 2, text: "Other option" },
    ],
  },
  selectedOptionIds: ["key"],
  correctOptionIds: ["key"],
  correct: true,
  explanation: "Released explanation",
};
let client: QueryClient;
function mount(review = false) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/attempts/first/${review ? "review" : "result"}`]}>
        <Routes>
          <Route path="/attempts/:attemptId/result" element={<ResultPage />} />
          <Route path="/attempts/:attemptId/review" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function cachedReview() {
  return client
    .getQueryCache()
    .getAll()
    .filter((q) => q.queryKey[0] === "review")
    .map((q) => q.state.data)
    .filter(Boolean);
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  state.session.profile.id = "actor";
  state.session.needsReauth = false;
  state.api.getResult.mockResolvedValue({ data: { pending: false, result: score, attempt: null } });
  state.api.getAttemptStatus.mockResolvedValue({ data: attempt });
  state.api.resumeAttempt.mockResolvedValue({ data: attempt });
  state.api.getReleasedReview.mockResolvedValue({
    data: { items: [row], pageSize: 20, next: null },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.resetAllMocks();
});

it.each([401, 403, 404])(
  "purges result and released review on result denial %i",
  async (status) => {
    mount();
    await screen.findByText("83.33%");
    client.setQueryData(["review", "actor", "first"], {
      pages: [{ items: [row] }],
      pageParams: [undefined],
    });
    state.api.getResult.mockRejectedValue(
      new ApiError({ kind: "http", status, errorCode: "DENIED", message: "Không thể xem" }),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["result"] });
    });
    await waitFor(() => expect(screen.queryByText("83.33%")).not.toBeInTheDocument());
    await waitFor(() => expect(cachedReview()).toEqual([]));
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((q) => q.queryKey[0] === "result" && q.state.data),
    ).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
  },
);
it("never acknowledges submission from a pending result whose attempt is still active", async () => {
  state.api.getResult.mockResolvedValue({
    data: {
      pending: true,
      result: null,
      attempt: { ...attempt, status: "IN_PROGRESS", submittedAt: null },
    },
  });
  mount();
  await screen.findByText("Kết quả chưa sẵn sàng");
  expect(screen.queryByText("Máy chủ đã nhận yêu cầu")).not.toBeInTheDocument();
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
});
it("does not substitute foreign frozen titles or a mismatched attempt's leaderboard", async () => {
  state.memory.lookup.mockReturnValue({
    examId: "foreign",
    publishedVersionId: "version",
    title: "Wrong title",
    sections: [],
    version: 1,
  });
  state.api.getAttemptStatus.mockResolvedValue({ data: { ...attempt, id: "other" } });
  state.api.resumeAttempt.mockResolvedValue({ data: { ...attempt, id: "other" } });
  mount();
  await screen.findByText("83.33%");
  await waitFor(() => expect(state.api.getAttemptStatus).toHaveBeenCalled());
  expect(screen.queryByText(/Wrong title/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Bảng xếp hạng của phiên bản này" }),
  ).not.toBeInTheDocument();
});
it("rejects a result belonging to a different attempt", async () => {
  state.api.getResult.mockResolvedValue({
    data: { pending: false, result: { ...score, attemptId: "other" }, attempt: null },
  });
  mount();
  await screen.findByText("Không thể xem kết quả");
  expect(screen.queryByText("83.33%")).not.toBeInTheDocument();
  expect(state.api.getAttemptStatus).not.toHaveBeenCalled();
});
it.each(["exam", "version"])(
  "rejects frozen labels with a foreign %s even after valid status metadata arrives",
  async (field) => {
    state.memory.lookup.mockReturnValue({
      examId: field === "exam" ? "foreign" : "exam",
      publishedVersionId: field === "version" ? "foreign" : "version",
      title: "Foreign title",
      sections: [{ id: "section", title: "Foreign section" }],
      version: 1,
    });
    mount();
    await screen.findByRole("link", { name: "Bảng xếp hạng của phiên bản này" });
    expect(screen.queryByText(/Foreign/)).not.toBeInTheDocument();
    expect(screen.getByText("Phiên bản …ersion")).toBeVisible();
  },
);
it("keeps an authorized score when optional status metadata is unavailable", async () => {
  state.api.getAttemptStatus.mockRejectedValue(
    new ApiError({
      kind: "http",
      status: 403,
      errorCode: "DENIED",
      message: "Không có quyền xem trạng thái",
    }),
  );
  mount();
  await screen.findByText("83.33%");
  await waitFor(() => expect(state.api.getAttemptStatus).toHaveBeenCalledTimes(1));
  expect(screen.getByText("83.33%")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "Bảng xếp hạng của phiên bản này" }),
  ).not.toBeInTheDocument();
});
it.each([null, { href: "https://foreign.test/review" }])(
  "does not fetch keys without a safe released review link: %s",
  async (review) => {
    state.api.getResult.mockResolvedValue({
      data: { pending: false, result: { ...score, review }, attempt: null },
    });
    mount(true);
    await screen.findByRole("heading", { name: "Chưa mở giải thích" });
    expect(
      screen.queryByText("Lựa chọn của bạn và đáp án đã được công bố cho lượt thi này."),
    ).not.toBeInTheDocument();
    expect(state.api.getReleasedReview).not.toHaveBeenCalled();
  },
);
it("serializes load-more and starts a fresh cursor chain after checking release again", async () => {
  let finish!: (value: unknown) => void;
  state.api.getReleasedReview
    .mockResolvedValueOnce({ data: { items: [row], pageSize: 20, next: "cursor1" } })
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          finish = done;
        }),
    )
    .mockResolvedValueOnce({ data: { items: [row], pageSize: 20, next: "new-cursor" } });
  mount(true);
  await screen.findByText("Released explanation");
  await userEvent.dblClick(screen.getByRole("button", { name: "Tải thêm câu hỏi" }));
  expect(state.api.getReleasedReview).toHaveBeenCalledTimes(2);
  await act(async () =>
    finish({
      data: {
        items: [{ ...row, question: { ...row.question, id: "second" } }],
        pageSize: 20,
        next: "cursor2",
      },
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Làm mới quyền xem" })).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Làm mới quyền xem" }));
  await waitFor(() => expect(state.api.getReleasedReview).toHaveBeenCalledTimes(3));
  expect(state.api.getReleasedReview.mock.calls.map((args) => args[1].cursor)).toEqual([
    undefined,
    "cursor1",
    undefined,
  ]);
  await waitFor(() => expect(screen.getByText("1 câu đã tải · Còn trang tiếp theo")).toBeVisible());
});
it.each(["closed", "pending", "denied"])(
  "purges released keys when the result gate becomes %s",
  async (mode) => {
    mount(true);
    await screen.findByText("Released explanation");
    if (mode === "denied")
      state.api.getResult.mockRejectedValue(
        new ApiError({ kind: "http", status: 403, errorCode: "DENIED", message: "Không thể xem" }),
      );
    else
      state.api.getResult.mockResolvedValue({
        data:
          mode === "closed"
            ? { pending: false, result: { ...score, review: null }, attempt: null }
            : { pending: true, result: null, attempt },
      });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["result"] });
    });
    await waitFor(() => expect(screen.queryByText("Released explanation")).not.toBeInTheDocument());
    await waitFor(() => expect(cachedReview()).toEqual([]));
  },
);
it("ignores a late review page when permission is revoked during the read", async () => {
  let resolve!: (value: unknown) => void;
  state.api.getReleasedReview
    .mockResolvedValueOnce({ data: { items: [row], pageSize: 20, next: "cursor" } })
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
  mount(true);
  await screen.findByText("Released explanation");
  await userEvent.click(screen.getByRole("button", { name: /Tải thêm/ }));
  state.api.getResult.mockRejectedValue(
    new ApiError({ kind: "http", status: 403, errorCode: "DENIED", message: "Không thể xem" }),
  );
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["result"] });
  });
  await act(async () =>
    resolve({
      data: {
        items: [{ ...row, explanation: "Late private explanation" }],
        pageSize: 20,
        next: null,
      },
    }),
  );
  await waitFor(() => expect(cachedReview()).toEqual([]));
  expect(screen.queryByText("Late private explanation")).not.toBeInTheDocument();
});
it("hides the previous actor's released keys and prevents private cache resurrection", async () => {
  const view = mount(true);
  await screen.findByText("Released explanation");
  state.api.getResult.mockImplementation(() => new Promise(() => undefined));
  state.session.profile.id = "second-actor";
  view.rerender(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/attempts/first/review"]}>
        <Routes>
          <Route path="/attempts/:attemptId/review" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(screen.queryByText("Released explanation")).not.toBeInTheDocument();
  await waitFor(() => expect(cachedReview()).toEqual([]));
});
it("navigates read-only questions and filters only loaded rows without another read", async () => {
  state.api.getReleasedReview.mockResolvedValue({
    data: {
      items: [
        row,
        {
          ...row,
          question: { ...row.question, id: "question2", position: 2, prompt: "Second prompt" },
          selectedOptionIds: [],
          correct: false,
        },
      ],
      pageSize: 20,
      next: null,
    },
  });
  mount(true);
  await screen.findByRole("heading", { name: "Released prompt" });
  await userEvent.click(screen.getByRole("button", { name: "Câu sau" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Second prompt" })).toHaveFocus());
  await userEvent.click(screen.getByRole("button", { name: "Chưa đúng (1)" }));
  expect(screen.getByRole("button", { name: /Câu 2, Chưa đúng/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  expect(screen.queryByRole("button", { name: /Câu 1, Đúng/ })).not.toBeInTheDocument();
  expect(state.api.getReleasedReview).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
