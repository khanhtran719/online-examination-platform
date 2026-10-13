import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import { ApiError, isApiError } from "@web/shared/api/errors";
import { uuidV7 } from "@web/shared/api/uuid";

export function useExamStart(examId: string, readable: boolean) {
  const { api } = useRuntime(),
    session = useSession(),
    navigate = useNavigate();
  const [phase, setPhase] = useState<"idle" | "pending" | "unknown" | "accepted">("idle"),
    [open, setOpen] = useState(false),
    [error, setError] = useState<unknown>(null),
    [blocked, setBlocked] = useState(false);
  const allowed =
    readable && session.status === "authenticated" && !session.needsReauth && !blocked;
  const scope = `${session.profile?.id ?? "anonymous"}:${examId}`;
  const current = useRef({ allowed, scope });
  current.current = { allowed, scope };
  const intent = useRef<{ key: string; examId: string; scope: string } | null>(null),
    busy = useRef(false),
    epoch = useRef(0);
  useEffect(() => {
    epoch.current += 1;
    intent.current = null;
    busy.current = false;
    setOpen(false);
    setPhase("idle");
    setError(null);
    return () => {
      epoch.current += 1;
    };
  }, [allowed, scope]);
  async function send() {
    if (!current.current.allowed || busy.current || !open || phase === "accepted") return;
    const frozen = intent.current ?? { key: uuidV7(), examId, scope };
    if (frozen.scope !== current.current.scope) return;
    intent.current = frozen;
    busy.current = true;
    setPhase("pending");
    setError(null);
    const ticket = epoch.current;
    const valid = () =>
      ticket === epoch.current && current.current.allowed && current.current.scope === frozen.scope;
    try {
      const response = await api.startAttempt(frozen.examId, frozen.key);
      if (!valid()) return;
      if (response.data.examId !== frozen.examId) {
        throw new ApiError({
          kind: "malformed",
          status: 0,
          errorCode: "Malformed response",
          message: "Start response does not match the requested exam",
        });
      }
      setPhase("accepted");
      intent.current = null;
      navigate(`/attempts/${response.data.id}`);
    } catch (caught) {
      if (!valid()) return;
      const unknown =
        !isApiError(caught) ||
        ["network", "timeout", "malformed", "unavailable"].includes(caught.kind) ||
        caught.status >= 500;
      setError(caught);
      setPhase(unknown ? "unknown" : "idle");
      if (!unknown) intent.current = null;
      if (isApiError(caught) && caught.status === 403) setBlocked(true);
    } finally {
      if (ticket === epoch.current) busy.current = false;
    }
  }
  function close() {
    if (busy.current || phase === "unknown" || phase === "accepted") return;
    setOpen(false);
    setError(null);
  }
  return {
    open: open && allowed,
    show: () => {
      if (allowed && !busy.current) setOpen(true);
    },
    close,
    send,
    phase,
    error,
    allowed,
    pending: phase === "pending",
    canClose: phase === "idle",
  };
}
