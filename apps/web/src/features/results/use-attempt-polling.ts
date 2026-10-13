import { useEffect, useState } from "react";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { Attempt } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import { canRestartPoll, nextPollDelayMs } from "@web/shared/polling";

import { POLL_CAP_MS, shouldStopPolling } from "./attempt-polling-policy";
import { isClosedResultRead, mismatchedResultRead } from "./result-read-policy";

interface PollState {
  scope: string;
  attempt: Attempt | null;
  error: unknown;
  stopped: string | null;
  blocked: boolean;
}
export function useAttemptPolling(attemptId: string) {
  const { api } = useRuntime(),
    session = useSession(),
    memory = useMemory();
  const scope = JSON.stringify([session.profile?.id ?? "anonymous", attemptId]);
  const allowed = session.status === "authenticated" && !session.needsReauth;
  const [state, setState] = useState<PollState>({
    scope,
    attempt: null,
    error: null,
    stopped: null,
    blocked: false,
  });
  useEffect(() => {
    const empty = { scope, attempt: null, error: null, stopped: null, blocked: false };
    setState(empty);
    if (!allowed) {
      memory.clear();
      return;
    }
    let cancelled = false,
      stoppedLoop = false,
      inFlight = false,
      timer = 0,
      index = 0,
      nextAt = 0;
    const started = performance.now();
    const capTimer = window.setTimeout(() => stop("Đã dừng sau 5 phút."), POLL_CAP_MS);
    function stop(reason: string) {
      stoppedLoop = true;
      window.clearTimeout(timer);
      window.clearTimeout(capTimer);
      if (!cancelled) setState((current) => ({ ...current, stopped: reason }));
    }
    function schedule(delay: number) {
      nextAt = performance.now() + delay;
      timer = window.setTimeout(() => void tick(), Math.min(delay, POLL_CAP_MS));
    }
    async function tick() {
      if (cancelled || stoppedLoop || inFlight) return;
      if (performance.now() - started >= POLL_CAP_MS) {
        stop("Đã dừng sau 5 phút.");
        return;
      }
      if (document.hidden || performance.now() < nextAt) {
        timer = window.setTimeout(
          () => void tick(),
          document.hidden ? 1000 : nextAt - performance.now(),
        );
        return;
      }
      inFlight = true;
      try {
        const response = await api.getAttemptStatus(attemptId);
        if (cancelled || stoppedLoop) return;
        if (response.data.id !== attemptId) throw mismatchedResultRead();
        setState({ ...empty, attempt: response.data });
        if (shouldStopPolling(response.data, performance.now() - started)) {
          stop("Đã dừng vì trạng thái kết thúc.");
          return;
        }
        schedule(
          nextPollDelayMs({
            attemptIndex: index++,
            pollAfterSeconds: response.data.pollAfterSeconds,
            retryAfterSeconds: response.meta.retryAfterSeconds,
            random: Math.random(),
          }),
        );
      } catch (error) {
        if (cancelled || stoppedLoop) return;
        if (isClosedResultRead(error)) {
          stop("Không thể tiếp tục xem lượt thi này.");
          setState({
            ...empty,
            error,
            blocked: true,
            stopped: "Không thể tiếp tục xem lượt thi này.",
          });
          memory.clear();
          return;
        }
        setState((current) => ({ ...current, error }));
        schedule(
          nextPollDelayMs({
            attemptIndex: index++,
            pollAfterSeconds: 0,
            retryAfterSeconds: isApiError(error) ? error.retryAfterSeconds : null,
            random: Math.random(),
          }),
        );
      } finally {
        inFlight = false;
      }
    }
    void tick();
    function onVisible() {
      if (!canRestartPoll({ hidden: document.hidden, cancelled, stopped: stoppedLoop, inFlight }))
        return;
      window.clearTimeout(timer);
      void tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(capTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, attemptId, allowed, scope, memory]);
  return allowed && state.scope === scope
    ? state
    : { scope, attempt: null, error: null, stopped: null, blocked: true };
}
