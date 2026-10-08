import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AdminQuestion, QuestionType, QuestionWriteRequest } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { questionIssues } from "../../shared/validation";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";
export interface QuestionFormProps {
  initial: AdminQuestion | null;
  onSave: (
    key: string,
    body: QuestionWriteRequest,
  ) => Promise<{ resourceId: string; revision: number }>;
  onArchive: ((key: string, expectedRevision: number) => Promise<number>) | null;
}
export function useQuestionDraft({ initial, onSave, onArchive }: QuestionFormProps) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SINGLE_CHOICE");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState(initial?.options.map((option) => option.text) ?? ["", ""]);
  const [correct, setCorrect] = useState<number[]>(initial?.correctOptionPositions ?? [1]);
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [nextType, setNextType] = useState<QuestionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const saveIntent = useRef<IntentMachine<QuestionWriteRequest>>(idleIntent());
  const archiveIntent = useRef<IntentMachine<{ expectedRevision: number }>>(idleIntent());
  useEffect(() => {
    if (saveIntent.current.phase === "idle" && initial) setRevision(initial.revision);
  }, [initial]);
  const body: QuestionWriteRequest = {
    type,
    prompt,
    options: options.map((text, index) => ({ position: index + 1, text })),
    correctOptionPositions: correct,
    points: Number(points),
    explanation: explanation.trim() ? explanation : null,
    expectedRevision: revision,
  };
  function unknownOutcome(caught: unknown): boolean {
    return isApiError(caught) && (caught.kind === "network" || caught.kind === "timeout");
  }

  function applyType(next: QuestionType) {
    const count = next === "TRUE_FALSE" ? 2 : options.length;
    setType(next);
    if (next === "TRUE_FALSE") setOptions((current) => current.slice(0, 2));
    setCorrect((current) => {
      const valid = current.filter((position) => position <= count);
      return next === "MULTIPLE_CHOICE" ? valid : [valid[0] ?? 1];
    });
  }
  function changeType(next: QuestionType) {
    if (
      (next !== "MULTIPLE_CHOICE" && correct.length > 1) ||
      (next === "TRUE_FALSE" && options.length > 2)
    )
      setNextType(next);
    else applyType(next);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const issues = questionIssues(body);
    if (issues.length > 0) {
      setError(issues.join(" "));
      return;
    }
    const started = startIntent(saveIntent.current, {
      action: initial ? "replace-question" : "create-question",
      body,
      expectedRevision: revision,
      keyFactory: uuidV7,
    });
    if (!started.send) {
      setError(
        started.blocked === "changed"
          ? "Nội dung đã đổi so với lần lưu chưa xác nhận. Hãy thử lại đúng nội dung đã gửi."
          : "Đang lưu lần này.",
      );
      return;
    }
    saveIntent.current = started.machine;
    setPending(true);
    setError(null);
    void onSave(started.send.key, started.send.body)
      .then((receipt) => {
        saveIntent.current = settleIntent(saveIntent.current, "acked");
        setRevision(receipt.revision);
      })
      .catch((caught: unknown) => {
        saveIntent.current = settleIntent(
          saveIntent.current,
          unknownOutcome(caught) ? "unknown" : "rejected",
        );
        setError(isApiError(caught) ? caught.message : "Không lưu được.");
      })
      .finally(() => setPending(false));
  }
  function archive() {
    if (!onArchive) return;
    const started = startIntent(archiveIntent.current, {
      action: "archive-question",
      body: { expectedRevision: revision },
      expectedRevision: revision,
      keyFactory: uuidV7,
    });
    if (!started.send) return;
    archiveIntent.current = started.machine;
    void onArchive(started.send.key, started.send.expectedRevision)
      .then((nextRevision) => {
        archiveIntent.current = settleIntent(archiveIntent.current, "acked");
        setRevision(nextRevision);
      })
      .catch((caught: unknown) => {
        archiveIntent.current = settleIntent(
          archiveIntent.current,
          unknownOutcome(caught) ? "unknown" : "rejected",
        );
        setError(isApiError(caught) ? caught.message : "Không lưu trữ được.");
      });
  }
  return {
    type,
    prompt,
    options,
    correct,
    points,
    explanation,
    nextType,
    error,
    pending,
    revision,
    setPrompt,
    setOptions,
    setCorrect,
    setPoints,
    setExplanation,
    setNextType,
    applyType,
    changeType,
    submit,
    archive,
  };
}
