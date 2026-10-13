import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { ApiSuccess, Page } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";

// Two bounded Candidate cursor reads share the same lifecycle. No mutation,
// transport, ranking calculation or cross-feature repository belongs here.
function useResultPages<T>(
  scope: string[],
  read: (cursor?: string) => Promise<ApiSuccess<Page<T>>>,
  closeNotFound = false,
) {
  const session = useSession(),
    memory = useMemory(),
    client = useQueryClient();
  const key = [scope[0]!, session.profile?.id ?? "anonymous", ...scope.slice(1)],
    name = JSON.stringify(key);
  const [blockedScope, setBlockedScope] = useState<string | null>(null);
  const allowed = session.status === "authenticated" && !session.needsReauth;
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: allowed && blockedScope !== name,
    retry: false,
    refetchOnWindowFocus: false,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      signal.throwIfAborted();
      const response = await read(pageParam);
      signal.throwIfAborted();
      return response.data;
    },
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const denial =
    isApiError(query.error) &&
    (query.error.status === 401 ||
      query.error.status === 403 ||
      (closeNotFound && query.error.status === 404));
  const hidden = !allowed || blockedScope === name || denial;
  useEffect(() => {
    if (denial) setBlockedScope(name);
  }, [denial, name]);
  useEffect(() => {
    if (!hidden) return;
    const queryKey: string[] = JSON.parse(name);
    void client.cancelQueries({ queryKey, exact: true });
    client.removeQueries({ queryKey, exact: true });
    memory.clear();
  }, [hidden, name, client, memory]);
  useEffect(
    () => () => {
      const queryKey: string[] = JSON.parse(name);
      void client.cancelQueries({ queryKey, exact: true });
      client.removeQueries({ queryKey, exact: true });
    },
    [name, client],
  );
  const busy = useRef(new Set<string>());
  async function refresh() {
    if (hidden || query.isFetching || busy.current.has(name)) return;
    busy.current.add(name);
    try {
      // A cursor carries a server watermark. Refresh starts a new chain, rather
      // than refetching every previously loaded page against an old watermark.
      client.setQueryData<typeof query.data>(key, (data) =>
        data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
      );
      await query.refetch({ cancelRefetch: false });
    } finally {
      busy.current.delete(name);
    }
  }
  async function more() {
    if (hidden || query.isFetching || busy.current.has(name) || !query.hasNextPage) return;
    busy.current.add(name);
    try {
      await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      busy.current.delete(name);
    }
  }
  return {
    query,
    hidden,
    items: hidden ? [] : (query.data?.pages.flatMap((page) => page.items) ?? []),
    refresh,
    more,
  };
}

export function useHistory() {
  const { api } = useRuntime();
  return useResultPages(["history"], (cursor) => api.getHistory({ pageSize: 20, cursor }));
}

export function useLeaderboard(examId: string, versionId: string) {
  const { api } = useRuntime();
  return useResultPages(
    ["leaderboard", examId, versionId],
    (cursor) => api.getLeaderboard(examId, versionId, { pageSize: 20, cursor }),
    true,
  );
}
