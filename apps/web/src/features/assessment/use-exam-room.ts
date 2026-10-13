import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useMemory } from "@web/app/memory";
import { useRuntime } from "@web/app/runtime";
import { useSession } from "@web/app/session";
import type { Answer, Attempt } from "@web/shared/api/dto";
import { isApiError } from "@web/shared/api/errors";
import type { PlatformApi } from "@web/shared/api/platform";
import { uuidV7 } from "@web/shared/api/uuid";
import { normalizeEmail } from "@web/shared/format";

import {
  acknowledge,
  type AutosaveState,
  capture,
  createAutosaveState,
  dirtyCount,
  editAnswer,
  failConflict,
  failOffline,
  failRetryable,
  holdForReauth,
  type InFlightBatch,
  ingestAnswerPage,
  rearmExhausted,
  resolveKeepMine,
  resolveUseServer,
  resumeAuthenticated,
  resumeOnline,
  setTransport,
} from "./autosave";
import { clockMilestone, type ClockSample, remainingMs } from "./clock";
import { completeConflictAnswers } from "./room-receipts";
import { advanceSubmitClock } from "./room-tick";
import {
  beginManualSubmit,
  cancelBlockedSubmit,
  createSubmitState,
  markSubmitAccepted,
  markSubmitUnknown,
  retryBlockedSubmit,
  type SubmitState,
} from "./submit-flow";
import { useRoomReads, wrongRoomResponse } from "./use-room-reads";

async function readAnswers(api: PlatformApi, attemptId: string): Promise<Answer[]> {
  const rows: Answer[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 30; page += 1) {
    const response = await api.getAnswers(attemptId, { pageSize: 100, cursor });
    rows.push(...response.data.items);
    if (!response.data.next) return rows;
    cursor = response.data.next;
  }
  throw wrongRoomResponse();
}

export function useExamRoom(attemptId: string) {
  const { api } = useRuntime();
  const session = useSession();
  const setUnconfirmed = session.setUnconfirmed;
  const memory = useMemory();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const actor = session.profile?.id ?? "";
  const scope = useMemo(() => ({ actor, attemptId }), [actor, attemptId]);
  const active = useRef({
    scope,
    mounted: true,
    status: session.status,
    needsReauth: session.needsReauth,
  });
  active.current.scope = scope;
  active.current.status = session.status;
  active.current.needsReauth = session.needsReauth;
  const isCurrent = useCallback(
    () => active.current.mounted && active.current.scope === scope,
    [scope],
  );
  const saveRef = useRef<AutosaveState>(createAutosaveState());
  const [save, setSave] = useState(saveRef.current);
  const submitRef = useRef<SubmitState>(createSubmitState());
  const [submit, setSubmit] = useState(submitRef.current);
  const sampleRef = useRef<ClockSample | null>(null);
  const previousRemaining = useRef(Number.POSITIVE_INFINITY);
  const activeSend = useRef<string | null>(null);
  const transportStarted = useRef<number | null>(null);
  const posting = useRef(false);
  const reconciling = useRef(false);
  const reconcileStarted = useRef<number | null>(null);
  const submitPosts = useRef(0);
  const [submitStopped, setSubmitStopped] = useState(false);
  const stoppedRef = useRef(false);
  const deniedRef = useRef(false);
  const [accessError, setAccessError] = useState<unknown>(null);
  const [recovering, setRecovering] = useState(false);
  const reconcileAt = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflictAnswers, setConflictAnswers] = useState<Answer[]>([]);
  const [conflictError, setConflictError] = useState<unknown>(null);

  const commit = useCallback(
    (next: AutosaveState) => {
      if (!isCurrent() || deniedRef.current) return;
      saveRef.current = next;
      setSave(next);
    },
    [isCurrent],
  );
  const setSubmitBoth = useCallback(
    (next: SubmitState) => {
      if (!isCurrent() || deniedRef.current) return;
      submitRef.current = next;
      setSubmit(next);
    },
    [isCurrent],
  );
  const canAct = useCallback(
    () =>
      isCurrent() &&
      !deniedRef.current &&
      active.current.status === "authenticated" &&
      !active.current.needsReauth &&
      saveRef.current.authenticated,
    [isCurrent],
  );
  const canWork = useCallback(() => canAct() && !saveRef.current.offline, [canAct]);
  const handleError = useCallback(
    (error: unknown) => {
      if (!isCurrent() || !isApiError(error)) return;
      if (error.status === 401) {
        commit(holdForReauth(saveRef.current));
        return;
      }
      if (error.status !== 403 && error.status !== 404 && error.kind !== "malformed") return;
      deniedRef.current = true;
      sampleRef.current = null;
      saveRef.current = setTransport(createAutosaveState(), {
        canSave: false,
        authenticated: false,
        editingFrozen: true,
      });
      setSave(saveRef.current);
      setConflictAnswers([]);
      submitRef.current = createSubmitState();
      setSubmit(submitRef.current);
      setNotice(null);
      setRemaining(null);
      setAccessError(error);
      memory.clear();
      for (const kind of ["attempt", "attempt-questions", "attempt-answers"]) {
        const queryKey = [kind, actor, attemptId];
        void queryClient.cancelQueries({ queryKey });
        queryClient.removeQueries({ queryKey });
      }
    },
    [actor, attemptId, commit, isCurrent, memory, queryClient],
  );
  const allowed =
    session.status === "authenticated" &&
    !!actor &&
    !session.needsReauth &&
    save.authenticated &&
    !accessError;
  const onAttempt = useCallback(
    (attempt: Attempt, sample: ClockSample) => {
      if (!isCurrent() || deniedRef.current) return;
      sampleRef.current = sample;
      commit(
        setTransport(saveRef.current, {
          canSave: attempt.canSave && remainingMs(sample, performance.now()) > 0,
        }),
      );
    },
    [commit, isCurrent],
  );
  const readCurrent = useCallback(
    () =>
      isCurrent() &&
      !deniedRef.current &&
      active.current.status === "authenticated" &&
      !active.current.needsReauth,
    [isCurrent],
  );
  const { attemptQuery, questions, answers } = useRoomReads({
    api,
    actor,
    attemptId,
    enabled: allowed,
    isCurrent: readCurrent,
    onError: handleError,
    onAttempt,
  });

  useEffect(() => {
    const current = active.current;
    active.current.mounted = true;
    deniedRef.current = false;
    setAccessError(null);
    saveRef.current = createAutosaveState();
    setSave(saveRef.current);
    submitRef.current = createSubmitState();
    setSubmit(submitRef.current);
    sampleRef.current = null;
    previousRemaining.current = Number.POSITIVE_INFINITY;
    activeSend.current = null;
    transportStarted.current = null;
    posting.current = false;
    reconciling.current = false;
    reconcileStarted.current = null;
    reconcileAt.current = 0;
    submitPosts.current = 0;
    stoppedRef.current = false;
    setSubmitStopped(false);
    setRemaining(null);
    setMilestone(null);
    setNotice(null);
    setConflictAnswers([]);
    setConflictError(null);
    return () => {
      if (current.scope === scope) current.mounted = false;
    };
  }, [scope]);

  useEffect(() => {
    const questionIds = (questions.data?.pages ?? []).flatMap((page) =>
      page.items.map((item) => item.id),
    );
    const observed = (answers.data?.pages ?? []).flatMap((page) => page.items);
    if (questionIds.length === 0 && observed.length === 0) return;
    const authoritative = questions.isSuccess && answers.isSuccess && !answers.hasNextPage;
    const next = ingestAnswerPage(saveRef.current, questionIds, observed, { authoritative });
    if (next !== saveRef.current) commit(next);
  }, [
    answers.data,
    answers.hasNextPage,
    answers.isSuccess,
    commit,
    questions.data,
    questions.hasNextPage,
    questions.isSuccess,
  ]);

  const transmit = useCallback(
    async (batch: InFlightBatch) => {
      if (!canWork() || activeSend.current !== null) return;
      activeSend.current = batch.key;
      transportStarted.current = performance.now();
      try {
        const response = await api.saveAnswers(attemptId, batch.key, {
          answers: batch.answers.map((answer) => ({
            questionId: answer.questionId,
            selectedOptionIds: [...answer.selectedOptionIds],
            marked: answer.marked,
            expectedVersion: answer.expectedVersion,
          })),
        });
        if (!isCurrent() || deniedRef.current) return;
        if (
          response.data.attemptId !== attemptId ||
          response.data.answers.length !== batch.answers.length ||
          !batch.answers.every((sent) =>
            response.data.answers.some(
              (saved) =>
                saved.questionId === sent.questionId && saved.version === sent.expectedVersion + 1,
            ),
          )
        )
          throw wrongRoomResponse();
        commit(acknowledge(saveRef.current, response.data, batch.key));
        setNotice(null);
      } catch (caught) {
        if (!isCurrent() || deniedRef.current) return;
        handleError(caught);
        if (deniedRef.current) return;
        const now = performance.now();
        if (isApiError(caught) && caught.status === 409) {
          commit(failConflict(saveRef.current));
          setConflictAnswers([]);
          try {
            const fresh = await readAnswers(api, attemptId);
            if (!isCurrent() || deniedRef.current) return;
            setConflictAnswers(completeConflictAnswers(saveRef.current, fresh));
            setConflictError(null);
          } catch (error) {
            if (!isCurrent() || deniedRef.current) return;
            handleError(error);
            setConflictError(error);
          }
        } else if (isApiError(caught) && caught.status === 401) {
          commit(holdForReauth(saveRef.current));
          setNotice("Phiên đã hết. Đăng nhập lại trên trang này để gửi tiếp cùng một lần lưu.");
        } else if (isApiError(caught) && caught.status === 422) {
          const exhausted = failRetryable(saveRef.current, {
            nowMs: now,
            retryAfterSeconds: null,
            random: 0,
            allowRetry: false,
          });
          commit(setTransport(exhausted, { canSave: false, editingFrozen: true }));
        } else if (isApiError(caught) && caught.kind === "timeout") {
          commit(
            failRetryable(saveRef.current, {
              nowMs: now,
              retryAfterSeconds: null,
              random: Math.random(),
              allowRetry: true,
            }),
          );
          setNotice(
            "Hết thời gian chờ. Chưa rõ đáp án đã được ghi nhận chưa. Cùng một lần lưu sẽ được gửi lại.",
          );
        } else if (isApiError(caught) && caught.kind === "network" && !navigator.onLine) {
          commit(failOffline(saveRef.current));
        } else if (
          isApiError(caught) &&
          (caught.kind === "network" || caught.status === 429 || caught.status === 503)
        ) {
          const retryAfter = caught.retryAfterSeconds;
          commit(
            failRetryable(saveRef.current, {
              nowMs: now,
              retryAfterSeconds: retryAfter,
              random: Math.random(),
              allowRetry: true,
            }),
          );
          if (caught.status === 429 || caught.status === 503) {
            setNotice(
              `Máy chủ yêu cầu chờ ${retryAfter ?? "một lúc"} giây. Cùng một lần lưu sẽ được gửi lại.`,
            );
          }
        } else {
          commit(
            failRetryable(saveRef.current, {
              nowMs: now,
              retryAfterSeconds: null,
              random: 0,
              allowRetry: false,
            }),
          );
        }
      } finally {
        if (isCurrent() && activeSend.current === batch.key) {
          activeSend.current = null;
          transportStarted.current = null;
        }
      }
    },
    [api, attemptId, canWork, commit, handleError, isCurrent],
  );

  useEffect(() => {
    let alive = true;
    function current() {
      return alive && isCurrent() && !deniedRef.current;
    }
    function stopChecking() {
      stoppedRef.current = true;
      setSubmitStopped(true);
    }
    async function postSubmit() {
      const key = submitRef.current.key;
      if (
        !key ||
        !canWork() ||
        posting.current ||
        stoppedRef.current ||
        submitRef.current.phase !== "posting"
      )
        return;
      if (submitPosts.current >= 6) {
        stopChecking();
        return;
      }
      posting.current = true;
      submitPosts.current += 1;
      reconcileStarted.current ??= performance.now();
      try {
        const response = await api.submitAttempt(attemptId, key);
        if (!current() || stoppedRef.current || !canAct()) return;
        if (response.data.attemptId !== attemptId) throw wrongRoomResponse();
        const accepted = markSubmitAccepted(submitRef.current, response.data);
        setSubmitBoth(accepted);
        navigate(`/attempts/${attemptId}/status`, {
          replace: true,
          state: { unconfirmed: accepted.unconfirmedCount },
        });
      } catch (caught) {
        if (!current() || stoppedRef.current) return;
        handleError(caught);
        if (deniedRef.current) return;
        setSubmitBoth(markSubmitUnknown(submitRef.current));
        const delay = Math.max(
          2_000 * 2 ** Math.min(submitPosts.current - 1, 3),
          (isApiError(caught) ? (caught.retryAfterSeconds ?? 0) : 0) * 1_000,
        );
        reconcileAt.current = performance.now() + delay;
        setNotice("Chưa rõ bài đã được nộp chưa. Đang kiểm tra trạng thái trước khi thử nộp lại.");
      } finally {
        if (current()) posting.current = false;
      }
    }
    async function reconcile() {
      const key = submitRef.current.key;
      if (!key || !canWork() || reconciling.current || stoppedRef.current) return;
      reconciling.current = true;
      try {
        const status = await api.getAttemptStatus(attemptId);
        if (!current() || stoppedRef.current || !canAct()) return;
        if (status.data.id !== attemptId) throw wrongRoomResponse();
        if (status.data.status !== "IN_PROGRESS" && status.data.status !== "CREATED") {
          navigate(`/attempts/${attemptId}/status`, {
            replace: true,
            state: { unconfirmed: submitRef.current.unconfirmedCount },
          });
          return;
        }
        setSubmitBoth({ ...submitRef.current, phase: "posting" });
        if (!canWork()) return;
        if (submitPosts.current >= 6) {
          stopChecking();
          return;
        }
        reconcileAt.current =
          performance.now() + Math.max(2_000, (status.data.pollAfterSeconds ?? 0) * 1000);
        await postSubmit();
      } catch (caught) {
        if (!current() || stoppedRef.current) return;
        handleError(caught);
        reconcileAt.current =
          performance.now() +
          Math.max(10_000, (isApiError(caught) ? (caught.retryAfterSeconds ?? 0) : 0) * 1_000);
        setNotice("Chưa kiểm tra được trạng thái nộp. Bài chưa được xác nhận đã nộp.");
      } finally {
        if (current()) reconciling.current = false;
      }
    }
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!current()) return;
      if (
        reconcileStarted.current !== null &&
        now - reconcileStarted.current >= 300_000 &&
        submitRef.current.phase !== "accepted"
      )
        stopChecking();
      const sample = sampleRef.current;
      if (sample) {
        const left = remainingMs(sample, now);
        setRemaining((previous) =>
          previous !== null && Math.ceil(previous / 1000) === Math.ceil(left / 1000)
            ? previous
            : left,
        );
        const mark = clockMilestone(previousRemaining.current, left);
        previousRemaining.current = left;
        if (mark === "five") setMilestone("Còn 5 phút");
        if (mark === "one") setMilestone("Còn 1 phút");
        if (mark === "zero") setMilestone("Hết giờ");
      }
      const advanced = advanceSubmitClock({
        nowMs: now,
        remainingMs: sample ? remainingMs(sample, now) : null,
        save: saveRef.current,
        submit: submitRef.current,
        transportStartedAtMs: transportStarted.current,
        keyFactory: uuidV7,
      });
      if (advanced.save !== saveRef.current) commit(advanced.save);
      if (advanced.submit !== submitRef.current) setSubmitBoth(advanced.submit);
      if (advanced.transmit) void transmit(advanced.transmit);
      if (submitRef.current.phase === "posting") void postSubmit();
      if (
        !document.hidden &&
        submitRef.current.phase === "verifying" &&
        now >= reconcileAt.current
      ) {
        void reconcile();
      }
    }, 250);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    api,
    attemptId,
    canAct,
    canWork,
    commit,
    handleError,
    isCurrent,
    navigate,
    setSubmitBoth,
    transmit,
  ]);

  useEffect(() => {
    if (!session.needsReauth && session.status === "authenticated") return;
    commit(holdForReauth(saveRef.current));
  }, [commit, session.needsReauth, session.status]);

  useEffect(() => {
    const dirty =
      dirtyCount(save) > 0 ||
      save.inFlight !== null ||
      save.phase === "conflict" ||
      (submit.phase !== "idle" && submit.phase !== "accepted");
    setUnconfirmed(dirty);
    return () => setUnconfirmed(false);
  }, [save, setUnconfirmed, submit.phase]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (
        dirtyCount(saveRef.current) === 0 &&
        !saveRef.current.inFlight &&
        (submitRef.current.phase === "idle" || submitRef.current.phase === "accepted")
      )
        return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const refetchAttempt = attemptQuery.refetch;
  useEffect(() => {
    function resync() {
      if (canWork()) void refetchAttempt({ cancelRefetch: false });
    }
    function onVisible() {
      if (document.visibilityState === "visible") void resync();
    }
    function onOnline() {
      commit(resumeOnline(saveRef.current, performance.now()));
      void resync();
    }
    function onOffline() {
      commit(failOffline(saveRef.current));
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [canWork, commit, refetchAttempt]);

  const hidden = !allowed;
  const conflictReady =
    save.conflictQuestionIds.length > 0 &&
    !conflictError &&
    save.conflictQuestionIds.every((id) =>
      conflictAnswers.some(
        (answer) => answer.questionId === id && answer.version >= (save.loaded[id]?.version ?? 0),
      ),
    );
  const attempt = attemptQuery.data;
  const candidateMeta = attempt ? memory.lookup?.(attempt.publishedVersionId) : null;
  const frozen =
    candidateMeta &&
    attempt &&
    candidateMeta.examId === attempt.examId &&
    candidateMeta.publishedVersionId === attempt.publishedVersionId
      ? candidateMeta
      : null;

  return {
    attemptQuery: {
      ...attemptQuery,
      data: accessError || session.status !== "authenticated" ? undefined : attemptQuery.data,
      error: accessError ?? attemptQuery.error,
    },
    questions: { ...questions, data: hidden ? undefined : questions.data },
    answers: { ...answers, data: hidden ? undefined : answers.data },
    accessError,
    submitStopped,
    conflictReady,
    scope: `${actor}:${attemptId}`,
    canSubmit: allowed && !save.offline && save.canSave && submit.phase === "idle",
    canCheckSubmit:
      canWork() &&
      !reconciling.current &&
      !posting.current &&
      performance.now() >= reconcileAt.current,
    frozen,
    save,
    remaining,
    milestone,
    notice,
    submit,
    conflictAnswers,
    conflictError,
    loadMore() {
      if (!canWork() || questions.isFetching || answers.isFetching) return;
      if (questions.hasNextPage) void questions.fetchNextPage();
      if (answers.hasNextPage) void answers.fetchNextPage();
    },
    change(questionId: string, selectedOptionIds: readonly string[], marked: boolean) {
      if (!canAct()) return;
      try {
        commit(
          editAnswer(
            saveRef.current,
            { questionId, selectedOptionIds, marked },
            performance.now(),
            Math.random(),
          ),
        );
      } catch {
        setNotice("Câu này chưa tải xong nên chưa sửa được.");
      }
    },
    requestSubmit() {
      if (!canWork() || !saveRef.current.canSave || submitRef.current.phase !== "idle") return;
      commit(setTransport(saveRef.current, { editingFrozen: true }));
      setSubmitBoth(beginManualSubmit(submitRef.current, dirtyCount(saveRef.current), uuidV7));
    },
    cancelSubmit() {
      if (!isCurrent() || submitRef.current.phase !== "save-blocked") return;
      commit(setTransport(saveRef.current, { editingFrozen: false }));
      setSubmitBoth(cancelBlockedSubmit(submitRef.current));
    },
    retrySubmit() {
      const now = performance.now();
      commit(rearmExhausted(saveRef.current, now));
      setSubmitBoth(retryBlockedSubmit(submitRef.current));
    },
    retrySave() {
      if (
        !isCurrent() ||
        deniedRef.current ||
        !saveRef.current.canSave ||
        !saveRef.current.authenticated ||
        active.current.needsReauth
      )
        return;
      const now = performance.now();
      const rearmed = rearmExhausted(setTransport(saveRef.current, { offline: false }), now);
      const sent = capture(rearmed, now, uuidV7, { force: true });
      commit(sent.state);
      if (sent.batch) void transmit(sent.batch);
    },
    reloadConflict() {
      if (!canWork()) return;
      setConflictAnswers([]);
      setConflictError(null);
      void readAnswers(api, attemptId)
        .then((fresh) => {
          if (isCurrent() && !deniedRef.current)
            setConflictAnswers(completeConflictAnswers(saveRef.current, fresh));
        })
        .catch((error: unknown) => {
          if (!isCurrent()) return;
          handleError(error);
          setConflictError(error);
        });
    },
    resolveServer() {
      if (!canWork() || !conflictReady) return;
      commit(resolveUseServer(saveRef.current, conflictAnswers));
    },
    resolveMine() {
      if (!canWork() || !conflictReady) return;
      const kept = resolveKeepMine(saveRef.current, conflictAnswers);
      const sent = capture(kept, performance.now(), uuidV7, { force: true });
      commit(sent.state);
      if (sent.batch) void transmit(sent.batch);
    },
    async reauthenticate(email: string, password: string) {
      if (!isCurrent() || deniedRef.current) return;
      const previous = session.profile?.email ?? "";
      setRecovering(true);
      try {
        await api.login({ email, password });
        if (!isCurrent() || deniedRef.current) return;
        const profile = await api.getProfile();
        if (!isCurrent() || deniedRef.current) return;
        if (
          profile.data.id !== actor ||
          normalizeEmail(profile.data.email) !== normalizeEmail(previous)
        ) {
          session.replaceActor(profile.data);
          navigate("/dashboard", { replace: true });
          return;
        }
        session.adoptProfile(profile.data);
        commit(resumeAuthenticated(saveRef.current, performance.now()));
        setNotice("Đã đăng nhập lại. Lần lưu đang giữ sẽ được gửi với cùng khóa.");
      } finally {
        if (isCurrent()) setRecovering(false);
      }
    },
    retryReconcile() {
      if (
        !canWork() ||
        reconciling.current ||
        posting.current ||
        performance.now() < reconcileAt.current
      )
        return;
      stoppedRef.current = false;
      setSubmitStopped(false);
      reconcileStarted.current = performance.now();
      submitPosts.current = 0;
      setSubmitBoth(markSubmitUnknown(submitRef.current));
    },
    recovering,
  };
}
