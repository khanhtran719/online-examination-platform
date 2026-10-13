import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import type { QuestionType } from "@web/shared/api/dto";
import { useProtectedAccess } from "@web/shared/protected-access";

import { useCapability } from "./gate";

export function useQuestionList() {
  const { api } = useRuntime();
  const manage = useCapability("catalog.manage"),
    keys = useCapability("catalog.keys.read"),
    imports = useCapability("catalog.import");
  const client = useQueryClient();
  const [search, setSearch] = useState(""),
    [type, setType] = useState<QuestionType | "">("");
  const [blocked, setBlocked] = useState(false);
  const questions = useInfiniteQuery({
    queryKey: ["bank"],
    enabled: manage === "allowed" && keys === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listBankQuestions({ pageSize: 20, cursor: pageParam }).then((r) => r.data),
    getNextPageParam: (last) => last.next ?? undefined,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const hidden = useProtectedAccess(questions.error, [["bank"]], blocked, () => setBlocked(true));
  const unavailable = hidden || manage !== "allowed" || keys !== "allowed";
  useEffect(() => {
    if (!unavailable) return;
    void client.cancelQueries({ queryKey: ["bank"] });
    client.removeQueries({ queryKey: ["bank"] });
    setSearch("");
    setType("");
  }, [unavailable, client]);
  const rows = unavailable ? [] : (questions.data?.pages.flatMap((p) => p.items) ?? []);
  const term = search.trim().toLocaleLowerCase("vi");
  const filtered = rows.filter(
    (q) =>
      (!type || type === q.type) && `${q.prompt} ${q.id}`.toLocaleLowerCase("vi").includes(term),
  );
  return {
    questions,
    hidden,
    unavailable,
    rows,
    filtered,
    search,
    setSearch,
    type,
    setType,
    canImport: imports === "allowed",
  };
}
