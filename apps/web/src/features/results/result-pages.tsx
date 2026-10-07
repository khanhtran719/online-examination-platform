import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import type { Attempt } from "../../shared/api/dto";
import { isApiError } from "../../shared/api/errors";
import { formatBasisPoints, formatDateTime, shortId, statusLabel } from "../../shared/format";
import { useProtectedAccess } from "../../shared/protected-access";
import { isReleasedReviewHref } from "../../shared/review-href";
import {
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  choiceClass,
} from "../../shared/ui/ui";
import { canRestartPoll, nextPollDelayMs, shouldStopPolling } from "../assessment/polling";
import styles from "../../shared/styles/layout.module.css";

function useAttemptPolling(attemptId: string) {
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

export function StatusPage() {
  const { attemptId = "" } = useParams();
  useTitle("Trạng thái bài");
  const location = useLocation();
  const unconfirmed = (location.state as { unconfirmed?: number } | null)?.unconfirmed ?? 0;
  const poll = useAttemptPolling(attemptId);
  const attempt = poll.attempt;
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Trạng thái bài</h1>
      {unconfirmed > 0 ? (
        <Alert tone="warning" title="Một phần chưa được xác nhận">
          {unconfirmed} thay đổi chưa có xác nhận lưu trước khi nộp. Chúng không được tính là đã vào
          bài.
        </Alert>
      ) : null}
      {!attempt && !poll.error ? <SkeletonLines /> : null}
      {poll.error ? <ErrorPanel error={poll.error} /> : null}
      {attempt ? (
        <section className={styles.card}>
          <p>
            {statusLabel(attempt.status)}
            {attempt.replayPending ? " · đang chờ xử lý lại" : ""}
            {attempt.expired ? " · đã hết giờ" : ""}
          </p>
          <p className={styles.muted}>
            Không có thanh tiến độ giả. Kết quả chỉ hiện khi máy chủ trả điểm.
          </p>
          {attempt.resultAvailable || attempt.status === "COMPLETED" ? (
            <Link className={styles.chip} to={`/attempts/${attempt.id}/result`}>
              Xem kết quả
            </Link>
          ) : (
            <p>Kết quả chưa sẵn sàng.</p>
          )}
          {poll.stopped ? (
            <p>{poll.stopped}</p>
          ) : (
            <p>Đang hỏi máy chủ theo nhịp tăng dần, tạm dừng khi ẩn trang.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

export function ResultPage() {
  const { attemptId = "" } = useParams();
  useTitle("Kết quả");
  const { api } = useRuntime();
  const memory = useMemory();
  const result = useQuery({
    queryKey: ["result", attemptId],
    queryFn: () => api.getResult(attemptId).then((response) => response.data),
  });
  const status = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => api.resumeAttempt(attemptId).then((response) => response.data),
    enabled: result.isSuccess,
  });
  if (result.isLoading) return <SkeletonLines />;
  if (result.error || !result.data)
    return <ErrorPanel error={result.error} onRetry={() => void result.refetch()} />;
  if (result.data.pending || !result.data.result) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Kết quả chưa sẵn sàng</h1>
        <Alert tone="warning" title="Máy chủ đã nhận yêu cầu">
          Phản hồi đang chờ xử lý. Đây không phải điểm và không có phần trăm hoàn thành giả.
        </Alert>
        <Link className={styles.chip} to={`/attempts/${attemptId}/status`}>
          Theo dõi trạng thái
        </Link>
      </div>
    );
  }
  const score = result.data.result;
  const frozen = memory.lookup(score.publishedVersionId);
  const href = score.review?.href ?? "";
  const reviewAllowed = score.review !== null && isReleasedReviewHref(attemptId, href);
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Kết quả</h1>
      <section className={styles.card}>
        <p>
          {score.earned}/{score.possible} điểm
        </p>
        <p>
          {score.correct}/{score.total} câu khớp chính xác
        </p>
        <p>{formatBasisPoints(score.percentageBasisPoints)} theo thang điểm cơ sở</p>
        <p>{score.scoringPolicy}</p>
        <p>{score.expired ? "Lượt này hết giờ trước khi nộp." : "Lượt này được nộp trong hạn."}</p>
        <p className={styles.muted}>Không quy đổi sang IELTS band hoặc TOEIC.</p>
      </section>
      <section className={styles.stack}>
        <h2>Theo phần</h2>
        {!frozen ? (
          <p className={styles.muted}>Tên phần không có trong kết quả. Trang chỉ hiện mã phần.</p>
        ) : null}
        {score.sections.map((section) => {
          const known = frozen?.sections.find((item) => item.id === section.sectionId);
          return (
            <p key={section.sectionId}>
              {known?.title ?? shortId(section.sectionId)} · {section.earned}/{section.possible}{" "}
              điểm · {section.correct}/{section.total} câu
            </p>
          );
        })}
      </section>
      {score.review === null ? <p>Đề này chưa mở phần giải thích.</p> : null}
      {score.review && !reviewAllowed ? (
        <Alert title="Không tải giải thích">Liên kết không nằm trong danh sách cho phép.</Alert>
      ) : null}
      {reviewAllowed ? (
        <Link className={styles.chip} to={`/attempts/${attemptId}/review`}>
          Xem giải thích đã mở
        </Link>
      ) : null}
      {status.data ? (
        <Link
          className={styles.chip}
          to={`/exams/${status.data.examId}/versions/${score.publishedVersionId}/leaderboard`}
        >
          Bảng xếp hạng của phiên bản này
        </Link>
      ) : null}
    </div>
  );
}

export function ReviewPage() {
  const { attemptId = "" } = useParams();
  useTitle("Giải thích");
  const { api } = useRuntime();
  const [reviewBlocked, setReviewBlocked] = useState(false);
  const [resultBlocked, setResultBlocked] = useState(false);
  const gate = useQuery({
    queryKey: ["result", attemptId],
    enabled: !resultBlocked,
    queryFn: () => api.getResult(attemptId).then((response) => response.data),
  });
  const href = gate.data?.result?.review?.href ?? "";
  const allowed =
    gate.data?.result != null &&
    gate.data.result.review !== null &&
    isReleasedReviewHref(attemptId, href);
  const review = useInfiniteQuery({
    queryKey: ["review", attemptId],
    enabled: allowed && !reviewBlocked,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getReleasedReview(attemptId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const hideReview = useProtectedAccess(review.error, [["review", attemptId]], reviewBlocked, () =>
    setReviewBlocked(true),
  );
  const hideResult = useProtectedAccess(gate.error, [["result", attemptId]], resultBlocked, () =>
    setResultBlocked(true),
  );
  if (gate.isLoading) return <SkeletonLines />;
  if (hideResult || gate.error)
    return (
      <ErrorPanel error={gate.error} onRetry={hideResult ? undefined : () => void gate.refetch()} />
    );
  if (!allowed) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Chưa mở giải thích</h1>
        <p>Trang không tải đáp án khi kết quả chưa cho phép hoặc liên kết không hợp lệ.</p>
        <Link className={styles.chip} to={`/attempts/${attemptId}/result`}>
          Về kết quả
        </Link>
      </div>
    );
  }
  const rows = hideReview ? [] : (review.data?.pages.flatMap((page) => page.items) ?? []);
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Giải thích</h1>
      {review.isLoading ? <SkeletonLines /> : null}
      {review.error ? (
        <ErrorPanel
          error={review.error}
          onRetry={hideReview ? undefined : () => void review.refetch()}
        />
      ) : null}
      {hideReview
        ? null
        : rows.map((row) => (
            <article key={row.question.id} className={styles.card}>
              <p>{row.correct ? "Đúng" : "Chưa đúng"}</p>
              <h2 className={styles.prompt}>{row.question.prompt}</h2>
              <div className={styles.choices}>
                {row.question.options.map((option) => {
                  const selected = row.selectedOptionIds.includes(option.id);
                  const correct = row.correctOptionIds.includes(option.id);
                  return (
                    <p key={option.id} className={choiceClass(selected || correct)}>
                      {option.text}
                      {selected ? " · Bạn đã chọn" : ""}
                      {correct ? " · Đáp án của đề" : ""}
                    </p>
                  );
                })}
              </div>
              <p>{row.explanation ?? "Chưa có giải thích."}</p>
            </article>
          ))}
      {review.hasNextPage ? (
        <Button onClick={() => void review.fetchNextPage()}>
          {review.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : null}
    </div>
  );
}

export function HistoryPage() {
  useTitle("Lịch sử");
  const { api } = useRuntime();
  const memory = useMemory();
  const history = useInfiniteQuery({
    queryKey: ["history"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Lịch sử</h1>
      <p className={styles.muted}>
        Lịch sử không kèm tiêu đề đề. Tiêu đề chỉ hiện nếu bạn đã mở phiên bản này trong phiên làm
        việc này.
      </p>
      {history.isLoading ? <SkeletonLines /> : null}
      {history.error ? (
        <ErrorPanel error={history.error} onRetry={() => void history.refetch()} />
      ) : null}
      {history.isSuccess && items.length === 0 ? (
        <EmptyState title="Chưa có lượt thi">Hãy bắt đầu từ danh sách đề.</EmptyState>
      ) : null}
      <div className={styles.stack}>
        {items.map((item) => {
          const frozen = memory.lookup(item.publishedVersionId);
          const title =
            frozen && frozen.examId === item.examId
              ? frozen.title
              : `Phiên bản ${shortId(item.publishedVersionId)}`;
          const href =
            item.status === "IN_PROGRESS" || item.status === "CREATED"
              ? `/attempts/${item.attemptId}`
              : item.status === "COMPLETED"
                ? `/attempts/${item.attemptId}/result`
                : `/attempts/${item.attemptId}/status`;
          return (
            <Link key={item.attemptId} className={`${styles.card} ${styles.cardLink}`} to={href}>
              <h2>{title}</h2>
              <p>
                {statusLabel(item.status)} · {formatDateTime(item.startedAt)}
              </p>
              <p>
                {item.earned === null || item.possible === null
                  ? "Chưa có điểm"
                  : `${item.earned}/${item.possible}`}
              </p>
            </Link>
          );
        })}
      </div>
      {history.hasNextPage ? (
        <Button onClick={() => void history.fetchNextPage()}>Tải thêm</Button>
      ) : null}
      {history.isSuccess && !history.hasNextPage ? (
        <p className={styles.muted}>Đã hết danh sách. Không có số trang.</p>
      ) : null}
    </div>
  );
}

export function LeaderboardPage() {
  const { examId = "", versionId = "" } = useParams();
  useTitle("Bảng xếp hạng");
  const { api } = useRuntime();
  const memory = useMemory();
  const frozen = memory.lookup(versionId);
  const board = useInfiniteQuery({
    queryKey: ["leaderboard", examId, versionId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api
        .getLeaderboard(examId, versionId, { pageSize: 20, cursor: pageParam })
        .then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const rows = board.data?.pages.flatMap((page) => page.items) ?? [];
  const denied =
    isApiError(board.error) && (board.error.status === 403 || board.error.status === 404);
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Bảng xếp hạng</h1>
      <p>
        {frozen && frozen.publishedVersionId === versionId
          ? frozen.title
          : `Phiên bản ${shortId(versionId)}`}
      </p>
      <p className={styles.muted}>
        Chỉ bí danh của người đã bật tham gia. Không có cột tên thật và không đánh dấu dòng của bạn.
      </p>
      {board.isLoading ? <SkeletonLines /> : null}
      {denied ? (
        <EmptyState title="Bảng xếp hạng không mở">
          Phiên bản này không công bố bảng, hoặc bạn không có quyền xem.
        </EmptyState>
      ) : null}
      {board.error && !denied ? (
        <ErrorPanel error={board.error} onRetry={() => void board.refetch()} />
      ) : null}
      {board.isSuccess && rows.length === 0 ? (
        <EmptyState title="Chưa có dòng nào">
          Chưa có bài hoàn thành nào được đưa vào bảng.
        </EmptyState>
      ) : null}
      <div className={styles.stack}>
        {rows.map((row) => (
          <p key={`${row.rank}-${row.pseudonym}`}>
            {row.rank}. {row.pseudonym} · {row.earned}/{row.possible} ·{" "}
            {formatDateTime(row.completedAt)}
          </p>
        ))}
      </div>
      {board.hasNextPage ? (
        <Button onClick={() => void board.fetchNextPage()}>Tải thêm</Button>
      ) : null}
    </div>
  );
}
