import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Page } from "@web/shared/api/dto";
import { useProtectedAccess } from "@web/shared/protected-access";

// Shared only by Admin's cursor reports. Scope can include multiple version filters.
export function useReportPages<P extends Page<unknown>>({
  key,
  scope = key,
  allowed,
  read,
}: {
  key: readonly string[];
  scope?: readonly string[];
  allowed: boolean;
  read: (cursor?: string) => Promise<P>;
}) {
  const client = useQueryClient(),
    [blocked, setBlocked] = useState(false);
  const serialized = JSON.stringify(scope);
  const scopeKey: string[] = useMemo(() => JSON.parse(serialized), [serialized]);
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: allowed && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      signal.throwIfAborted();
      const page = await read(pageParam);
      signal.throwIfAborted();
      return page;
    },
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const forbidden = useProtectedAccess(query.error, [scopeKey], blocked, () => setBlocked(true));
  const hidden = forbidden || !allowed;
  useEffect(() => {
    if (!hidden) return;
    void client.cancelQueries({ queryKey: scopeKey });
    client.removeQueries({ queryKey: scopeKey });
  }, [hidden, client, scopeKey]);
  const busy = useRef(false);
  async function refresh() {
    if (hidden || busy.current || query.isFetching) return;
    busy.current = true;
    try {
      // Expired/bound cursors must never be reused on a restart.
      client.setQueryData<typeof query.data>(key, (data) =>
        data
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : data,
      );
      await query.refetch({ cancelRefetch: false });
    } finally {
      busy.current = false;
    }
  }
  async function more() {
    if (hidden || busy.current || query.isFetching || !query.hasNextPage) return;
    busy.current = true;
    try {
      await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      busy.current = false;
    }
  }
  const items = (
    hidden ? [] : (query.data?.pages.flatMap((page) => page.items) ?? [])
  ) as P["items"];
  return { query, items, hidden, refresh, more };
}
