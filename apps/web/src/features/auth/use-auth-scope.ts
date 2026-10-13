import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import { useSession } from "@web/app/session";

// Scope invalidation fences UI effects; it does not cancel a server mutation already sent.
export function useAuthScope() {
  const session = useSession();
  const location = useLocation();
  const key = `${location.key}:${session.epoch}:${session.status}:${session.profile?.id}:${session.needsReauth}`;
  const scope = useRef({ key, version: 0, mounted: false });
  if (scope.current.key !== key) {
    scope.current.key = key;
    scope.current.version += 1;
  }
  useEffect(() => {
    const active = scope.current;
    active.mounted = true;
    return () => {
      active.mounted = false;
      active.version += 1;
    };
  }, []);
  return {
    session,
    key,
    capture: () => scope.current.version,
    current: (ticket: number) => scope.current.mounted && ticket === scope.current.version,
  };
}
