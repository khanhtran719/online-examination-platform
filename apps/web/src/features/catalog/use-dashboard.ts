import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { Category, HistoryItem } from "@web/shared/api/dto";

export function useDashboard() {
  const { api } = useRuntime();
  const { profile } = useSession();
  const memory = useMemory();
  const [category, setCategory] = useState<Category>();
  const history = useInfiniteQuery({
    queryKey: ["history", "dashboard"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const catalog = useQuery({
    queryKey: ["exams", "dashboard", category ?? "*"],
    queryFn: () => api.browseExams({ pageSize: 3, category }).then((response) => response.data),
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const current = items.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const recent = items.filter((item) => item !== current).slice(0, 3);
  function titleFor(item: HistoryItem) {
    const frozen = memory.lookup(item.publishedVersionId);
    return frozen && frozen.examId === item.examId
      ? frozen.title
      : `Phiên bản …${item.publishedVersionId.slice(-6)}`;
  }
  return { profile, category, setCategory, history, catalog, current, recent, titleFor };
}
