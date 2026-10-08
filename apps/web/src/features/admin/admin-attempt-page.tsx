import { adminId as shortId } from "./admin-ui";
import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import { AdminReviewCard } from "./admin-review-card";
import styles from "./admin.module.css";
import { useParams } from "react-router";
import { formatBasisPoints } from "../../shared/format";
import { Alert, Button, ErrorPanel, SkeletonLines, TextArea } from "../../shared/ui/ui";
import { AdminHeading, PageEnd } from "./admin-ui";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { uuidV7 } from "../../shared/api/uuid";
import { isApiError } from "../../shared/api/errors";
import { idleIntent, settleIntent, startIntent, type IntentMachine } from "./mutation-intent";

function unknownTransport(error: unknown): boolean {
  return isApiError(error) && (error.kind === "network" || error.kind === "timeout");
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
      <AdminHeading
        title={`Lượt ${shortId(attemptId)}`}
        eyebrow="CHI TIẾT LƯỢT THI"
        description="Kết quả và bài làm của đúng lượt, theo phiên bản đã khóa."
      />
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
        <section className={styles.panel}>
          <p className={styles.eyebrow}>KẾT QUẢ ĐÃ TRẢ</p>
          <h2>
            {result.data.result.earned}/{result.data.result.possible} điểm
          </h2>
          <p>{formatBasisPoints(result.data.result.percentageBasisPoints)}</p>
        </section>
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
        : reviewRows.map((row) => <AdminReviewCard key={row.question.id} row={row} />)}
      {!hideReview && review.data ? (
        <PageEnd
          next={Boolean(review.hasNextPage)}
          loading={review.isFetchingNextPage}
          onMore={() => void review.fetchNextPage()}
        />
      ) : null}
      <CapabilityGate permission="assessment.replay">
        <section className={styles.panel}>
          <h2>Xử lý lại lượt thất bại</h2>
          <p className={styles.muted}>
            Bản live chưa có revision quản trị cho thao tác này. Dữ liệu mẫu chỉ dùng số trong bộ
            nhớ demo và không đăng nhập thay thí sinh.
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
          <div className={styles.actions}>
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
        </section>
      </CapabilityGate>
    </CapabilityGate>
  );
}
