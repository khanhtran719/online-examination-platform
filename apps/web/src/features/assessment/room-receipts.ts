import type { Answer } from "@web/shared/api/dto";

import type { AutosaveState } from "./autosave";
import type { ClockSample } from "./clock";

export function clockSample(
  attempt: { serverNow: string; deadline: string; canSave: boolean },
  started: number,
  received: number,
): ClockSample {
  return {
    serverNowMs: Date.parse(attempt.serverNow),
    deadlineMs: Date.parse(attempt.deadline),
    monotonicAtSample: received,
    rttMs: Math.max(0, received - started),
    canSave: attempt.canSave,
  };
}

// Call only after every page in the authoritative answer scope has been read.
// A previously persisted answer cannot disappear or move backwards in version.
export function completeConflictAnswers(save: AutosaveState, rows: Answer[]): Answer[] {
  const present = new Set(rows.map((answer) => answer.questionId));
  return [
    ...rows,
    ...Object.values(save.loaded)
      .filter((answer) => answer.version === 0 && !present.has(answer.questionId))
      .map((answer) => ({
        questionId: answer.questionId,
        selectedOptionIds: [],
        marked: false,
        version: 0,
        updatedAt: null,
      })),
  ];
}
