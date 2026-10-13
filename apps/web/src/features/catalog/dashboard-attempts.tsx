import { Link } from "react-router";

import { formatDateTime, statusLabel } from "@web/shared/format";
import { ExamGlyph } from "@web/shared/ui/brand";
import {
  ActionLink,
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
} from "@web/shared/ui/ui";

import styles from "./dashboard.module.css";
import { dashboardAttemptPath } from "./dashboard-model";
import type { useDashboard } from "./use-dashboard";

type Model = ReturnType<typeof useDashboard>;
export function DashboardActive({ model }: { model: Model }) {
  const { history, current, titleFor } = model;
  return (
    <section className={styles.activeSlot} aria-label="Lượt đang làm">
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Tiếp tục lượt thi</p>
        <Button
          variant="secondary"
          disabled={model.historyDenied || history.isFetching || model.historyWait > 0}
          onClick={() => void model.retryHistory()}
        >
          {model.historyWait
            ? `Tải lại sau ${model.historyWait} giây`
            : history.isFetching
              ? "Đang tải lượt thi…"
              : "Tải lại lượt thi"}
        </Button>
      </div>
      {history.isLoading ? <SkeletonLines /> : null}
      {history.error ? <ErrorPanel error={history.error} /> : null}
      {history.error && history.data ? (
        <Alert tone="warning" title="Dữ liệu từ lần tải trước">
          Lượt thi có thể đã thay đổi. Tải lại dữ liệu hoặc mở phòng thi để kiểm tra trạng thái hiện
          tại.
        </Alert>
      ) : null}
      {history.data && !current ? (
        <EmptyState
          title="Chưa có lượt đang làm trong dữ liệu đã tải"
          action={<Link to="/history">Xem lịch sử</Link>}
        >
          {history.data.next
            ? "Các lượt khác có thể nằm ở trang lịch sử tiếp theo. Bạn cũng có thể chọn đề để bắt đầu."
            : "Bạn có thể chọn một đề để bắt đầu lượt thi mới."}
        </EmptyState>
      ) : null}
      {current ? (
        <div className={styles.continue}>
          <div className={styles.continueCopy}>
            <div className={styles.meta}>
              <Badge>{statusLabel(current.status)}</Badge>
              <span>Bắt đầu {formatDateTime(current.startedAt)}</span>
            </div>
            <h2 id="continue-title">{titleFor(current)}</h2>
            <p className={styles.timeNotice}>
              Thời gian bài thi vẫn chạy khi rời trang. Quay lại phòng thi để xem thời gian còn lại
              và các câu đã lưu.
            </p>
            <ActionLink to={dashboardAttemptPath(current)}>
              Vào phòng thi <span aria-hidden="true">→</span>
            </ActionLink>
          </div>
          <div className={styles.art} aria-hidden="true">
            <ExamGlyph />
            <span className={styles.paperLine} />
            <span className={styles.paperLine} />
            <span className={styles.paperChoice}>✓</span>
          </div>
        </div>
      ) : null}
      {model.historyDenied ? <Link to="/help">Xem trợ giúp về truy cập</Link> : null}
    </section>
  );
}
export function DashboardRecent({ model }: { model: Model }) {
  return (
    <section aria-labelledby="recent-title" className={styles.recent}>
      <div className={styles.sectionHeading}>
        <h2 id="recent-title">Lượt gần đây</h2>
        <Link to="/history">
          Xem lịch sử <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className={styles.caption}>
        Tối đa 3 lượt khác trong 20 lượt được tải. Tên đề chỉ hiện khi đã mở đúng phiên bản.
      </p>
      {model.history.isLoading ? <SkeletonLines /> : null}
      {model.history.error && !model.history.data ? (
        <p className={styles.emptyRecent}>
          Chưa tải được lượt gần đây. Kiểm tra thông báo và nút tải lại phía trên.
        </p>
      ) : null}
      {model.history.data && model.recent.length === 0 ? (
        <p className={styles.emptyRecent}>Chưa có lượt khác trong dữ liệu đã tải.</p>
      ) : null}
      <ul className={styles.recentList}>
        {model.recent.map((item) => (
          <li key={item.attemptId}>
            <Link className={styles.recentRow} to={dashboardAttemptPath(item)}>
              <span className={styles.resultIcon} aria-hidden="true">
                {item.status === "COMPLETED" ? "✓" : "◷"}
              </span>
              <span className={styles.recentCopy}>
                <strong>{model.titleFor(item)}</strong>
                <small>
                  {statusLabel(item.status)} · {formatDateTime(item.startedAt)}
                  {item.expired ? " · Hết thời gian" : ""}
                </small>
              </span>
              <span className={styles.score}>
                {item.earned === null || item.possible === null
                  ? "Chưa có điểm"
                  : `${item.earned}/${item.possible} điểm`}{" "}
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
