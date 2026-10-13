import { useEffect, useRef, useState } from "react";

import { useRuntime } from "@web/app/runtime";
import type { ReplayRequest } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";

import { useCapability } from "./gate";

interface Intent {
  key: string;
  body: ReplayRequest;
}
export function useAttemptReplay(
  attemptId: string,
  readable: boolean,
  failed: boolean,
  replayPending: boolean,
  refresh: () => Promise<unknown>,
  deny: () => void,
) {
  const { api, demo } = useRuntime(),
    gate = useCapability("assessment.replay");
  const allowed = readable && gate === "allowed";
  const revision = demo?.replayRevision(attemptId) ?? null;
  const [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [phase, setPhase] = useState<"idle" | "inflight" | "unknown" | "acked">("idle");
  const [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState<string | null>(null);
  const intent = useRef<Intent | null>(null),
    busy = useRef(false),
    epoch = useRef(0);
  const current = useRef(allowed);
  current.current = allowed;
  useEffect(() => {
    epoch.current += 1;
    if (!allowed) {
      intent.current = null;
      busy.current = false;
      setReason("");
      setConfirm(false);
      setPhase("idle");
      setError(null);
      setMessage(null);
    }
    return () => {
      epoch.current += 1;
    };
  }, [allowed, attemptId]);
  const length = Array.from(reason.trim()).length;
  const eligible =
    allowed &&
    failed &&
    !replayPending &&
    revision !== null &&
    Number.isSafeInteger(revision) &&
    revision > 0;
  const canOpen = eligible && length >= 8 && length <= 500 && phase === "idle";
  function open() {
    if (canOpen && !busy.current) setConfirm(true);
  }
  async function send(retry = false) {
    if (
      !current.current ||
      busy.current ||
      (retry ? phase !== "unknown" || !intent.current : !confirm || !canOpen)
    )
      return;
    const frozen = retry
      ? intent.current
      : { key: uuidV7(), body: { expectedRevision: revision!, reason: reason.trim() } };
    if (!frozen) return;
    intent.current = frozen;
    busy.current = true;
    setPhase("inflight");
    setConfirm(false);
    setError(null);
    const ticket = epoch.current;
    try {
      await api.replayFailedAttempt(attemptId, frozen.key, frozen.body);
      if (!current.current || ticket !== epoch.current) return;
      setPhase("acked");
      intent.current = null;
      setMessage("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.");
      await refresh();
    } catch (caught) {
      if (!current.current || ticket !== epoch.current) return;
      if (isApiError(caught) && caught.status === 403) {
        deny();
        return;
      }
      const unknown =
        !isApiError(caught) ||
        ["network", "timeout", "malformed", "unavailable"].includes(caught.kind) ||
        caught.status >= 500;
      setPhase(unknown ? "unknown" : "idle");
      if (!unknown) intent.current = null;
      setError(caught);
      if (isApiError(caught) && caught.status === 409) void refresh();
    } finally {
      if (ticket === epoch.current) busy.current = false;
    }
  }
  return {
    reason,
    setReason,
    confirm: confirm && eligible && phase === "idle",
    close: () => setConfirm(false),
    open,
    send,
    phase,
    error,
    message,
    eligible,
    canOpen,
    allowed,
    editable: phase === "idle",
    frozenReason: intent.current?.body.reason,
  };
}
