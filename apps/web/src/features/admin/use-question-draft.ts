import { type FormEvent, useEffect, useRef, useState } from "react";

import type { AdminQuestion, QuestionType, QuestionWriteRequest } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";

import {
  draftQuestionIssues,
  fieldsOfQuestion,
  moveQuestionOption,
  questionBody,
  type QuestionFields,
  removeQuestionOption,
} from "./question-draft-model";

export interface QuestionFormProps {
  initial: AdminQuestion | null;
  onSave: (
    key: string,
    body: QuestionWriteRequest,
  ) => Promise<{ resourceId: string; revision: number }>;
  onArchive: ((key: string, expectedRevision: number) => Promise<number>) | null;
  onConflict?: () => void;
  fetching?: boolean;
  readError?: unknown;
  onCreated?: (id: string) => void;
}
type Operation =
  | { key: string; kind: "save"; body: QuestionWriteRequest; fields: QuestionFields }
  | { key: string; kind: "archive"; body: { expectedRevision: number } };
export function useQuestionDraft({
  initial,
  onSave,
  onArchive,
  onConflict,
  onCreated,
  fetching,
  readError,
}: QuestionFormProps) {
  const [fields, setFields] = useState(() => fieldsOfQuestion(initial));
  const [baseline, setBaseline] = useState(fields);
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [nextType, setNextType] = useState<QuestionType | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [conflict, setConflict] = useState(false);
  const operation = useRef<Operation | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const counter = useRef(10);
  const allowNavigation = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const locked = pending || unknown || conflict || archived;
  function edit(update: (current: QuestionFields) => QuestionFields) {
    if (!locked && !busy.current) {
      setFields(update);
      setIssues([]);
      setNotice("");
    }
  }
  async function execute(op: Operation) {
    if (busy.current) return;
    busy.current = true;
    operation.current = op;
    setPending(true);
    setUnknown(false);
    setError(null);
    setNotice("");
    try {
      const receipt = op.kind === "save" ? await onSave(op.key, op.body) : null;
      const next = receipt ? receipt.revision : await onArchive!(op.key, op.body.expectedRevision);
      if (!active.current) return;
      setRevision(next);
      if (op.kind === "save") setBaseline(op.fields);
      else {
        setFields(baseline);
        setArchived(true);
      }
      operation.current = null;
      setNotice(op.kind === "save" ? "Đã lưu câu vào ngân hàng." : "Đã lưu trữ câu hỏi.");
      if (!initial && receipt) {
        allowNavigation.current = true;
        onCreated?.(receipt.resourceId);
      }
    } catch (caught) {
      if (!active.current) return;
      const ambiguous =
        !isApiError(caught) ||
        ["network", "timeout", "malformed"].includes(caught.kind) ||
        caught.status >= 500;
      setUnknown(ambiguous);
      setError(caught);
      if (!ambiguous) operation.current = null;
      if (isApiError(caught) && caught.status === 409 && caught.errorCode === "Version conflict") {
        setConflict(true);
        onConflict?.();
      }
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || busy.current) return;
    const nextIssues = draftQuestionIssues(fields);
    setIssues(nextIssues);
    if (nextIssues.length) return;
    void execute({ kind: "save", key: uuidV7(), body: questionBody(fields, revision), fields });
  }
  function archive() {
    if (!onArchive || locked || busy.current) return;
    void execute({ kind: "archive", key: uuidV7(), body: { expectedRevision: revision } });
  }
  function applyType(next: QuestionType) {
    edit((current) => {
      const options = next === "TRUE_FALSE" ? current.options.slice(0, 2) : current.options;
      const keys = current.correctIds.filter((id) => options.some((o) => o.id === id));
      return {
        ...current,
        type: next,
        options,
        correctIds: next === "MULTIPLE_CHOICE" ? keys : [keys[0] ?? options[0]!.id],
      };
    });
    setNextType(null);
  }
  function changeType(next: QuestionType) {
    if (locked || busy.current || next === fields.type) return;
    if (
      (next !== "MULTIPLE_CHOICE" && fields.correctIds.length > 1) ||
      (next === "TRUE_FALSE" && fields.options.length > 2)
    )
      setNextType(next);
    else applyType(next);
  }
  function adoptLatest() {
    if (
      !initial ||
      initial.revision <= revision ||
      !conflict ||
      busy.current ||
      fetching ||
      readError
    )
      return;
    const fresh = fieldsOfQuestion(initial);
    setFields(fresh);
    setBaseline(fresh);
    setRevision(initial.revision);
    setArchived(initial.archived);
    setConflict(false);
    setError(null);
    setNotice("");
  }
  return {
    fields,
    type: fields.type,
    prompt: fields.prompt,
    points: fields.points,
    options: fields.options.map((o) => o.text),
    explanation: fields.explanation,
    revision,
    archived,
    pending,
    unknown,
    conflict,
    locked,
    error,
    issues,
    notice,
    nextType,
    allowNavigation,
    dirty: JSON.stringify(fields) !== JSON.stringify(baseline),
    setPrompt: (prompt: string) => edit((f) => ({ ...f, prompt })),
    setPoints: (points: string) => edit((f) => ({ ...f, points })),
    setExplanation: (explanation: string) => edit((f) => ({ ...f, explanation })),
    setOption: (id: string, text: string) =>
      edit((f) => ({ ...f, options: f.options.map((o) => (o.id === id ? { ...o, text } : o)) })),
    toggleKey: (id: string) =>
      edit((f) => ({
        ...f,
        correctIds:
          f.type === "MULTIPLE_CHOICE"
            ? f.correctIds.includes(id)
              ? f.correctIds.filter((key) => key !== id)
              : [...f.correctIds, id]
            : [id],
      })),
    addOption: () =>
      edit((f) =>
        f.type !== "TRUE_FALSE" && f.options.length < 10
          ? { ...f, options: [...f.options, { id: `option-${++counter.current}`, text: "" }] }
          : f,
      ),
    removeOption: (id: string) => edit((f) => removeQuestionOption(f, id)),
    moveOption: (id: string, direction: -1 | 1) =>
      edit((f) => moveQuestionOption(f, id, direction)),
    setNextType,
    applyType,
    changeType,
    submit,
    archive,
    adoptLatest,
    retry: async () => {
      if (unknown && operation.current) await execute(operation.current);
    },
  };
}
export type QuestionDraft = ReturnType<typeof useQuestionDraft>;
