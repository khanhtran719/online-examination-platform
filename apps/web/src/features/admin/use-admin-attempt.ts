import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { useProtectedAccess } from "@web/shared/protected-access";

import { useCapability } from "./gate";
import { useAttemptReplay } from "./use-attempt-replay";
import { useReportPages } from "./use-report-pages";

export function useAdminAttempt(attemptId: string) {
  const { api } = useRuntime(),
    client = useQueryClient();
  const reporting = useCapability("reporting.read"),
    reviewGate = useCapability("assessment.review.admin");
  const [blocked, setBlocked] = useState(false);
  const result = useQuery({
    queryKey: ["admin-result", attemptId],
    enabled: reporting === "allowed" && !blocked,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const r = await api.getAdminResult(attemptId);
      signal.throwIfAborted();
      return r.data;
    },
  });
  const forbidden = useProtectedAccess(result.error, [["admin-result", attemptId]], blocked, () =>
    setBlocked(true),
  );
  const hidden = forbidden || reporting !== "allowed";
  useEffect(() => {
    if (hidden)
      for (const prefix of ["admin-result", "admin-review"]) {
        void client.cancelQueries({ queryKey: [prefix, attemptId] });
        client.removeQueries({ queryKey: [prefix, attemptId] });
      }
  }, [hidden, client, attemptId]);
  const data = hidden ? undefined : result.data;
  const review = useReportPages({
    key: ["admin-review", attemptId],
    allowed: !hidden && reviewGate === "allowed" && Boolean(data?.result && !data.pending),
    read: (cursor) => api.getAdminReview(attemptId, { pageSize: 20, cursor }).then((r) => r.data),
  });
  const replay = useAttemptReplay(
    attemptId,
    !hidden && Boolean(data),
    data?.attempt?.status === "FAILED",
    data?.attempt?.replayPending ?? false,
    () => result.refetch(),
    () => setBlocked(true),
  );
  return { result, hidden, data, review, reviewGate, replay };
}
