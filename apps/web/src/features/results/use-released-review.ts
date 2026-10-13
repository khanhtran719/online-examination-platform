import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { isReleasedReviewHref } from "@web/shared/review-href";

import { isClosedResultRead } from "./result-read-policy";
import { useAttemptResult } from "./use-attempt-result";

export function useReleasedReview(attemptId: string) {
  const gate = useAttemptResult(attemptId),
    { api } = useRuntime(),
    client = useQueryClient();
  const [blockedScope, setBlockedScope] = useState<string | null>(null);
  const [actor]: string[] = JSON.parse(gate.scope);
  const name = JSON.stringify(["review", actor, attemptId]);
  const [checkingScope, setCheckingScope] = useState<string | null>(null);
  const active = useRef<string | null>(name);
  useEffect(() => {
    active.current = name;
    return () => {
      active.current = null;
    };
  }, [name]);
  const allowed =
    !gate.hidden &&
    !gate.query.isFetching &&
    !!gate.score?.review &&
    isReleasedReviewHref(attemptId, gate.score.review.href);
  const query = useInfiniteQuery({
    queryKey: ["review", actor, attemptId],
    enabled: allowed && blockedScope !== name && checkingScope !== name,
    retry: false,
    refetchOnWindowFocus: false,
    // Frozen content does not age. Release is checked separately and every
    // explicit check discards this cursor chain; enabling must not reread it twice.
    staleTime: Infinity,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      signal.throwIfAborted();
      const response = await api.getReleasedReview(attemptId, { pageSize: 20, cursor: pageParam });
      signal.throwIfAborted();
      return response.data;
    },
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const denied = isClosedResultRead(query.error);
  const closed = !allowed || blockedScope === name || denied;
  const hidden = closed || checkingScope === name;
  useEffect(() => {
    if (denied) setBlockedScope(name);
  }, [denied, name]);
  useEffect(() => {
    if (!closed) return;
    const queryKey: string[] = JSON.parse(name);
    void client.cancelQueries({ queryKey, exact: true });
    client.removeQueries({ queryKey, exact: true });
  }, [closed, name, client]);
  const busy = useRef(new Set<string>());
  async function checkRelease() {
    if (
      gate.hidden ||
      closed ||
      query.isFetching ||
      gate.query.isFetching ||
      busy.current.has(name)
    )
      return;
    busy.current.add(name);
    setCheckingScope(name);
    try {
      const queryKey: string[] = JSON.parse(name);
      await client.cancelQueries({ queryKey, exact: true });
      client.removeQueries({ queryKey, exact: true });
      const response = await gate.refresh();
      if (active.current !== name || !response || response.error) return;
      const score = response.data?.result;
      if (
        !response.data?.pending &&
        score?.attemptId === attemptId &&
        score.review &&
        isReleasedReviewHref(attemptId, score.review.href)
      ) {
        // An immediately resolved gate can batch away its isFetching transition.
        // Explicitly start page one; never rely on that render to reset a cursor.
        await query.refetch({ cancelRefetch: false });
      }
    } finally {
      busy.current.delete(name);
      setCheckingScope((current) => (current === name ? null : current));
    }
  }
  async function page(restart: boolean) {
    if (hidden || query.isFetching || busy.current.has(name) || (!restart && !query.hasNextPage))
      return;
    busy.current.add(name);
    try {
      if (restart) {
        client.setQueryData<typeof query.data>(JSON.parse(name), (data) =>
          data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
        );
        await query.refetch({ cancelRefetch: false });
      } else await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      busy.current.delete(name);
    }
  }
  return {
    gate,
    query,
    hidden,
    allowed,
    denied,
    rows: hidden ? [] : (query.data?.pages.flatMap((p) => p.items) ?? []),
    refresh: () => page(true),
    more: () => page(false),
    checkRelease,
  };
}
