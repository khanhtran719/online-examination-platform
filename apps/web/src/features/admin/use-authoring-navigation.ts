import type { RefObject } from "react";
import { useCallback } from "react";
import { useBeforeUnload, useBlocker } from "react-router";

export function useAuthoringNavigation(draft: {
  dirty: boolean;
  pending: boolean;
  unknown: boolean;
  allowNavigation: RefObject<boolean>;
}) {
  const unsaved = draft.dirty || draft.pending || draft.unknown;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !draft.allowNavigation.current &&
      unsaved &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (unsaved && !draft.allowNavigation.current) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [unsaved, draft.allowNavigation],
    ),
  );
  return blocker;
}
