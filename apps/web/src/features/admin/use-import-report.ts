import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { useProtectedAccess } from "@web/shared/protected-access";

import { useCapability } from "./gate";

export function useImportReport(importId: string) {
  const { api } = useRuntime();
  const gate = useCapability("catalog.import");
  const keys = useCapability("catalog.keys.read"),
    manage = useCapability("catalog.manage");
  const canEdit = keys === "allowed" && manage === "allowed";
  const client = useQueryClient();
  const [blocked, setBlocked] = useState(false);
  const report = useQuery({
    queryKey: ["import-report", importId],
    enabled: gate === "allowed" && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () => api.getImportReport(importId).then((r) => r.data),
  });
  const hidden = useProtectedAccess(report.error, [["import-report", importId]], blocked, () =>
    setBlocked(true),
  );
  const unavailable = hidden || gate !== "allowed";
  useEffect(() => {
    if (unavailable) {
      void client.cancelQueries({ queryKey: ["import-report", importId] });
      client.removeQueries({ queryKey: ["import-report", importId] });
    }
  }, [unavailable, client, importId]);
  return { report, hidden, data: unavailable ? null : report.data, canEdit };
}
