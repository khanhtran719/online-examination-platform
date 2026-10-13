import { useMemory } from "@web/app/memory";
import { useTitle } from "@web/app/use-title";
import layout from "@web/shared/styles/layout.module.css";
import {
  ActionLink,
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TableScroll,
} from "@web/shared/ui/ui";

import { AttemptBadge, TableScore, TableTime } from "./result-table-elements";
import styles from "./result-tables.module.css";
import { useHistory } from "./use-result-pages";

export function HistoryPage() {
  useTitle("Lịch sử thi");
  const memory = useMemory(),
    c = useHistory(),
    { query, items, hidden } = c;
  return (
    <div className={`${layout.wrap} ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <h1>Lịch sử thi</h1>
          <p>Xem lại các lượt thi và tiếp tục bài đang làm.</p>
        </div>
        <Button
          variant="secondary"
          disabled={hidden || query.isFetching}
          onClick={() => void c.refresh()}
        >
          <span aria-hidden="true">↻</span> Làm mới
        </Button>
      </header>
      {hidden ? (
        <Alert title="Chưa thể đọc lịch sử">
          Quyền truy cập hoặc phiên đăng nhập cần được kiểm tra lại.
        </Alert>
      ) : null}
      {query.isLoading && !hidden ? <SkeletonLines /> : null}
      {query.error && !hidden ? (
        <ErrorPanel error={query.error} onRetry={() => void c.refresh()} />
      ) : null}
      {query.error && items.length ? (
        <p role="status">Đang giữ các lượt đã tải trước; danh sách có thể đã thay đổi.</p>
      ) : null}
      {query.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState
          title="Chưa có lượt thi"
          action={<ActionLink to="/exams">Tìm đề thi</ActionLink>}
        >
          Chọn một đề để bắt đầu lượt làm bài đầu tiên.
        </EmptyState>
      ) : null}
      {items.length > 0 ? (
        <section className={styles.card} aria-label="Các lượt thi đã tải">
          <p className={styles.scrollHint}>
            Cuộn ngang để xem đủ cột; khi chọn bảng, dùng phím mũi tên để cuộn.
          </p>
          <TableScroll label="Lịch sử các lượt thi">
            <table className={`${styles.table} ${styles.history}`}>
              <thead>
                <tr>
                  <th scope="col">Đề thi &amp; phiên bản</th>
                  <th scope="col">
                    Bắt đầu<small>Giờ Việt Nam · UTC+7</small>
                  </th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Điểm</th>
                  <th scope="col">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const meta = memory.lookup(item.publishedVersionId);
                  const frozen =
                    meta?.examId === item.examId &&
                    meta.publishedVersionId === item.publishedVersionId
                      ? meta
                      : null;
                  const active = item.status === "IN_PROGRESS" || item.status === "CREATED";
                  const completed = item.status === "COMPLETED";
                  const href = `/attempts/${item.attemptId}${active ? "" : completed ? "/result" : "/status"}`;
                  return (
                    <tr key={item.attemptId}>
                      <th scope="row">
                        <span className={styles.rowTitle}>
                          {frozen?.title ?? `Phiên bản …${item.publishedVersionId.slice(-6)}`}
                        </span>
                        <div className={styles.rowMeta}>
                          {frozen ? (
                            <span className={styles.version}>Bản {frozen.version}</span>
                          ) : null}
                          <span>Phiên bản …{item.publishedVersionId.slice(-6)}</span>
                          <span>Lượt …{item.attemptId.slice(-6)}</span>
                        </div>
                      </th>
                      <td>
                        <TableTime value={item.startedAt} />
                      </td>
                      <td>
                        <AttemptBadge item={item} />
                      </td>
                      <td>
                        <TableScore earned={item.earned} possible={item.possible} />
                      </td>
                      <td>
                        <ActionLink
                          className={styles.rowAction}
                          variant={active || completed ? "primary" : "secondary"}
                          to={href}
                        >
                          {active ? "Tiếp tục" : completed ? "Xem kết quả" : "Xem trạng thái"}
                        </ActionLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
          <footer className={styles.footer}>
            <p role="status">
              Đã tải {items.length} lượt thi{query.hasNextPage ? "" : " · Đã hết danh sách"}
            </p>
            {query.hasNextPage ? (
              <Button variant="secondary" disabled={query.isFetching} onClick={() => void c.more()}>
                {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : null}
          </footer>
        </section>
      ) : null}
      <div className={styles.footer}>
        <p className={styles.caption}>
          Tên đề chỉ hiện khi đã mở đúng phiên bản. Số lượt phản ánh phần đã tải.
        </p>
        <ActionLink variant="secondary" to="/exams">
          Chọn đề khác →
        </ActionLink>
      </div>
    </div>
  );
}
