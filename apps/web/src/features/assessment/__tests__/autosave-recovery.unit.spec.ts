import { expect, it } from "vitest";

import {
  capture,
  createAutosaveState,
  editAnswer,
  failRetryable,
  holdForReauth,
  ingestAnswerPage,
  resumeAuthenticated,
  resumeOnline,
} from "../autosave";

function waiting() {
  const ready = ingestAnswerPage(createAutosaveState(), ["q"], [], { authoritative: true });
  const edited = editAnswer(
    ready,
    { questionId: "q", selectedOptionIds: ["a"], marked: false },
    0,
    0.5,
  );
  return failRetryable(capture(edited, 500, () => "same").state, {
    nowMs: 500,
    retryAfterSeconds: 60,
    random: 0.5,
    allowRetry: true,
  });
}
it("does not shorten Retry-After on reconnect", () => {
  const recovered = resumeOnline(waiting(), 2_000);
  expect(capture(recovered, 2_000, () => "new").batch).toBeNull();
  expect(capture(recovered, 60_500, () => "new").batch?.key).toBe("same");
});
it("does not shorten Retry-After across same-actor reauthentication", () => {
  const recovered = resumeAuthenticated(holdForReauth(waiting()), 2_000);
  expect(capture(recovered, 2_000, () => "new").batch).toBeNull();
  expect(capture(recovered, 60_500, () => "new").batch?.key).toBe("same");
});
