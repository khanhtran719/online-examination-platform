import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import { CATEGORIES } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { useProtectedAccess } from "@web/shared/protected-access";

export function useBrowse() {
  const { api } = useRuntime(),
    session = useSession(),
    memory = useMemory(),
    client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const requested = params.get("category"),
    category = CATEGORIES.find((value) => value === requested),
    invalid = requested !== null && !category;
  const [pageSize, setPageSize] = useState(20),
    [search, setSearch] = useState(""),
    [blocked, setBlocked] = useState(false);
  const scope = ["catalog", session.profile?.id ?? "anonymous", "browse"],
    key = [...scope, category ?? "*", pageSize];
  const allowed = session.status === "authenticated" && !session.needsReauth;
  const query = useInfiniteQuery({
    queryKey: key,
    enabled: allowed && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      signal.throwIfAborted();
      const r = await api.browseExams({ pageSize, cursor: pageParam, category });
      signal.throwIfAborted();
      return r.data;
    },
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const unauthorized = isApiError(query.error) && query.error.status === 401;
  useEffect(() => {
    if (unauthorized) setBlocked(true);
  }, [unauthorized]);
  const forbidden = useProtectedAccess(query.error, [scope], blocked || unauthorized, () =>
      setBlocked(true),
    ),
    hidden = forbidden || !allowed;
  const scopeName = JSON.stringify(scope);
  useEffect(() => {
    if (!hidden) return;
    const queryKey: string[] = JSON.parse(scopeName);
    void client.cancelQueries({ queryKey });
    client.removeQueries({ queryKey });
    memory.clear();
    setSearch("");
  }, [hidden, client, scopeName, memory]);
  const busy = useRef(false);
  async function refresh() {
    if (hidden || busy.current || query.isFetching) return;
    busy.current = true;
    try {
      client.setQueryData<typeof query.data>(key, (data) =>
        data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
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
  function choose(value?: string) {
    if (hidden) return;
    const next = new URLSearchParams(params);
    if (value) next.set("category", value);
    else next.delete("category");
    setSearch("");
    setParams(next);
  }
  const loaded = hidden ? [] : (query.data?.pages.flatMap((page) => page.items) ?? []);
  const term = search.trim().toLocaleLowerCase("vi");
  const items = term
    ? loaded.filter((exam) => exam.title.toLocaleLowerCase("vi").includes(term))
    : loaded;
  return {
    query,
    hidden,
    invalid,
    category,
    choose,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loaded,
    items,
    refresh,
    more,
  };
}

export function useExamDetail(examId: string) {
  const { api } = useRuntime(),
    session = useSession(),
    memory = useMemory(),
    client = useQueryClient();
  const [blocked, setBlocked] = useState(false);
  const key = ["catalog", session.profile?.id ?? "anonymous", "detail", examId];
  const allowed = session.status === "authenticated" && !session.needsReauth;
  const query = useQuery({
    queryKey: key,
    enabled: allowed && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      const response = await api.getExam(examId);
      signal.throwIfAborted();
      return response.data;
    },
  });
  const unauthorized = isApiError(query.error) && query.error.status === 401;
  useEffect(() => {
    if (unauthorized) setBlocked(true);
  }, [unauthorized]);
  const forbidden = useProtectedAccess(query.error, [key], blocked || unauthorized, () =>
      setBlocked(true),
    ),
    hidden = forbidden || !allowed;
  const keyName = JSON.stringify(key);
  useEffect(() => {
    if (!hidden) return;
    const queryKey: string[] = JSON.parse(keyName);
    void client.cancelQueries({ queryKey });
    client.removeQueries({ queryKey });
    memory.clear();
  }, [hidden, client, keyName, memory]);
  const data = hidden ? undefined : query.data;
  useEffect(() => {
    if (data) memory.remember(data);
  }, [data, memory]);
  return { query, hidden, data };
}
