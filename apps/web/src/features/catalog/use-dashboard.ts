import { useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { Category, HistoryItem } from "@web/shared/api/dto";

import { dashboardAttemptTitle } from "./dashboard-model";
import { useDashboardSnapshot } from "./use-dashboard-snapshot";

export function useDashboard() {
  const { api } = useRuntime(),
    session = useSession(),
    memory = useMemory();
  const [category, selectCategory] = useState<Category>();
  const historyRead = useDashboardSnapshot("history", "recent", () =>
    api.getHistory({ pageSize: 20 }),
  );
  const catalogRead = useDashboardSnapshot("catalog", category ?? "*", () =>
    api.browseExams({ pageSize: 3, category }),
  );
  const items = historyRead.query.data?.items ?? [];
  const current = items.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const recent = items.filter((item) => item !== current).slice(0, 3);
  const visible =
    session.status === "authenticated" && !!session.profile?.id && !session.needsReauth;
  function setCategory(value?: Category) {
    if (
      !visible ||
      catalogRead.blockedNow() ||
      catalogRead.query.isFetching ||
      catalogRead.remaining > 0
    )
      return;
    selectCategory(value);
  }
  function titleFor(item: HistoryItem) {
    return dashboardAttemptTitle(
      item,
      historyRead.hidden ? null : memory.lookup(item.publishedVersionId),
    );
  }
  return {
    profile: visible ? session.profile : null,
    session,
    visible,
    category,
    setCategory,
    history: historyRead.query,
    catalog: catalogRead.query,
    historyDenied: historyRead.denied,
    catalogDenied: catalogRead.denied,
    historyWait: historyRead.remaining,
    catalogWait: catalogRead.remaining,
    retryHistory: historyRead.refresh,
    retryCatalog: catalogRead.refresh,
    current,
    recent,
    titleFor,
  };
}
