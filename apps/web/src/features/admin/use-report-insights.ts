import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";

import { useCapability } from "./gate";
import { useReportPages } from "./use-report-pages";

export function useQuestionStatistics(examId: string, versionId: string) {
  const { api } = useRuntime(),
    gate = useCapability("reporting.read");
  const report = useReportPages({
    key: ["stats", examId, versionId],
    allowed: gate === "allowed",
    read: (cursor) =>
      api.getQuestionStatistics(examId, versionId, { pageSize: 20, cursor }).then((r) => r.data),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (report.hidden) setSelectedId(null);
  }, [report.hidden]);
  return {
    ...report,
    selected: report.items.find((r) => r.questionId === selectedId) ?? report.items[0],
    setSelectedId,
  };
}
export function useAudit() {
  const { api } = useRuntime(),
    gate = useCapability("audit.read");
  const report = useReportPages({
    key: ["audit"],
    allowed: gate === "allowed",
    read: (cursor) => api.getAudit({ pageSize: 20, cursor }).then((r) => r.data),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [copyNote, setCopyNote] = useState<string | null>(null);
  const currentId = useRef(selectedId);
  currentId.current = report.hidden ? null : selectedId;
  const ticket = useRef(0);
  useEffect(
    () => () => {
      ticket.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (report.hidden) {
      ticket.current += 1;
      setSelectedId(null);
      setCopyNote(null);
    }
  }, [report.hidden]);
  function select(id: string | null) {
    ticket.current += 1;
    currentId.current = id;
    setCopyNote(null);
    setSelectedId(id);
  }
  const selected = report.items.find((r) => r.id === selectedId);
  async function copy() {
    if (!selected || report.hidden) return;
    const id = selected.id,
      generation = ++ticket.current;
    let message = "Đã chép mã đối chiếu.";
    try {
      await navigator.clipboard.writeText(selected.correlationId);
    } catch {
      message = "Không chép tự động được. Hãy chọn mã và chép thủ công.";
    }
    if (ticket.current === generation && currentId.current === id) setCopyNote(message);
  }
  return { ...report, selected, select, copy, copyNote };
}
