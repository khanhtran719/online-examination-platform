import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { useProtectedAccess } from "@web/shared/protected-access";

import { useCapability } from "./gate";

export function useBusinessMetrics() {
  const { api } = useRuntime(),
    client = useQueryClient();
  const gate = useCapability("reporting.read"),
    [blocked, setBlocked] = useState(false);
  const query = useQuery({
    queryKey: ["business-metrics"],
    enabled: gate === "allowed" && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    queryFn: async ({ signal }) => {
      const r = await api.getBusinessMetrics();
      signal.throwIfAborted();
      return r.data;
    },
  });
  const forbidden = useProtectedAccess(query.error, [["business-metrics"]], blocked, () =>
    setBlocked(true),
  );
  const hidden = forbidden || gate !== "allowed";
  useEffect(() => {
    if (hidden) {
      void client.cancelQueries({ queryKey: ["business-metrics"] });
      client.removeQueries({ queryKey: ["business-metrics"] });
    }
  }, [hidden, client]);
  return { query, hidden, gate, data: hidden ? undefined : query.data };
}
