import { expect, it } from "vitest";

import {
  acknowledge,
  capture,
  createAutosaveState,
  editAnswer,
  failOffline,
  failRetryable,
  holdForReauth,
  ingestAnswerPage,
  rearmExhausted,
  resumeAuthenticated,
  resumeOnline,
  RETRY_DELAYS_MS,
} from "../autosave";

function sentAnswer() {
  const ready = ingestAnswerPage(createAutosaveState(), ["q"], [], { authoritative: true });
  const edited = editAnswer(
    ready,
    { questionId: "q", selectedOptionIds: ["a"], marked: true },
    0,
    0.5,
  );
  return capture(edited, 500, () => "original-key");
}

function exhaustedAnswer() {
  const sent = sentAnswer();
  let state = sent.state;
  let nowMs = 500;
  for (const delayMs of RETRY_DELAYS_MS) {
    state = failRetryable(state, {
      nowMs,
      retryAfterSeconds: null,
      random: 0.5,
      allowRetry: true,
    });
    nowMs += delayMs;
    const retried = capture(state, nowMs, () => "replacement-key");
    expect(retried.batch?.key).toBe("original-key");
    state = retried.state;
  }
  state = failRetryable(state, {
    nowMs,
    retryAfterSeconds: 60,
    random: 0.5,
    allowRetry: true,
  });
  return { state, sent: sent.batch, failedAtMs: nowMs, earliestRetryMs: nowMs + 60_000 };
}

it("retains the final server minimum when the automatic retry budget is exhausted", () => {
  const exhausted = exhaustedAnswer();
  expect(exhausted.state.phase).toBe("unconfirmed");
  expect(exhausted.state.inFlight?.exhausted).toBe(true);
  expect(exhausted.state.inFlight?.retryAtMs).toBe(exhausted.earliestRetryMs);
  expect(capture(exhausted.state, 1_000_000, () => "automatic-key").batch).toBeNull();
});

it("retains the server minimum when a failure requires explicit recovery immediately", () => {
  const failed = failRetryable(sentAnswer().state, {
    nowMs: 500,
    retryAfterSeconds: 60,
    random: 0.5,
    allowRetry: false,
  });
  expect(failed.inFlight?.exhausted).toBe(true);
  expect(failed.inFlight?.retryAtMs).toBe(60_500);
});

it("does not let an early explicit retry or forced flush shorten the final Retry-After", () => {
  const exhausted = exhaustedAnswer();
  const rearmed = rearmExhausted(exhausted.state, exhausted.failedAtMs + 1_000);
  expect(
    capture(rearmed, exhausted.earliestRetryMs - 1, () => "replacement-key", { force: true }).batch,
  ).toBeNull();
  const retried = capture(rearmed, exhausted.earliestRetryMs, () => "replacement-key");
  expect(retried.batch?.key).toBe("original-key");
  expect(retried.batch?.answers).toEqual(exhausted.sent?.answers);
});

it("does not resume exhausted automatic retries when connectivity returns after the wait", () => {
  const exhausted = exhaustedAnswer();
  const recovered = resumeOnline(failOffline(exhausted.state), 1_000_000);
  expect(capture(recovered, 1_000_000, () => "reconnect-key").batch).toBeNull();
  expect(recovered.phase).toBe("unconfirmed");
  expect(recovered.offline).toBe(false);
});

it("does not rearm an exhausted retry budget through same-actor reauthentication", () => {
  const exhausted = exhaustedAnswer();
  const recovered = resumeAuthenticated(holdForReauth(exhausted.state), 1_000_000);
  expect(capture(recovered, 1_000_000, () => "reauth-key").batch).toBeNull();
  expect(recovered.authenticated).toBe(true);
  expect(recovered.phase).toBe("unconfirmed");
});

it("explicitly retries the original intent after the wait while preserving a newer local edit", () => {
  const exhausted = exhaustedAnswer();
  const edited = editAnswer(
    exhausted.state,
    { questionId: "q", selectedOptionIds: ["b"], marked: false },
    exhausted.failedAtMs + 1_000,
    0.5,
  );
  const rearmed = rearmExhausted(edited, exhausted.earliestRetryMs);
  const retried = capture(rearmed, exhausted.earliestRetryMs, () => "replacement-key");
  expect(retried.batch?.key).toBe("original-key");
  expect(retried.batch?.answers).toEqual(exhausted.sent?.answers);
  expect(retried.state.drafts.q?.selectedOptionIds).toEqual(["b"]);
  const acknowledged = acknowledge(
    retried.state,
    {
      attemptId: "attempt",
      acceptedAt: "2026-10-14T00:00:00.000Z",
      answers: [{ questionId: "q", version: 1 }],
    },
    "original-key",
  );
  const next = capture(acknowledged, exhausted.earliestRetryMs, () => "next-edit-key", {
    force: true,
  });
  expect(next.batch?.key).toBe("next-edit-key");
  expect(next.batch?.answers).toEqual([
    { questionId: "q", selectedOptionIds: ["b"], marked: false, expectedVersion: 1 },
  ]);
});

it("resumes a non-exhausted authentication failure with the original key and body", () => {
  const sent = sentAnswer();
  const held = holdForReauth(sent.state);
  expect(capture(held, 9_000, () => "signed-out-key").batch).toBeNull();
  const recovered = resumeAuthenticated(held, 9_000);
  const retried = capture(recovered, 9_000, () => "replacement-key");
  expect(retried.batch?.key).toBe("original-key");
  expect(retried.batch?.answers).toEqual(sent.batch?.answers);
  expect(recovered.authenticated).toBe(true);
});
