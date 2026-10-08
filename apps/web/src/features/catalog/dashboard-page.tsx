import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { useMemory } from "../../app/memory";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import { useTitle } from "../../app/use-title";
import { CATEGORIES, type HistoryItem } from "../../shared/api/dto";
import { categoryLabel, formatDateTime, statusLabel } from "../../shared/format";
import { PaperArt } from "../../shared/ui/paper-art";
import { EmptyState, ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import layout from "../../shared/styles/layout.module.css";
import styles from "./catalog.module.css";

export function DashboardPage() {
  useTitle("Bảng làm việc");
  const { api } = useRuntime();
  const { profile } = useSession();
  const memory = useMemory();
  const history = useInfiniteQuery({
    queryKey: ["history", "dashboard"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.getHistory({ pageSize: 20, cursor: pageParam }).then((response) => response.data),
    getNextPageParam: (last) => last.next ?? undefined,
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
    <div className={layout.wrap}>
      <header className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>KHÔNG GIAN LÀM BÀI</p>
          <h1 className={layout.title}>Bảng làm việc</h1>
          <p className={styles.greeting}>
            Xin chào{profile?.displayName ? `, ${profile.displayName}` : ""}.
          </p>
          <p className={layout.muted}>Tiếp tục từ nơi bạn dừng lại, hoặc chọn một thử thách mới.</p>
          <Link className={styles.primaryLink} to="/exams">
            Khám phá đề thi <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className={styles.welcomeArt}>
          <PaperArt compact />
        </div>
      </header>
      <div className={styles.columns}>
        <div className={layout.stack}>
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
            <section className={`${styles.panel} ${styles.continue}`}>
              <div className={styles.sectionHeading}>
                <h2>Tiếp tục</h2>
                <span className={styles.badge}>{statusLabel(current.status)}</span>
              </div>
              <h3 className={styles.examTitle}>{titleFor(current)}</h3>
              <p className={layout.muted}>Bắt đầu {formatDateTime(current.startedAt)}</p>
              <p>Quay lại phòng thi để xem thời gian còn lại và các câu đã lưu.</p>
              <Link className={styles.primaryLink} to={`/attempts/${current.attemptId}`}>
                Vào phòng thi
              </Link>
            </section>
          ) : null}
          {history.isSuccess ? (
            <section className={styles.panel}>
              <div className={styles.sectionHeading}>
                <h2>Lượt gần đây</h2>
                <Link to="/history">
                  Xem lịch sử <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className={styles.caption}>
                Tối đa 3 lượt trong dữ liệu đã tải. Tên đề chỉ hiện khi đã mở đúng phiên bản.
              </p>
              {recent.length === 0 ? (
                <p className={layout.muted}>Chưa có lượt khác trong dữ liệu đã tải.</p>
              ) : (
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
                        <span>
                          <strong>{titleFor(item)}</strong>
                          <small>
                            {statusLabel(item.status)} · {formatDateTime(item.startedAt)}
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
              )}
            </section>
          ) : null}
        </div>
        <aside className={styles.panel}>
          <p className={styles.eyebrow}>BẮT ĐẦU TỪ ĐÂY</p>
          <h2>Chọn nhịp của bạn</h2>
          <p className={layout.muted}>Một danh mục phù hợp cho mục tiêu hôm nay.</p>
          <ul className={styles.categoryList}>
            {CATEGORIES.map((category) => (
              <li key={category}>
                <Link to={`/exams?category=${category}`}>
                  <span>{categoryLabel(category)}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
