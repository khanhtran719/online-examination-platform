import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import type { ImportReport, ImportRequest } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";
import { IMPORT_TEMPLATE, inspectImportText } from "@web/shared/validation";

import { useCapability } from "./gate";

type Operation = { kind: "dry" | "commit"; key: string; body: ImportRequest; text: string };
export function useQuestionImport(onCommitted: (id: string) => void) {
  const { api } = useRuntime();
  const gate = useCapability("catalog.import");
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState(IMPORT_TEMPLATE);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [pending, setPending] = useState(false),
    [unknown, setUnknown] = useState(false),
    [reading, setReading] = useState(false);
  const [error, setError] = useState<unknown>(null),
    [fileError, setFileError] = useState("");
  const operation = useRef<Operation | null>(null),
    busy = useRef(false),
    readBusy = useRef(false),
    ticket = useRef(0);
  const active = useRef(true),
    allowNavigation = useRef(false);
  const unavailable = blocked || gate !== "allowed";
  const unavailableRef = useRef(unavailable);
  unavailableRef.current = unavailable;
  const inspected = inspectImportText(text);
  const locked = unavailable || pending || unknown;
  const canCommit =
    !locked && !reading && text === snapshot && Boolean(report?.valid && !report.committed);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      ticket.current += 1;
    };
  }, []);
  useEffect(() => {
    if (!unavailable) return;
    ticket.current += 1;
    readBusy.current = false;
    operation.current = null;
    busy.current = false;
    setPending(false);
    setText("");
    setReport(null);
    setSnapshot(null);
    setUnknown(false);
    setReading(false);
    setFileError("");
  }, [unavailable]);
  function edit(next: string) {
    if (locked || busy.current) return;
    ticket.current += 1;
    readBusy.current = false;
    setReading(false);
    setText(next);
    setReport(null);
    setSnapshot(null);
    setError(null);
    setFileError("");
  }
  async function readFile(file: File) {
    if (locked || busy.current) return;
    const own = ++ticket.current;
    setReport(null);
    setSnapshot(null);
    setError(null);
    setFileError("");
    if (file.size > 1_048_576) {
      setFileError("Tệp vượt quá 1 MiB.");
      setReading(false);
      readBusy.current = false;
      return;
    }
    readBusy.current = true;
    setReading(true);
    try {
      const value = await file.text();
      if (own === ticket.current && active.current && !unavailableRef.current) setText(value);
    } catch {
      if (own === ticket.current && active.current && !unavailableRef.current)
        setFileError("Không đọc được tệp JSON.");
    } finally {
      if (own === ticket.current && active.current) {
        readBusy.current = false;
        setReading(false);
      }
    }
  }
  async function execute(op: Operation) {
    if (busy.current || unavailableRef.current) return;
    const own = ticket.current;
    busy.current = true;
    operation.current = op;
    setPending(true);
    setUnknown(false);
    setError(null);
    try {
      const response = await api.importQuestions(op.key, op.body);
      if (!active.current || unavailableRef.current || own !== ticket.current) return;
      setReport(response.data);
      setSnapshot(op.text);
      operation.current = null;
      if (op.kind === "commit" && response.data.committed) {
        allowNavigation.current = true;
        onCommitted(response.data.id);
      }
    } catch (caught) {
      if (!active.current || unavailableRef.current || own !== ticket.current) return;
      const ambiguous =
        !isApiError(caught) ||
        ["network", "timeout", "malformed"].includes(caught.kind) ||
        caught.status >= 500;
      setUnknown(ambiguous);
      setError(caught);
      if (!ambiguous) operation.current = null;
      if (isApiError(caught) && caught.status === 403) {
        unavailableRef.current = true;
        setBlocked(true);
      }
    } finally {
      if (own === ticket.current) {
        busy.current = false;
        if (active.current) setPending(false);
      }
    }
  }
  async function dryRun() {
    if (
      locked ||
      busy.current ||
      readBusy.current ||
      !inspected.request ||
      inspected.structural ||
      inspected.issues.length
    )
      return;
    await execute({
      kind: "dry",
      key: uuidV7(),
      body: { ...inspected.request, dryRun: true },
      text,
    });
  }
  async function commit() {
    if (!canCommit || busy.current || readBusy.current || !inspected.request) return;
    await execute({
      kind: "commit",
      key: uuidV7(),
      body: { ...inspected.request, dryRun: false },
      text,
    });
  }
  return {
    text,
    report: unavailable ? null : report,
    snapshot,
    error,
    fileError,
    pending,
    unknown,
    reading,
    locked,
    unavailable,
    inspected,
    canCommit,
    allowNavigation,
    edit,
    readFile,
    dryRun,
    commit,
    retry: async () => {
      if (unknown && operation.current) await execute(operation.current);
    },
  };
}
