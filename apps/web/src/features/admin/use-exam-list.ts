import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { useProtectedAccess } from "@web/shared/protected-access";

import { type ExamListFilters, filterLoadedExams } from "./exam-list-model";
import { useCapability } from "./gate";

export function useExamList() {
  const gate = useCapability("catalog.manage");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const [filters, setFilters] = useState<ExamListFilters>({
    search: "",
    status: "all",
    category: "all",
  });
  const exams = useInfiniteQuery({
    queryKey: ["admin-exams"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listAdminExams({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(exams.error, [["admin-exams"]], blocked, () =>
    setBlocked(true),
  );
  const rows = useMemo(
    () =>
      hidden || gate !== "allowed" ? [] : (exams.data?.pages.flatMap((page) => page.items) ?? []),
    [exams.data, hidden, gate],
  );
  const items = useMemo(() => filterLoadedExams(rows, filters), [rows, filters]);
  function changeFilter<K extends keyof ExamListFilters>(key: K, value: ExamListFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  return { exams, hidden, rows, items, filters, changeFilter };
}
