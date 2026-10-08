import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useTitle } from "../../app/use-title";
import { statusLabel } from "../../shared/format";
import { Alert, Button, EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { useAttemptPolling } from "./use-attempt-polling";
import layout from "../../shared/styles/layout.module.css";
import styles from "./results.module.css";

export function StatusPage() {
  const { attemptId = "" } = useParams();
  const [pollRun, setPollRun] = useState(0);
  useTitle("Trạng thái bài");
  const location = useLocation();
  const unconfirmed = (location.state as { unconfirmed?: number } | null)?.unconfirmed ?? 0;
  return (
    <AttemptStatus
      key={`${attemptId}/${pollRun}`}
      attemptId={attemptId}
      unconfirmed={unconfirmed}
      onCheckAgain={() => setPollRun((run) => run + 1)}
    />
  );
}

function AttemptStatus({
  attemptId,
  unconfirmed,
  onCheckAgain,
}: {
  attemptId: string;
  unconfirmed: number;
  onCheckAgain: () => void;
}) {
  const poll = useAttemptPolling(attemptId);
  const attempt = poll.attempt;
  const active = attempt?.status === "IN_PROGRESS" || attempt?.status === "CREATED";
  const finished = attempt?.resultAvailable || attempt?.status === "COMPLETED";
  const failed = attempt?.status === "FAILED" && !attempt.replayPending;
  return (
    <div className={layout.wrap}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>SAU KHI LÀM BÀI</p>
        <h1 className={layout.title}>Trạng thái bài</h1>
        <p className={layout.muted}>Theo dõi lượt thi và mở kết quả khi đã sẵn sàng.</p>
      </header>
      {unconfirmed > 0 ? (
        <Alert tone="warning" title="Một phần chưa được xác nhận">
          {unconfirmed} thay đổi chưa có xác nhận lưu trước khi nộp. Chúng không được tính là đã vào
          bài.
        </Alert>
      ) : null}
      {!attempt && !poll.error ? <SkeletonLines /> : null}
      {poll.error ? (
        <ErrorPanel error={poll.error} onRetry={poll.stopped ? onCheckAgain : undefined} />
      ) : null}
      {attempt ? (
        <section className={styles.statusPanel} data-failed={failed}>
          <div className={styles.statusIcon} aria-hidden="true">
            {finished ? "✓" : failed ? "!" : active ? "▤" : "◷"}
          </div>
          <span className={styles.badge} data-wrong={failed}>
            {statusLabel(attempt.status)}
            {attempt.replayPending ? " · đang chờ xử lý lại" : ""}
            {attempt.expired ? " · đã hết giờ" : ""}
          </span>
          <h2>
            {finished
              ? "Kết quả đã sẵn sàng"
              : failed
                ? "Bài chưa xử lý xong"
                : active
                  ? "Lượt thi đang mở"
                  : "Bài đang chờ kết quả"}
          </h2>
          <p>
            {finished
              ? "Điểm và kết quả của lượt thi này đã được công bố."
              : failed
                ? "Chưa có kết quả để xem. Bạn có thể quay lại kiểm tra trạng thái sau."
                : active
                  ? "Quay lại phòng thi để tiếp tục và xem thời gian còn lại."
                  : "Điểm sẽ hiện khi máy chủ hoàn tất xử lý. Bạn có thể rời trang và quay lại từ lịch sử."}
          </p>
          {!active ? (
            <ol className={styles.steps} aria-label="Các bước xử lý bài">
              <li data-done="true">
                <span aria-hidden="true">✓</span>Nhận bài
              </li>
              <li data-done={finished} aria-current={!finished ? "step" : undefined}>
                <span aria-hidden="true">{finished ? "✓" : failed ? "!" : "2"}</span>
                {attempt.status === "SUBMITTED" || attempt.status === "EXPIRED"
                  ? "Chờ xử lý"
                  : "Xử lý bài"}
              </li>
              <li aria-current={finished ? "step" : undefined}>
                <span aria-hidden="true">{finished ? "✓" : "3"}</span>Có kết quả
              </li>
            </ol>
          ) : null}
          <div className={styles.actions}>
            {poll.stopped && !finished ? (
              <Button variant="secondary" onClick={onCheckAgain}>
                Kiểm tra lại
              </Button>
            ) : null}
            {finished ? (
              <Link className={styles.primaryLink} to={`/attempts/${attempt.id}/result`}>
                Xem kết quả
              </Link>
            ) : active ? (
              <Link className={styles.primaryLink} to={`/attempts/${attempt.id}`}>
                Vào phòng thi
              </Link>
            ) : (
              <p className={layout.muted}>Kết quả chưa sẵn sàng.</p>
            )}
            <Link className={layout.chip} to="/history">
              Về lịch sử
            </Link>
          </div>
          <p className={styles.caption}>
            {finished
              ? "Kết quả đã được cập nhật cho lượt thi này."
              : poll.stopped
                ? "Đã dừng cập nhật tự động. Bạn có thể chọn Kiểm tra lại hoặc mở lại lượt từ lịch sử."
                : "Trang tự kiểm tra trạng thái và tạm dừng cập nhật khi bạn chuyển sang tab khác."}
          </p>
        </section>
      ) : !poll.error ? null : (
        <EmptyState
          title="Chưa tải được trạng thái"
          action={
            <Link className={layout.chip} to="/history">
              Về lịch sử
            </Link>
          }
        >
          Hãy thử mở lại lượt thi từ lịch sử.
        </EmptyState>
      )}
    </div>
  );
}
