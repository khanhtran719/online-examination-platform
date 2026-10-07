import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import type { Answer, Attempt } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import type { PlatformApi } from "../../shared/api/platform";
import { uuidV7 } from "../../shared/api/uuid";
import { normalizeEmail } from "../../shared/format";
import {
  acknowledge,
  capture,
  createAutosaveState,
  dirtyCount,
  editAnswer,
  failConflict,
  failOffline,
  failRetryable,
  holdForReauth,
  ingestAnswerPage,
  rearmExhausted,
  resumeAuthenticated,
  resumeOnline,
  resolveKeepMine,
  resolveUseServer,
  setTransport,
  type AutosaveState,
  type InFlightBatch,
} from "./autosave";
import { advanceSubmitClock } from "./room-tick";
import { clockMilestone, remainingMs, type ClockSample } from "./clock";
import {
  beginManualSubmit,
  cancelBlockedSubmit,
  createSubmitState,
  markSubmitAccepted,
  markSubmitUnknown,
  retryBlockedSubmit,
  type SubmitState,
} from "./submit-flow";

async function readAnswers(api: PlatformApi, attemptId: string): Promise<Answer[]> {
  const rows: Answer[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 30; page += 1) {
    const response = await api.getAnswers(attemptId, { pageSize: 100, cursor });
    rows.push(...response.data.items);
    if (!response.data.next) return rows;
    cursor = response.data.next;
  }
  return rows;
}

export function useExamRoom(attemptId: string) {
  const { api } = useRuntime();
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const saveRef = useRef<AutosaveState>(createAutosaveState());
  const [save, setSave] = useState(saveRef.current);
  const submitRef = useRef<SubmitState>(createSubmitState());
  const [submit, setSubmit] = useState(submitRef.current);
  const sampleRef = useRef<ClockSample | null>(null);
  const previousRemaining = useRef(Number.POSITIVE_INFINITY);
  const activeSend = useRef<string | null>(null);
  const transportStarted = useRef<number | null>(null);
  const posting = useRef(false);
  const [recovering, setRecovering] = useState(false);
  const reconcileAt = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflictAnswers, setConflictAnswers] = useState<Answer[]>([]);
  const [conflictError, setConflictError] = useState<unknown>(null);

  const commit = useCallback((next: AutosaveState) => {
    saveRef.current = next;
    setSave(next);
  }, []);
  const setSubmitBoth = useCallback((next: SubmitState) => {
    submitRef.current = next;
    setSubmit(next);
  }, []);

  const attemptQuery = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => api.resumeAttempt(attemptId).then((response) => response.data),
    staleTime: Infinity,
  });
  const runnable = attemptQuery.data?.status === "IN_PROGRESS" || attemptQuery.data?.status === "CREATED";
  const questions = useInfiniteQuery({
    queryKey: ["attempt-questions", attemptId],
    enabled: runnable,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.getQuestions(attemptId, { pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: Infinity,
  });
  const answers = useInfiniteQuery({
    queryKey: ["attempt-answers", attemptId],
    enabled: runnable,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.getAnswers(attemptId, { pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: Infinity,
  });

  useEffect(() => {
    saveRef.current = createAutosaveState();
    setSave(saveRef.current);
    submitRef.current = createSubmitState();
    setSubmit(submitRef.current);
    sampleRef.current = null;
    previousRemaining.current = Number.POSITIVE_INFINITY;
  }, [attemptId]);

  useEffect(() => {
    const attempt = attemptQuery.data;
    if (!attempt) return;
    const mono = performance.now();
    const sample: ClockSample = {
      serverNowMs: Date.parse(attempt.serverNow),
      monotonicAtSample: mono,
      deadlineMs: Date.parse(attempt.deadline),
      rttMs: 0,
      canSave: attempt.canSave,
    };
    sampleRef.current = sample;
    commit(setTransport(saveRef.current, { canSave: attempt.canSave && remainingMs(sample, mono) > 0 }));
  }, [attemptQuery.data, commit]);

  useEffect(() => {
    const questionIds = (questions.data?.pages ?? []).flatMap((page) => page.items.map((item) => item.id));
    const observed = (answers.data?.pages ?? []).flatMap((page) => page.items);
    if (questionIds.length === 0 && observed.length === 0) return;
    const authoritative =
      questions.isSuccess && !questions.hasNextPage && answers.isSuccess && !answers.hasNextPage;
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
      if (activeSend.current === batch.key) return;
      activeSend.current = batch.key;
      transportStarted.current = performance.now();
      try {
        const response = await api.saveAnswers(attemptIdRef.current, batch.key, {
          answers: batch.answers.map((answer) => ({
            questionId: answer.questionId,
            selectedOptionIds: [...answer.selectedOptionIds],
            marked: answer.marked,
            expectedVersion: answer.expectedVersion,
          })),
        });
        commit(acknowledge(saveRef.current, response.data, batch.key));
        setNotice(null);
      } catch (caught) {
        const now = performance.now();
        if (isApiError(caught) && caught.status === 409) {
          commit(failConflict(saveRef.current));
          try {
            setConflictAnswers(await readAnswers(api, attemptIdRef.current));
            setConflictError(null);
          } catch (error) {
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
          setNotice("Hết thời gian chờ. Chưa rõ đáp án đã được ghi nhận chưa. Cùng một lần lưu sẽ được gửi lại.");
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
            setNotice(`Máy chủ yêu cầu chờ ${retryAfter ?? "một lúc"} giây. Cùng một lần lưu sẽ được gửi lại.`);
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
        if (activeSend.current === batch.key) {
          activeSend.current = null;
          transportStarted.current = null;
        }
      }
    },
    [api, commit],
  );

  useEffect(() => {
    let alive = true;
    async function postSubmit() {
      const key = submitRef.current.key;
      if (!key || posting.current || submitRef.current.phase !== "posting") return;
      posting.current = true;
      try {
        const response = await api.submitAttempt(attemptIdRef.current, key);
        if (!alive) return;
        const accepted = markSubmitAccepted(submitRef.current, response.data);
        setSubmitBoth(accepted);
        navigate(`/attempts/${attemptIdRef.current}/status`, {
          replace: true,
          state: { unconfirmed: accepted.unconfirmedCount },
        });
      } catch (caught) {
        if (!alive) return;
        if (isApiError(caught) && (caught.status === 422 || caught.status === 409)) {
          navigate(`/attempts/${attemptIdRef.current}/status`, { replace: true });
          return;
        }
        setSubmitBoth(markSubmitUnknown(submitRef.current));
        setNotice("Chưa rõ bài đã được nộp chưa. Cùng khóa nộp sẽ được kiểm tra lại.");
      } finally {
        posting.current = false;
      }
    }
    async function reconcile() {
      const key = submitRef.current.key;
      if (!key) return;
      try {
        const status = await api.getAttemptStatus(attemptIdRef.current);
        if (!alive) return;
        if (status.data.status !== "IN_PROGRESS" && status.data.status !== "CREATED") {
          navigate(`/attempts/${attemptIdRef.current}/status`, {
            replace: true,
            state: { unconfirmed: submitRef.current.unconfirmedCount },
          });
          return;
        }
        setSubmitBoth({ ...submitRef.current, phase: "posting" });
        posting.current = false;
        await postSubmit();
      } catch {
        if (alive) setNotice("Chưa kiểm tra được trạng thái nộp.");
      }
    }
    const timer = window.setInterval(() => {
      const now = performance.now();
      const sample = sampleRef.current;
      if (sample) {
        const left = remainingMs(sample, now);
        setRemaining((previous) => (previous !== null && Math.ceil(previous / 1000) === Math.ceil(left / 1000) ? previous : left));
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
      if (submitRef.current.phase === "verifying" && now >= reconcileAt.current) {
        reconcileAt.current = now + 2_000;
        void reconcile();
      }
    }, 250);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [api, commit, navigate, setSubmitBoth, transmit]);

  useEffect(() => {
    if (!session.needsReauth) return;
    commit(holdForReauth(saveRef.current));
  }, [commit, session.needsReauth]);

  useEffect(() => {
    const dirty = dirtyCount(save) > 0 || save.inFlight !== null || save.phase === "conflict";
    session.setUnconfirmed(dirty);
    return () => session.setUnconfirmed(false);
  }, [save, session]);

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (dirtyCount(saveRef.current) === 0 && !saveRef.current.inFlight) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  useEffect(() => {
    async function resync() {
      try {
        const response = await api.resumeAttempt(attemptIdRef.current);
        const mono = performance.now();
        const sample: ClockSample = {
          serverNowMs: Date.parse(response.data.serverNow),
          monotonicAtSample: mono,
          deadlineMs: Date.parse(response.data.deadline),
          rttMs: 0,
          canSave: response.data.canSave,
        };
        sampleRef.current = sample;
        const left = remainingMs(sample, mono);
        commit(setTransport(saveRef.current, { canSave: response.data.canSave && left > 0, offline: false }));
        queryClient.setQueryData<Attempt>(["attempt", attemptIdRef.current], response.data);
      } catch (caught) {
        if (isApiError(caught) && caught.kind === "network") commit(failOffline(saveRef.current));
      }
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
  }, [api, commit, queryClient]);

  return {
    attemptQuery,
    questions,
    answers,
    save,
    remaining,
    milestone,
    notice,
    submit,
    conflictAnswers,
    conflictError,
    loadMore() {
      void questions.fetchNextPage();
      void answers.fetchNextPage();
    },
    change(questionId: string, selectedOptionIds: readonly string[], marked: boolean) {
      try {
        commit(editAnswer(saveRef.current, { questionId, selectedOptionIds, marked }, performance.now(), Math.random()));
      } catch {
        setNotice("Câu này chưa tải xong nên chưa sửa được.");
      }
    },
    requestSubmit() {
      commit(setTransport(saveRef.current, { editingFrozen: true }));
      setSubmitBoth(beginManualSubmit(submitRef.current, dirtyCount(saveRef.current), uuidV7));
    },
    cancelSubmit() {
      commit(setTransport(saveRef.current, { editingFrozen: false }));
      setSubmitBoth(cancelBlockedSubmit(submitRef.current));
    },
    retrySubmit() {
      const now = performance.now();
      commit(rearmExhausted(saveRef.current, now));
      setSubmitBoth(retryBlockedSubmit(submitRef.current));
    },
    retrySave() {
      const now = performance.now();
      const rearmed = rearmExhausted(setTransport(saveRef.current, { offline: false }), now);
      const sent = capture(rearmed, now, uuidV7, { force: true });
      commit(sent.state);
      if (sent.batch) void transmit(sent.batch);
    },
    reloadConflict() {
      void readAnswers(api, attemptId).then(setConflictAnswers).catch(setConflictError);
    },
    resolveServer() {
      commit(resolveUseServer(saveRef.current, conflictAnswers));
    },
    resolveMine() {
      const kept = resolveKeepMine(saveRef.current, conflictAnswers);
      const sent = capture(kept, performance.now(), uuidV7, { force: true });
      commit(sent.state);
      if (sent.batch) void transmit(sent.batch);
    },
    async reauthenticate(email: string, password: string) {
      const previous = session.profile?.email ?? "";
      setRecovering(true);
      try {
        await api.login({ email, password });
        const profile = await api.getProfile();
        if (normalizeEmail(profile.data.email) !== normalizeEmail(previous)) {
          session.replaceActor(profile.data);
          navigate("/dashboard", { replace: true });
          return;
        }
        session.adoptProfile(profile.data);
        commit(resumeAuthenticated(saveRef.current, performance.now()));
        setNotice("Đã đăng nhập lại. Lần lưu đang giữ sẽ được gửi với cùng khóa.");
      } finally {
        setRecovering(false);
      }
    },
    recovering,
  };
}
