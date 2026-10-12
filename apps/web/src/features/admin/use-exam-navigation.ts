import { useCallback } from "react";
import { useBeforeUnload, useBlocker } from "react-router";

import type { ExamDraft } from "./use-exam-draft";

export function useExamNavigation(draft: ExamDraft) {
  const unsaved = !draft.unavailable && (draft.dirty || draft.unknown || draft.pending);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !draft.allowNavigation.current &&
      unsaved &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!unsaved || draft.allowNavigation.current) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [draft.allowNavigation, unsaved],
    ),
  );
  return blocker;
}
