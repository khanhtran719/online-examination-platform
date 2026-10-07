import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { isApiError } from "../../shared/api/errors";
import { isUuidV7, uuidV7 } from "../../shared/api/uuid";
import { formatDateTime, shortId, statusLabel } from "../../shared/format";
import { useProtectedAccess } from "../../shared/protected-access";
import {
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TextArea,
  TextField,
} from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { canRestartPoll, monitorDelayMs } from "../assessment/polling";
import { CapabilityGate, useCapability } from "./gate";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";

function unknownTransport(error: unknown): boolean {
  return isApiError(error) && (error.kind === "network" || error.kind === "timeout");
}

export function MonitorIndexPage() {
  useTitle("Giám sát");
  const reporting = useCapability("reporting.read");
  const manage = useCapability("catalog.manage");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const exams = useInfiniteQuery({
    queryKey: ["admin-exams", "monitor"],
    enabled: reporting === "allowed" && manage === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.listAdminExams({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(exams.error, [["admin-exams", "monitor"]], blocked, () =>
    setBlocked(true),
  );
  const items = hidden ? [] : (exams.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="reporting.read">
      <h1 className={styles.title}>Giám sát</h1>
      {manage !== "allowed" ? (
        <Alert title="Không liệt kê đề">
          Cần quyền quản lý đề để lấy danh sách. Trang này không hỏi danh sách khi thiếu quyền đó.
        </Alert>
      ) : null}
      <p className={styles.muted}>
        Danh sách đề cần quyền quản lý đề. Người chỉ có quyền xem báo cáo mở đúng đường dẫn giám sát
        của một đề.
      </p>
      {exams.isLoading ? <SkeletonLines /> : null}
      {exams.error ? (
        <ErrorPanel error={exams.error} onRetry={hidden ? undefined : () => void exams.refetch()} />
      ) : null}
      <div className={styles.stack}>
        {items.map((exam) => (
          <Link key={exam.id} className={styles.chip} to={`/admin/exams/${exam.id}/monitor`}>
            {exam.title}
          </Link>
        ))}
      </div>
    </CapabilityGate>
  );
}

export function MonitorExamPage() {
  const { examId = "" } = useParams();
  useTitle("Thí sinh đang làm");
  const gate = useCapability("reporting.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const rows = useInfiniteQuery({
    queryKey: ["monitor", examId],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .listActiveCandidates(examId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(rows.error, [["monitor", examId]], blocked, () =>
    setBlocked(true),
  );
  const refetchRef = useRef(rows.refetch);
  refetchRef.current = rows.refetch;
  useEffect(() => {
    if (gate !== "allowed" || blocked) return;
    let stopped = false;
    let inFlight = false;
    let timer = 0;
    async function tick() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        await refetchRef.current();
      } finally {
        inFlight = false;
        if (!stopped && !document.hidden) {
          timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
        }
      }
    }
    timer = window.setTimeout(() => void tick(), monitorDelayMs(Math.random()));
    function onVisible() {
      if (
        !canRestartPoll({ hidden: document.hidden, cancelled: stopped, stopped: false, inFlight })
      )
        return;
      window.clearTimeout(timer);
      void tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [blocked, gate]);
  const items = hidden ? [] : (rows.data?.pages.flatMap((page) => page.items) ?? []);
  const loadedAt =
    rows.dataUpdatedAt > 0
      ? formatDateTime(new Date(rows.dataUpdatedAt).toISOString())
      : "Chưa tải";
  return (
    <CapabilityGate permission="reporting.read">
      <h1 className={styles.title}>Đang làm bài</h1>
      <p className={styles.muted}>
        Mã thí sinh không được ghép với tên hiển thị. “Đang làm bài” là trạng thái lượt thi, không
        phải trạng thái trực tuyến.
      </p>
      <p>Lần tải gần nhất: {loadedAt}</p>
      <div className={styles.row}>
        <Button variant="secondary" onClick={() => void rows.refetch()}>
          Tải lại
        </Button>
        <Link className={styles.chip} to={`/admin/exams/${examId}/submissions`}>
          Bài đã nộp
        </Link>
      </div>
      {rows.isLoading ? <SkeletonLines /> : null}
      {rows.error ? (
        <ErrorPanel error={rows.error} onRetry={hidden ? undefined : () => void rows.refetch()} />
      ) : null}
      {rows.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Không có thí sinh đang làm">
          Khi có lượt đang làm, dòng sẽ hiện ở đây.
        </EmptyState>
      ) : null}
      {items.map((item) => (
        <p key={item.attemptId}>
          {shortId(item.candidateId)} · {statusLabel(item.status)} · hạn{" "}
          {formatDateTime(item.deadline)} ·{" "}
          <Link to={`/admin/attempts/${item.attemptId}`}>Xem lượt</Link>
        </p>
      ))}
      {rows.hasNextPage && !hidden ? (
        <Button onClick={() => void rows.fetchNextPage()}>Tải thêm</Button>
      ) : null}
    </CapabilityGate>
  );
}

export function SubmissionsPage() {
  const { examId = "" } = useParams();
  useTitle("Bài đã nộp");
  const gate = useCapability("reporting.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const [versionDraft, setVersionDraft] = useState("");
  const [version, setVersion] = useState<string | undefined>();
  const [versionError, setVersionError] = useState<string | null>(null);
  const rows = useInfiniteQuery({
    queryKey: ["submissions", examId, version ?? "*"],
    enabled: gate === "allowed" && !blocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .listSubmissions(examId, {
          pageSize: 20,
          cursor: pageParam,
          ...(version ? { publishedVersionId: version } : {}),
        })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hidden = useProtectedAccess(
    rows.error,
    [["submissions", examId, version ?? "*"]],
    blocked,
    () => setBlocked(true),
  );
  const items = hidden ? [] : (rows.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <CapabilityGate permission="reporting.read">
      <h1 className={styles.title}>Bài đã nộp</h1>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const value = versionDraft.trim();
          if (!value) {
            setVersion(undefined);
            setVersionError(null);
            setBlocked(false);
            return;
          }
          if (!isUuidV7(value)) {
            setVersionError("Mã phiên bản không đúng định dạng.");
            return;
          }
          setVersion(value);
          setVersionError(null);
          setBlocked(false);
        }}
      >
        <TextField
          label="Lọc theo phiên bản đã phát hành"
          value={versionDraft}
          onChange={(event) => setVersionDraft(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          Áp dụng bộ lọc
        </Button>
        {versionError ? <p role="alert">{versionError}</p> : null}
        <p className={styles.muted}>
          {version ? `Đang lọc phiên bản ${shortId(version)}.` : "Đang hiện mọi phiên bản đã tải."}
        </p>
      </form>
      {rows.isLoading ? <SkeletonLines /> : null}
      {rows.error ? (
        <ErrorPanel error={rows.error} onRetry={hidden ? undefined : () => void rows.refetch()} />
      ) : null}
      {rows.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Chưa có bài nộp">Danh sách chỉ có các lượt của đề này.</EmptyState>
      ) : null}
      {items.map((item) => (
        <p key={item.attemptId}>
          {shortId(item.candidateId)} · {statusLabel(item.status)}
          {item.expired ? " · nộp khi hết giờ" : ""} · phiên bản {shortId(item.publishedVersionId)}{" "}
          · {item.submittedAt ? formatDateTime(item.submittedAt) : "Chưa có giờ nộp"} ·{" "}
          {item.earned === null || item.possible === null
            ? "Chưa có điểm"
            : `${item.earned}/${item.possible}`}{" "}
          · <Link to={`/admin/attempts/${item.attemptId}`}>Chi tiết</Link>
        </p>
      ))}
      {rows.hasNextPage && !hidden ? (
        <Button onClick={() => void rows.fetchNextPage()}>Tải thêm</Button>
      ) : null}
    </CapabilityGate>
  );
}

export function AdminAttemptPage() {
  const { attemptId = "" } = useParams();
  useTitle("Lượt thi quản trị");
  const { api, demo } = useRuntime();
  const reporting = useCapability("reporting.read");
  const reviewGate = useCapability("assessment.review.admin");
  const [resultBlocked, setResultBlocked] = useState(false);
  const [reviewBlocked, setReviewBlocked] = useState(false);
  const result = useQuery({
    queryKey: ["admin-result", attemptId],
    enabled: reporting === "allowed" && !resultBlocked,
    queryFn: () => api.getAdminResult(attemptId).then((response) => response.data),
  });
  const review = useInfiniteQuery({
    queryKey: ["admin-review", attemptId],
    enabled:
      reviewGate === "allowed" && !reviewBlocked && Boolean(result.data && !result.data.pending),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getAdminReview(attemptId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hideResult = useProtectedAccess(
    result.error,
    [["admin-result", attemptId]],
    resultBlocked,
    () => setResultBlocked(true),
  );
  const hideReview = useProtectedAccess(
    review.error,
    [["admin-review", attemptId]],
    reviewBlocked,
    () => setReviewBlocked(true),
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [machine, setMachine] =
    useState<IntentMachine<{ expectedRevision: number; reason: string }>>(idleIntent);
  const revision = demo?.replayRevision(attemptId) ?? null;
  const reviewRows = hideReview ? [] : (review.data?.pages.flatMap((page) => page.items) ?? []);
  async function replay(retryFrozen: boolean) {
    const body =
      retryFrozen && machine.frozen
        ? machine.frozen.body
        : revision === null
          ? null
          : { expectedRevision: revision, reason: reason.trim() };
    if (!body || body.reason.length < 8) {
      setError(
        "Cần lý do ít nhất 8 ký tự và revision quản trị hiện tại. Không dùng revision của thí sinh.",
      );
      return;
    }
    const started = startIntent(machine, {
      action: "replay",
      body,
      expectedRevision: body.expectedRevision,
      keyFactory: uuidV7,
    });
    if (started.blocked || !started.send) {
      setError(
        started.blocked === "changed"
          ? "Lý do đã đổi so với lần gửi chưa xác nhận. Khôi phục nội dung đã gửi trước khi thử lại."
          : "Đang gửi lần này.",
      );
      return;
    }
    setMachine(started.machine);
    setError(null);
    try {
      await api.replayFailedAttempt(attemptId, started.send.key, started.send.body);
      setMachine(settleIntent(started.machine, "acked"));
      setMessage("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.");
      await result.refetch();
    } catch (caught) {
      setMachine(settleIntent(started.machine, unknownTransport(caught) ? "unknown" : "rejected"));
      setError(isApiError(caught) ? caught.message : "Không gửi được.");
    }
  }
  return (
    <CapabilityGate permission="reporting.read">
      <h1 className={styles.title}>Lượt {shortId(attemptId)}</h1>
      {result.isLoading ? <SkeletonLines /> : null}
      {result.error ? (
        <ErrorPanel
          error={result.error}
          onRetry={hideResult ? undefined : () => void result.refetch()}
        />
      ) : null}
      {!hideResult && result.data?.pending ? (
        <Alert tone="warning" title="Chưa có điểm">
          Máy chủ chưa trả kết quả. Không có tiến độ giả.
        </Alert>
      ) : null}
      {!hideResult && result.data?.result ? (
        <p>
          {result.data.result.earned}/{result.data.result.possible} ·{" "}
          {result.data.result.percentageBasisPoints / 100}% cơ sở
        </p>
      ) : null}
      {reviewGate !== "allowed" ? (
        <p>Thiếu quyền xem bài làm nên không tải chi tiết đáp án.</p>
      ) : null}
      {review.error ? (
        <ErrorPanel
          error={review.error}
          onRetry={hideReview ? undefined : () => void review.refetch()}
        />
      ) : null}
      {hideReview
        ? null
        : reviewRows.map((row) => (
            <article key={row.question.id} className={styles.card}>
              <h2>{row.question.prompt}</h2>
              <p>{row.correct ? "Đúng" : "Chưa đúng"}</p>
              <p>{row.explanation ?? "Chưa có giải thích."}</p>
            </article>
          ))}
      <CapabilityGate permission="assessment.replay">
        <h2>Xử lý lại lượt thất bại</h2>
        <p className={styles.muted}>
          Bản live chưa có revision quản trị cho thao tác này. Dữ liệu mẫu chỉ dùng số trong bộ nhớ
          demo và không đăng nhập thay thí sinh.
        </p>
        {revision === null ? (
          <Alert title="Không có revision quản trị">
            Chỉ lượt thất bại trong dữ liệu mẫu mới có số này.
          </Alert>
        ) : (
          <p>Revision quản trị hiện tại: {revision}</p>
        )}
        {message ? (
          <Alert tone="success" title="Đã gửi">
            {message}
          </Alert>
        ) : null}
        {error ? <Alert title="Chưa gửi được">{error}</Alert> : null}
        <TextArea
          label="Lý do"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className={styles.row}>
          <Button
            disabled={revision === null || machine.phase === "inflight"}
            onClick={() => void replay(false)}
          >
            Gửi xử lý lại
          </Button>
          {machine.phase === "unknown" ? (
            <Button variant="secondary" onClick={() => void replay(true)}>
              Thử gửi lại cùng nội dung
            </Button>
          ) : null}
        </div>
      </CapabilityGate>
    </CapabilityGate>
  );
}
