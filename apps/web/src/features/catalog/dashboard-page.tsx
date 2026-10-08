import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import { useTitle } from "../../app/use-title";
import { CATEGORIES, type Category, type HistoryItem } from "../../shared/api/dto";
import { categoryLabel, formatDateTime, formatDuration, statusLabel } from "../../shared/format";
import { PaperArt } from "../../shared/ui/paper-art";
import { EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./dashboard.module.css";

export function DashboardPage() {
  useTitle("Bảng làm việc");
  const { api } = useRuntime();
  const { profile } = useSession();
  const memory = useMemory();
  const [category, setCategory] = useState<Category>();
  const history = useInfiniteQuery({
    queryKey: ["history", "dashboard"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const catalog = useQuery({
    queryKey: ["exams", "dashboard", category ?? "*"],
    queryFn: () => api.browseExams({ pageSize: 4, category }).then((response) => response.data),
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const current = items.find((item) => item.status === "IN_PROGRESS" || item.status === "CREATED");
  const recent = items.filter((item) => item !== current).slice(0, 3);
  function titleFor(item: HistoryItem) {
    const frozen = memory.lookup(item.publishedVersionId);
    return frozen && frozen.examId === item.examId
      ? frozen.title
      : `Phiên bản …${item.publishedVersionId.slice(-6)}`;
  }
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
        <Link className={styles.secondaryLink} to="/exams">
          Khám phá đề thi <span aria-hidden="true">↗</span>
        </Link>
      </header>
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
          Các lượt khác có thể nằm ở trang lịch sử tiếp theo. Bạn cũng có thể chọn đề để bắt đầu.
        </EmptyState>
      ) : null}
      {current ? (
        <section className={styles.continue} aria-labelledby="continue-title">
          <div className={styles.continueCopy}>
            <div className={styles.meta}>
              <span className={styles.badge}>{statusLabel(current.status)}</span>
              <span>Bắt đầu {formatDateTime(current.startedAt)}</span>
            </div>
            <h2 id="continue-title">{titleFor(current)}</h2>
            <p className={layout.muted}>
              Thời gian bài thi vẫn chạy khi rời trang. Quay lại phòng thi để xem thời gian còn lại
              và các câu đã lưu.
            </p>
            <Link className={styles.primaryLink} to={`/attempts/${current.attemptId}`}>
              Vào phòng thi <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.art}>
            <PaperArt compact />
          </div>
        </section>
      ) : null}
      <div className={styles.columns}>
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
        <aside className={styles.guide} aria-labelledby="guide-title">
          <span className={styles.guideIcon} aria-hidden="true">
            ≡
          </span>
          <p className={styles.eyebrow}>MỘT NHỊP LÀM BÀI RÕ RÀNG</p>
          <h2 id="guide-title">Tập trung vào từng câu.</h2>
          <p>Chọn đáp án, đánh dấu câu cần xem lại và kiểm tra trạng thái lưu trước khi nộp.</p>
          <Link to="/how-it-works">
            Xem hướng dẫn <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
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
                  ≡
                </span>
                <span className={styles.badge}>{categoryLabel(exam.category)}</span>
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
