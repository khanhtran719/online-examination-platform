import { expect, it } from "vitest";

import { createAutosaveState, ingestAnswerPage } from "../autosave";
import { remainingMs } from "../clock";
import { clockSample, completeConflictAnswers } from "../room-receipts";

it("accounts for the observed round trip without extending the displayed deadline", () => {
  const sample = clockSample(
    { serverNow: "2026-10-13T10:00:00Z", deadline: "2026-10-13T10:01:00Z", canSave: true },
    1_000,
    3_000,
  );
  expect(remainingMs(sample, 3_000)).toBe(59_000);
  expect(remainingMs(sample, 4_000)).toBe(58_000);
});
it("infers a blank conflict answer only from a completed snapshot and a previously known zero version", () => {
  const save = ingestAnswerPage(
    createAutosaveState(),
    ["new", "saved"],
    [{ questionId: "saved", selectedOptionIds: ["a"], marked: false, version: 2, updatedAt: null }],
    { authoritative: true },
  );
  const rows = completeConflictAnswers(save, []);
  expect(rows).toEqual([
    { questionId: "new", selectedOptionIds: [], marked: false, version: 0, updatedAt: null },
  ]);
});
