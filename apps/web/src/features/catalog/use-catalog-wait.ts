import { useCallback, useEffect, useRef, useState } from "react";

import { isApiError } from "@web/shared/api/errors";

// Mounted Catalog read cooldown. It never schedules a request or grants access.
export function useCatalogWait(scope: string) {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const entry = useRef<{ scope: string; until: number; error: unknown }>({
    scope,
    until: 0,
    error: null,
  });
  const [deadline, setDeadline] = useState(0);
  const [, redraw] = useState(0);
  const blocked = useCallback(
    () => entry.current.scope === currentScope.current && performance.now() < entry.current.until,
    [],
  );
  useEffect(() => {
    if (!blocked()) return;
    const timer = window.setInterval(() => {
      if (!blocked()) window.clearInterval(timer);
      redraw((value) => value + 1);
    }, 250);
    return () => window.clearInterval(timer);
  }, [blocked, deadline, scope]);
  return {
    waiting: blocked(),
    blocked,
    error: () => entry.current.error,
    accept: (error: unknown, requestScope: string) => {
      if (requestScope !== currentScope.current || !isApiError(error)) return;
      if (error.status !== 429 && !(error.status === 503 && error.retryAfterSeconds !== null))
        return;
      const supplied = error.retryAfterSeconds;
      const seconds =
        supplied !== null && Number.isSafeInteger(supplied) && supplied > 0 ? supplied : 60;
      const previous = entry.current.scope === requestScope ? entry.current.until : 0;
      entry.current = {
        scope: requestScope,
        until: Math.max(previous, performance.now() + seconds * 1000),
        error,
      };
      setDeadline(entry.current.until);
    },
  };
}
