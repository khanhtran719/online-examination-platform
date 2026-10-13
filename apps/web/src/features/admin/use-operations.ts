import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import { isUuidV7 } from "@web/shared/api/uuid";
import { monitorDelayMs } from "@web/shared/polling";

import { useCapability } from "./gate";
import { useReportPages } from "./use-report-pages";

export function useMonitorIndex() {
  const { api } = useRuntime();
  const reporting = useCapability("reporting.read"),
    manage = useCapability("catalog.manage");
  return {
    manage,
    ...useReportPages({
      key: ["admin-exams", "monitor"],
      allowed: reporting === "allowed" && manage === "allowed",
      read: (cursor) => api.listAdminExams({ pageSize: 20, cursor }).then((r) => r.data),
    }),
  };
}
export function useMonitorExam(examId: string) {
  const { api } = useRuntime(),
    gate = useCapability("reporting.read");
  const report = useReportPages({
    key: ["monitor", examId],
    allowed: gate === "allowed",
    read: (cursor) =>
      api.listActiveCandidates(examId, { pageSize: 20, cursor }).then((r) => r.data),
  });
  const refresh = useRef(report.refresh);
  refresh.current = report.refresh;
  useEffect(() => {
    if (report.hidden) return;
    let stopped = false,
      inFlight = false,
      timer = 0;
    async function tick() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        await refresh.current();
      } finally {
        inFlight = false;
        if (!stopped && !document.hidden)
          timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
      }
    }
    timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
    function visible() {
      window.clearTimeout(timer);
      if (!document.hidden) void tick();
    }
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [report.hidden, examId]);
  return report;
}
export function useSubmissions(examId: string) {
  const { api } = useRuntime(),
    gate = useCapability("reporting.read");
  const [draft, setDraft] = useState(""),
    [version, setVersion] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const report = useReportPages({
    key: ["submissions", examId, version ?? "*"],
    scope: ["submissions", examId],
    allowed: gate === "allowed",
    read: (cursor) =>
      api
        .listSubmissions(examId, {
          pageSize: 20,
          cursor,
          ...(version ? { publishedVersionId: version } : {}),
        })
        .then((r) => r.data),
  });
  useEffect(() => {
    if (report.hidden) {
      setDraft("");
      setVersion(undefined);
      setError(null);
    }
  }, [report.hidden]);
  function apply() {
    if (report.hidden) return;
    const value = draft.trim();
    if (value && !isUuidV7(value)) {
      setError("Mã phiên bản không đúng định dạng.");
      return;
    }
    setVersion(value || undefined);
    setError(null);
  }
  return { ...report, draft, setDraft, version, error, apply };
}
