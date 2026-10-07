import { describe, expect, it } from "vitest";
import type { Answer, SaveReceipt } from "../../../shared/api/dto";
import {
  acknowledge,
  capture,
  createAutosaveState,
  editAnswer,
  failConflict,
  failRetryable,
  holdForReauth,
  ingestAnswerPage,
  rearmExhausted,
  resumeAuthenticated,
  resolveKeepMine,
  resolveUseServer,
  saveStatusLabel,
  setTransport,
  viewAnswer,
} from "../autosave";

const Q1 = "00000000-0000-4000-8000-000000000010";
const Q2 = "00000000-0000-4000-8000-000000000011";
const A = "00000000-0000-4000-8000-0000000000a1";
const B = "00000000-0000-4000-8000-0000000000b1";
const A2 = "00000000-0000-4000-8000-0000000000a2";

function loaded(questionId: string, version = 0): Answer {
  return {
    questionId,
    selectedOptionIds: [],
    marked: false,
    version,
    updatedAt: null,
  };
}

function ready() {
  return ingestAnswerPage(createAutosaveState(), [Q1, Q2], [loaded(Q1), loaded(Q2)]);
}

function receipt(version: number, questionId = Q1): SaveReceipt {
  return {
    attemptId: "00000000-0000-4000-8000-000000000004",
    acceptedAt: "2026-10-06T13:10:00.000Z",
    answers: [{ questionId, version }],
  };
}

describe("autosave coordinator", () => {
  it("stays pending until the debounce elapses and is not saved before ACK", () => {
    const edited = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 1_000, 0);
    expect(edited.phase).toBe("pending");
    expect(saveStatusLabel(edited, "20:12:36")).toBe("Có 1 thay đổi chờ lưu");
    expect(capture(edited, 1_499, () => "k").batch).toBeNull();
    const sent = capture(edited, 1_500, () => "018f4a3c-8c2e-7c3a-8f2a-111111111111");
    expect(sent.batch?.key).toBe("018f4a3c-8c2e-7c3a-8f2a-111111111111");
    expect(sent.state.phase).toBe("saving");
    expect(saveStatusLabel(sent.state, "20:12:36")).toBe("Đang lưu…");
  });

  it("does not send when nothing changed, even after the flush interval", () => {
    expect(capture(ready(), 20_000, () => "k").batch).toBeNull();
  });

  it("keeps one immutable batch and a newer edit for the next key", () => {
    const first = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(first, 500, () => "k-a", { force: true });
    const body = sent.batch?.answers;
    const newer = editAnswer(sent.state, { questionId: Q1, selectedOptionIds: [B], marked: false }, 800, 0);
    expect(sent.batch?.answers).toBe(body);
    expect(sent.batch?.answers[0]?.selectedOptionIds).toEqual([A]);
    expect(viewAnswer(newer, Q1).selectedOptionIds).toEqual([B]);
    const acked = acknowledge(newer, receipt(1), "k-a");
    expect(acked.loaded[Q1]?.version).toBe(1);
    expect(acked.loaded[Q1]?.selectedOptionIds).toEqual([A]);
    expect(viewAnswer(acked, Q1).selectedOptionIds).toEqual([B]);
    expect(acked.phase).toBe("pending");
    const next = capture(acked, 1_300, () => "k-b", { force: true });
    expect(next.batch?.key).toBe("k-b");
    expect(next.batch?.answers[0]?.expectedVersion).toBe(1);
    expect(next.batch?.answers[0]?.selectedOptionIds).toEqual([B]);
  });

  it("ignores a duplicate older ACK after a newer version", () => {
    let state = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    let sent = capture(state, 500, () => "k", { force: true });
    state = editAnswer(sent.state, { questionId: Q1, selectedOptionIds: [B], marked: true }, 700, 0);
    state = acknowledge(state, receipt(1), "k");
    sent = capture(state, 1_200, () => "k2", { force: true });
    state = acknowledge(sent.state, receipt(2), "k2");
    state = editAnswer(state, { questionId: Q1, selectedOptionIds: [B], marked: true }, 1_400, 0);
    const stale = acknowledge(state, receipt(1), "k");
    expect(stale.loaded[Q1]?.version).toBe(2);
    expect(viewAnswer(stale, Q1).selectedOptionIds).toEqual([B]);
    expect(stale.drafts[Q1]).toBeDefined();
  });

  it("stops the whole batch on conflict and waits for an explicit choice", () => {
    let state = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    state = editAnswer(state, { questionId: Q2, selectedOptionIds: [A2], marked: true }, 10, 0);
    const sent = capture(state, 600, () => "batch", { force: true });
    expect(sent.batch?.answers).toHaveLength(2);
    state = failConflict(sent.state);
    expect(state.phase).toBe("conflict");
    expect(capture(state, 5_000, () => "new", { force: true }).batch).toBeNull();
    const kept = resolveKeepMine(state, [
      { ...loaded(Q1), version: 4, selectedOptionIds: [B] },
      { ...loaded(Q2), version: 2, selectedOptionIds: [] },
    ]);
    const resent = capture(kept, 5_100, () => "after", { force: true });
    expect(resent.batch?.key).toBe("after");
    expect(resent.batch?.answers.map((item) => item.expectedVersion).sort()).toEqual([2, 4]);
    const used = resolveUseServer(state, [{ ...loaded(Q1), version: 4, selectedOptionIds: [B] }]);
    expect(used.drafts[Q1]).toBeUndefined();
    expect(viewAnswer(used, Q1).selectedOptionIds).toEqual([B]);
  });

  it("retries the same key and body, then stops after the bounded schedule", () => {
    const edited = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(edited, 500, () => "same-key", { force: true });
    let state = failRetryable(sent.state, { nowMs: 1_000, retryAfterSeconds: 3, random: 0, allowRetry: true });
    expect(state.phase).toBe("retrying");
    const retried = capture(state, 1_000 + 3_000, () => "other", { force: true });
    expect(retried.batch?.key).toBe("same-key");
    expect(retried.batch?.answers).toBe(sent.batch?.answers);
    state = retried.state;
    for (let index = 0; index < 6; index += 1) {
      state = failRetryable(state, { nowMs: 10_000 + index, retryAfterSeconds: null, random: 0, allowRetry: true });
    }
    expect(state.inFlight?.exhausted).toBe(true);
    expect(state.phase).toBe("unconfirmed");
    expect(capture(state, 99_000, () => "fresh").batch).toBeNull();
  });

  it("does not save after the deadline and does not assume version 0 for an unloaded question", () => {
    const locked = setTransport(ready(), { canSave: false });
    expect(() =>
      editAnswer(locked, { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0),
    ).not.toThrow();
    expect(locked.drafts[Q1]).toBeUndefined();
    expect(capture(locked, 10_000, () => "late", { force: true }).batch).toBeNull();
    expect(() => editAnswer(createAutosaveState(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0)).toThrow(
      /not loaded/,
    );
  });

  it("caps a batch at 20 distinct questions and includes clear and mark", () => {
    const ids = Array.from({ length: 21 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    );
    let state = ingestAnswerPage(
      createAutosaveState(),
      ids,
      ids.map((questionId) => loaded(questionId, 0)),
    );
    ids.forEach((questionId, index) => {
      state = editAnswer(
        state,
        { questionId, selectedOptionIds: index === 3 ? [] : [A], marked: index === 4 },
        index,
        0,
      );
    });
    const sent = capture(state, 600, () => "cap", { force: true });
    expect(sent.batch?.answers).toHaveLength(20);
    expect(sent.state.drafts[ids[20] ?? ""]).toBeDefined();
  });

  it("holds the same key while signed out and retries it after reauth", () => {
    let state = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(state, 500, () => "same-key", { force: true });
    state = holdForReauth(sent.state);
    expect(state.phase).toBe("unconfirmed");
    expect(capture(state, 9_000, () => "other").batch).toBeNull();
    state = resumeAuthenticated(state, 9_000);
    const retry = capture(state, 9_000, () => "other");
    expect(retry.batch?.key).toBe("same-key");
    expect(retry.batch?.answers[0]?.expectedVersion).toBe(0);
  });

  it("does not treat an answer on another page or in another order as version 0", () => {
    const reversed = ingestAnswerPage(createAutosaveState(), [Q1, Q2], [loaded(Q2, 4)]);
    expect(viewAnswer(reversed, Q1).known).toBe(false);
    expect(viewAnswer(reversed, Q2).version).toBe(4);
    const partialPages = ingestAnswerPage(createAutosaveState(), [Q1], []);
    expect(viewAnswer(partialPages, Q1).known).toBe(false);
  });

  it("infers version 0 only when that question is absent from a complete answer scope", () => {
    const confirmed = ingestAnswerPage(createAutosaveState(), [Q1, Q2], [loaded(Q2, 4)], {
      authoritative: true,
    });
    expect(viewAnswer(confirmed, Q1)).toMatchObject({ known: true, version: 0, selectedOptionIds: [] });
    expect(viewAnswer(confirmed, Q2).version).toBe(4);
  });

  it("does not let jitter shorten a server Retry-After", () => {
    const edited = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(edited, 500, () => "same-key", { force: true });
    const state = failRetryable(sent.state, {
      nowMs: 500,
      retryAfterSeconds: 10,
      random: 0,
      allowRetry: true,
    });
    expect((state.inFlight?.retryAtMs ?? 0) - 500).toBeGreaterThanOrEqual(10_000);
    expect(state.inFlight?.key).toBe("same-key");
  });

  it("keeps one in-flight batch and does not send when the draft is clean", () => {
    const edited = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(edited, 500, () => "only", { force: true });
    expect(capture(sent.state, 20_000, () => "second").batch).toBeNull();
    const clean = acknowledge(sent.state, receipt(1), "only");
    expect(capture(clean, 80_000, () => "idle").batch).toBeNull();
    expect(clean.phase).toBe("saved");
  });

  it("retries an exhausted batch with the same key and body", () => {
    const edited = editAnswer(ready(), { questionId: Q1, selectedOptionIds: [A], marked: false }, 0, 0);
    const sent = capture(edited, 500, () => "held-key", { force: true });
    let state = sent.state;
    for (let index = 0; index < 6; index += 1) {
      state = failRetryable(state, { nowMs: 1_000 + index, retryAfterSeconds: null, random: 0, allowRetry: true });
    }
    expect(state.inFlight?.exhausted).toBe(true);
    const rearmed = rearmExhausted(state, 9_000);
    const again = capture(rearmed, 9_000, () => "fresh-key");
    expect(again.batch?.key).toBe("held-key");
    expect(again.batch?.answers).toEqual(sent.batch?.answers);
  });
});
