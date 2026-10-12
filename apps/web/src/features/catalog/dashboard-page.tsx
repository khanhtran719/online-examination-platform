import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { CATEGORIES } from "@web/shared/api/dto";
import { categoryLabel, formatDateTime, formatDuration, statusLabel } from "@web/shared/format";
import layout from "@web/shared/styles/layout.module.css";
import { ExamGlyph } from "@web/shared/ui/brand";
import { ActionLink, Badge, EmptyState, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./dashboard.module.css";
import { useDashboard } from "./use-dashboard";

export function DashboardPage() {
  useTitle("Bảng làm việc");
  const { profile, category, setCategory, history, catalog, current, recent, titleFor } =
    useDashboard();
  return (
    <div className={`${layout.wrap} ${styles.dashboard}`}>
      <header className={styles.greeting}>
        <div>
          <p className={styles.eyebrow}>KHÔNG GIAN LÀM BÀI</p>
          <h1 className={layout.title}>Bảng làm việc</h1>
          <p className={layout.muted}>
            Xin chào{profile?.displayName ? `, ${profile.displayName}` : ""}. Sẵn sàng cho câu hỏi
            tiếp theo?
          </p>
        </div>
        <ActionLink variant="secondary" to="/exams">
          Khám phá đề thi <span aria-hidden="true">↗</span>
        </ActionLink>
      </header>
      <div className={styles.columns}>
        <div className={styles.activeSlot}>
          {history.isLoading ? <SkeletonLines /> : null}
          {history.error ? (
            <ErrorPanel error={history.error} onRetry={() => void history.refetch()} />
          ) : null}
          {history.isSuccess && !current ? (
            <EmptyState
              title="Chưa có lượt đang làm trong dữ liệu đã tải"
              action={
                <Link className={layout.chip} to="/history">
                  Xem lịch sử
                </Link>
              }
            >
              Các lượt khác có thể nằm ở trang lịch sử tiếp theo. Bạn cũng có thể chọn đề để bắt
              đầu.
            </EmptyState>
          ) : null}
          {current ? (
            <section className={styles.continue} aria-labelledby="continue-title">
              <div className={styles.continueCopy}>
                <div className={styles.meta}>
                  <Badge>{statusLabel(current.status)}</Badge>
                  <span>Bắt đầu {formatDateTime(current.startedAt)}</span>
                </div>
                <h2 id="continue-title">{titleFor(current)}</h2>
                <p className={styles.timeNotice}>
                  Thời gian bài thi vẫn chạy khi rời trang. Quay lại phòng thi để xem thời gian còn
                  lại và các câu đã lưu.
                </p>
                <ActionLink to={`/attempts/${current.attemptId}`}>
                  Vào phòng thi <span aria-hidden="true">→</span>
                </ActionLink>
              </div>
              <div className={styles.art} aria-hidden="true">
                <ExamGlyph />
                <span className={styles.paperLine} />
                <span className={styles.paperLine} />
                <span className={styles.paperChoice}>✓</span>
              </div>
            </section>
          ) : null}
        </div>
        <aside className={styles.guide} aria-labelledby="guide-title">
          <div className={styles.guideHeading}>
            <span className={styles.guideIcon} aria-hidden="true">
              <ExamGlyph />
            </span>
            <h2 id="guide-title">Một nhịp làm bài rõ ràng</h2>
          </div>
          <ol>
            <li>
              <strong>Chọn đáp án cho từng câu</strong>
              <p>Kiểm tra lựa chọn trước khi chuyển sang câu tiếp theo.</p>
            </li>
            <li>
              <strong>Đánh dấu để xem lại</strong>
              <p>Quay lại các câu cần cân nhắc trước khi nộp.</p>
            </li>
            <li>
              <strong>Kiểm tra trạng thái lưu</strong>
              <p>Chờ máy chủ xác nhận đáp án rồi nộp bài.</p>
            </li>
          </ol>
          <Link to="/how-it-works">
            Xem hướng dẫn <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
      <section aria-labelledby="recent-title" className={styles.recent}>
        <div className={styles.sectionHeading}>
          <h2 id="recent-title">Lượt gần đây</h2>
          <Link to="/history">
            Xem lịch sử <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.caption}>
          Tối đa 3 lượt trong dữ liệu đã tải. Tên đề chỉ hiện khi đã mở đúng phiên bản.
        </p>
        {history.isSuccess && recent.length === 0 ? (
          <p className={styles.emptyRecent}>Chưa có lượt khác trong dữ liệu đã tải.</p>
        ) : null}
        <ul className={styles.recentList}>
          {recent.map((item) => (
            <li key={item.attemptId}>
              <Link
                className={styles.recentRow}
                to={
                  item.status === "IN_PROGRESS" || item.status === "CREATED"
                    ? `/attempts/${item.attemptId}`
                    : `/attempts/${item.attemptId}/${item.status === "COMPLETED" ? "result" : "status"}`
                }
              >
                <span className={styles.resultIcon} aria-hidden="true">
                  {item.status === "COMPLETED" ? "✓" : "◷"}
                </span>
                <span className={styles.recentCopy}>
                  <small>
                    {statusLabel(item.status)} · {formatDateTime(item.startedAt)}
                  </small>
                  <strong>{titleFor(item)}</strong>
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
      <section className={styles.catalog} aria-labelledby="dashboard-catalog-title">
        <div className={styles.sectionHeading}>
          <h2 id="dashboard-catalog-title">Khám phá danh mục đề thi</h2>
          <Link to={category ? `/exams?category=${category}` : "/exams"}>
            Xem tất cả đề thi <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.filters} role="group" aria-label="Lọc danh mục đề thi">
          <button type="button" aria-pressed={!category} onClick={() => setCategory(undefined)}>
            Tất cả
          </button>
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {categoryLabel(value)}
            </button>
          ))}
        </div>
        {catalog.isLoading ? <SkeletonLines /> : null}
        {catalog.error ? (
          <ErrorPanel error={catalog.error} onRetry={() => void catalog.refetch()} />
        ) : null}
        {catalog.isSuccess && catalog.data.items.length === 0 ? (
          <EmptyState
            title="Chưa có đề thi trong danh mục này"
            action={
              <Link className={layout.chip} to="/exams">
                Xem danh sách đề thi
              </Link>
            }
          >
            Chọn một danh mục khác hoặc quay lại sau.
          </EmptyState>
        ) : null}
        <div className={styles.examGrid}>
          {catalog.data?.items.map((exam) => (
            <Link key={exam.id} className={styles.examCard} to={`/exams/${exam.id}`}>
              <div className={styles.cardTop}>
                <span className={styles.examIcon} aria-hidden="true">
                  <ExamGlyph />
                </span>
                <Badge>{categoryLabel(exam.category)}</Badge>
              </div>
              <h3>{exam.title}</h3>
              <p>
                {formatDuration(exam.durationSeconds)} · {exam.questionCount} câu hỏi
              </p>
              <span className={styles.cardAction}>
                Xem đề <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
