import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useMemory } from "@web/app/memory";
import { useSession } from "@web/app/session";
import type { ApiSuccess, Page } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";

// Two bounded Dashboard snapshots share this read lifecycle.
export function useDashboardSnapshot<T>(
  resource: "history" | "catalog",
  filter: string,
  read: () => Promise<ApiSuccess<Page<T>>>,
) {
  const session = useSession(),
    client = useQueryClient(),
    memory = useMemory();
  const scope = [resource, "dashboard", session.profile?.id ?? "anonymous", String(session.epoch)],
    key = [...scope, filter];
  const scopeName = JSON.stringify(scope),
    keyName = JSON.stringify(key);
  const allowed =
    session.status === "authenticated" && !!session.profile?.id && !session.needsReauth;
  const [blocked, setBlocked] = useState<{ scope: string; error: unknown } | null>(null);
  const denial = useRef<string | null>(null);
  const deadline = useRef({ scope: scopeName, until: 0 });
  const [wait, setWait] = useState({ scope: scopeName, value: 0 });
  const latest = useRef({ scope: scopeName, key: keyName, hidden: !allowed, mounted: true });
  latest.current.scope = scopeName;
  latest.current.key = keyName;
  const busy = useRef(new Set<string>());
  const query = useQuery({
    queryKey: key,
    enabled: allowed && blocked?.scope !== scopeName,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      try {
        const response = await read();
        signal.throwIfAborted();
        return response.data;
      } catch (error) {
        signal.throwIfAborted();
        if (latest.current.mounted && latest.current.scope === scopeName && isApiError(error)) {
          if (error.status === 401 || error.status === 403) {
            denial.current = scopeName;
            setBlocked({ scope: scopeName, error });
          }
          if (error.status === 429) {
            const seconds = Math.max(1, error.retryAfterSeconds ?? 60);
            deadline.current = { scope: scopeName, until: performance.now() + seconds * 1000 };
            setWait({ scope: scopeName, value: seconds });
          }
        }
        throw error;
      }
    },
  });
  const denied =
    isApiError(query.error) && (query.error.status === 401 || query.error.status === 403);
  const hidden = !allowed || denied || blocked?.scope === scopeName;
  const error = blocked?.scope === scopeName ? blocked.error : query.error;
  latest.current.hidden = hidden;
  const metadataScope = useRef(scopeName);
  useEffect(() => {
    if (metadataScope.current === scopeName) return;
    metadataScope.current = scopeName;
    memory.clear();
  }, [scopeName, memory]);
  useEffect(() => {
    if (!hidden) return;
    const queryKey: string[] = JSON.parse(scopeName);
    void client.cancelQueries({ queryKey });
    client.removeQueries({ queryKey });
    memory.clear();
  }, [hidden, scopeName, client, memory]);
  useEffect(() => {
    const active = latest.current;
    active.mounted = true;
    return () => {
      active.mounted = false;
      const queryKey: string[] = JSON.parse(scopeName);
      void client.cancelQueries({ queryKey });
      client.removeQueries({ queryKey });
    };
  }, [scopeName, client]);
  useEffect(() => {
    if (deadline.current.scope === scopeName) return;
    deadline.current = { scope: scopeName, until: 0 };
    setWait({ scope: scopeName, value: 0 });
  }, [scopeName]);
  useEffect(() => {
    if (!wait.value || wait.scope !== scopeName) return;
    const timer = window.setInterval(
      () =>
        setWait({
          scope: scopeName,
          value: Math.max(0, Math.ceil((deadline.current.until - performance.now()) / 1000)),
        }),
      250,
    );
    return () => window.clearInterval(timer);
  }, [wait.value, wait.scope, scopeName]);
  function blockedNow() {
    return (
      !latest.current.mounted ||
      latest.current.key !== keyName ||
      latest.current.hidden ||
      denial.current === scopeName ||
      (deadline.current.scope === scopeName && performance.now() < deadline.current.until)
    );
  }
  async function refresh() {
    if (blockedNow() || busy.current.has(keyName) || query.isFetching) return;
    busy.current.add(keyName);
    try {
      return await query.refetch({ cancelRefetch: false });
    } finally {
      busy.current.delete(keyName);
    }
  }
  return {
    query: { ...query, data: hidden ? undefined : query.data, error, refetch: refresh },
    hidden,
    denied: denied || blocked?.scope === scopeName,
    refresh,
    blockedNow,
    remaining: wait.scope === scopeName ? wait.value : 0,
  };
}
