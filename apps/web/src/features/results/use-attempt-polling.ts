import { useEffect, useState } from "react";
import { useRuntime } from "../../app/runtime";
import type { Attempt } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { canRestartPoll, nextPollDelayMs, shouldStopPolling } from "../assessment/polling";

export function useAttemptPolling(attemptId: string) {
  const { api } = useRuntime();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [stopped, setStopped] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let stoppedLoop = false;
    let inFlight = false;
    let timer = 0;
    let index = 0;
    const started = performance.now();
    async function tick() {
      if (cancelled || stoppedLoop || inFlight) return;
      if (document.hidden) {
        timer = window.setTimeout(() => void tick(), 1000);
        return;
      }
      inFlight = true;
      try {
        const response = await api.getAttemptStatus(attemptId);
        if (cancelled) return;
        setAttempt(response.data);
        setError(null);
        const elapsed = performance.now() - started;
        if (shouldStopPolling(response.data, elapsed)) {
          stoppedLoop = true;
          setStopped(
            elapsed >= 5 * 60 * 1000 ? "Đã dừng sau 5 phút." : "Đã dừng vì trạng thái kết thúc.",
          );
          return;
        }
        const delay = nextPollDelayMs({
          attemptIndex: index,
          pollAfterSeconds: response.data.pollAfterSeconds,
          retryAfterSeconds: response.meta.retryAfterSeconds,
          random: Math.random(),
        });
        index += 1;
        timer = window.setTimeout(() => void tick(), delay);
      } catch (caught) {
        if (cancelled) return;
        setError(caught);
        if (performance.now() - started >= 5 * 60 * 1000) {
          stoppedLoop = true;
          setStopped("Đã dừng sau 5 phút.");
          return;
        }
        const delay = nextPollDelayMs({
          attemptIndex: index,
          pollAfterSeconds: 0,
          retryAfterSeconds: isApiError(caught) ? caught.retryAfterSeconds : null,
          random: Math.random(),
        });
        index += 1;
        timer = window.setTimeout(() => void tick(), delay);
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
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [api, attemptId]);
  return { attempt, error, stopped };
}
