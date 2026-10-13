import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, expect, it, vi } from "vitest";

import type { AdminQuestion } from "@web/shared/api/dto";
import { ApiError } from "@web/shared/api/errors";

import { useQuestionDraft } from "../use-question-draft";

afterEach(cleanup);
const question: AdminQuestion = {
  id: "q1",
  revision: 1,
  archived: false,
  type: "SINGLE_CHOICE",
  prompt: "Pick A",
  options: [
    { position: 1, text: "A" },
    { position: 2, text: "B" },
  ],
  correctOptionPositions: [1],
  points: 10,
  explanation: "Private explanation",
};
const event = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;
it("does not adopt a refreshed revision while keeping the local draft", () => {
  const onSave = vi.fn();
  const view = renderHook(({ initial }) => useQuestionDraft({ initial, onSave, onArchive: null }), {
    initialProps: { initial: question },
  });
  act(() => view.result.current.setPrompt("Local"));
  view.rerender({ initial: { ...question, prompt: "Remote", revision: 2 } });
  expect(view.result.current.prompt).toBe("Local");
  expect(view.result.current.revision).toBe(1);
});
it("marks archive pending and blocks a competing save until acknowledgement", async () => {
  let resolve!: (value: number) => void;
  const onArchive = vi.fn(
    () =>
      new Promise<number>((done) => {
        resolve = done;
      }),
  );
  const onSave = vi.fn();
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive }));
  act(() => view.result.current.archive());
  expect(view.result.current.pending).toBe(true);
  act(() => view.result.current.submit(event()));
  expect(onSave).not.toHaveBeenCalled();
  await act(async () => resolve(2));
  expect(view.result.current.pending).toBe(false);
});
it("blocks archive while a save is in flight", async () => {
  let resolve!: (value: { resourceId: string; revision: number }) => void;
  const onSave = vi.fn(
    () =>
      new Promise<{ resourceId: string; revision: number }>((done) => {
        resolve = done;
      }),
  );
  const onArchive = vi.fn();
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive }));
  act(() => {
    view.result.current.submit(event());
    view.result.current.archive();
  });
  expect(onArchive).not.toHaveBeenCalled();
  await act(async () => resolve({ resourceId: "q1", revision: 2 }));
});
it("keeps an ambiguous server write frozen and retries the same key/body", async () => {
  const onSave = vi
    .fn()
    .mockRejectedValueOnce(
      new ApiError({ kind: "http", status: 503, errorCode: "Unavailable", message: "Unavailable" }),
    )
    .mockResolvedValue({ resourceId: "q1", revision: 2 });
  const onArchive = vi.fn();
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive }));
  act(() => view.result.current.submit(event()));
  await waitFor(() => expect(view.result.current.pending).toBe(false));
  expect(view.result.current.unknown).toBe(true);
  act(() => view.result.current.archive());
  expect(onArchive).not.toHaveBeenCalled();
  await act(async () => view.result.current.retry());
  expect(onSave.mock.calls[1]).toEqual(onSave.mock.calls[0]);
});
it("rejects non-finite points before any request", () => {
  const onSave = vi.fn();
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive: null }));
  act(() => view.result.current.setPoints("NaN"));
  act(() => view.result.current.submit(event()));
  expect(onSave).not.toHaveBeenCalled();
});
it("retains local fields/base revision after conflict until explicit fresh adoption", async () => {
  const onConflict = vi.fn();
  const onSave = vi.fn().mockRejectedValue(
    new ApiError({
      kind: "http",
      status: 409,
      errorCode: "Version conflict",
      message: "Version conflict",
    }),
  );
  const view = renderHook(
    ({ initial }) => useQuestionDraft({ initial, onSave, onArchive: null, onConflict }),
    { initialProps: { initial: question } },
  );
  act(() => view.result.current.setPrompt("Local edit"));
  act(() => view.result.current.submit(event()));
  await waitFor(() => expect(view.result.current.conflict).toBe(true));
  view.rerender({ initial: { ...question, revision: 2, prompt: "Remote edit" } });
  expect(view.result.current.prompt).toBe("Local edit");
  expect(view.result.current.revision).toBe(1);
  expect(onConflict).toHaveBeenCalledTimes(1);
  act(() => view.result.current.adoptLatest());
  expect(view.result.current.prompt).toBe("Remote edit");
  expect(view.result.current.revision).toBe(2);
});
it("keeps archived fields read-only and cannot create another mutation", () => {
  const onSave = vi.fn(),
    onArchive = vi.fn();
  const view = renderHook(() =>
    useQuestionDraft({ initial: { ...question, archived: true }, onSave, onArchive }),
  );
  act(() => {
    view.result.current.setPrompt("Changed");
    view.result.current.submit(event());
    view.result.current.archive();
  });
  expect(view.result.current.prompt).toBe(question.prompt);
  expect(onSave).not.toHaveBeenCalled();
  expect(onArchive).not.toHaveBeenCalled();
});
it("cannot adopt a cached pre-conflict revision as if it were the freshly changed draft", async () => {
  const onSave = vi.fn().mockRejectedValue(
    new ApiError({
      kind: "http",
      status: 409,
      errorCode: "Version conflict",
      message: "Version conflict",
    }),
  );
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive: null }));
  act(() => view.result.current.setPrompt("Local edit"));
  act(() => view.result.current.submit(event()));
  await waitFor(() => expect(view.result.current.conflict).toBe(true));
  act(() => view.result.current.adoptLatest());
  expect(view.result.current.conflict).toBe(true);
  expect(view.result.current.prompt).toBe("Local edit");
});
it("archive shows the last acknowledged fields while its background read is still stale", async () => {
  const onSave = vi.fn().mockResolvedValue({ resourceId: "q1", revision: 2 });
  const onArchive = vi.fn().mockResolvedValue(3);
  const view = renderHook(() => useQuestionDraft({ initial: question, onSave, onArchive }));
  act(() => view.result.current.setPrompt("Acknowledged edit"));
  act(() => view.result.current.submit(event()));
  await waitFor(() => expect(view.result.current.revision).toBe(2));
  act(() => view.result.current.setPrompt("Unsaved edit"));
  act(() => view.result.current.archive());
  await waitFor(() => expect(view.result.current.archived).toBe(true));
  expect(view.result.current.prompt).toBe("Acknowledged edit");
  expect(view.result.current.dirty).toBe(false);
});
