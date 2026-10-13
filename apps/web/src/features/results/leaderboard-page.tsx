import { Link, useParams } from "react-router";

import { useMemory } from "@web/app/memory";
import { useTitle } from "@web/app/use-title";
import layout from "@web/shared/styles/layout.module.css";
import {
  ActionLink,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  TableScroll,
} from "@web/shared/ui/ui";

import { TableScore, TableTime } from "./result-table-elements";
import styles from "./result-tables.module.css";
import { useLeaderboard } from "./use-result-pages";

export function LeaderboardPage() {
  const { examId = "", versionId = "" } = useParams();
  return <VersionBoard key={`${examId}/${versionId}`} examId={examId} versionId={versionId} />;
}

function VersionBoard({ examId, versionId }: { examId: string; versionId: string }) {
  useTitle("Bảng xếp hạng");
  const memory = useMemory(),
    c = useLeaderboard(examId, versionId),
    { query, items, hidden } = c;
  const meta = hidden ? null : memory.lookup(versionId);
  const frozen = meta?.examId === examId && meta.publishedVersionId === versionId ? meta : null;
  return (
    <div className={`${layout.wrap} ${styles.page}`}>
      <Link className={styles.back} to={`/exams/${examId}`}>
        ← Quay lại Chi tiết đề
      </Link>
      <header className={styles.header}>
        <div>
          <h1>Bảng xếp hạng</h1>
          {!hidden ? (
            <p>
              {frozen?.title ?? `Phiên bản …${versionId.slice(-6)}`}{" "}
              {frozen ? <span className={styles.version}>Bản {frozen.version}</span> : null}
            </p>
          ) : null}
        </div>
        <Button
          variant="secondary"
          disabled={hidden || query.isFetching}
          onClick={() => void c.refresh()}
        >
          <span aria-hidden="true">↻</span> Làm mới
        </Button>
      </header>
      <aside className={styles.privacy} aria-label="Quyền riêng tư bảng xếp hạng">
        <span className={styles.privacyIcon} aria-hidden="true">
          i
        </span>
        <p>
          Khi tham gia, kết quả tốt nhất của bạn có thể xuất hiện với bí danh. Xem trang không đồng
          nghĩa với tự động ghi danh.
        </p>
        <ActionLink variant="secondary" to="/profile">
          Quản lý tham gia →
        </ActionLink>
      </aside>
      {query.isLoading && !hidden ? <SkeletonLines /> : null}
      {hidden ? (
        <EmptyState
          title="Bảng xếp hạng không mở"
          action={
            <ActionLink variant="secondary" to="/history">
              Về lịch sử
            </ActionLink>
          }
        >
          Phiên bản này không công bố bảng, hoặc bạn không có quyền xem.
        </EmptyState>
      ) : null}
      {query.error && !hidden ? (
        <ErrorPanel error={query.error} onRetry={() => void c.refresh()} />
      ) : null}
      {query.error && items.length ? (
        <p role="status">Đang giữ các kết quả đã tải trước; bảng có thể đã thay đổi.</p>
      ) : null}
      {query.isSuccess && !hidden && items.length === 0 ? (
        <EmptyState title="Chưa có dòng nào">
          Chưa có bài hoàn thành nào được đưa vào bảng.
        </EmptyState>
      ) : null}
      {items.length ? (
        <section className={styles.card} aria-label="Kết quả xếp hạng đã tải">
          <TableScroll label="Xếp hạng bằng bí danh">
            <table className={`${styles.table} ${styles.board}`}>
              <thead>
                <tr>
                  <th scope="col">Hạng</th>
                  <th scope="col">Bí danh</th>
                  <th scope="col">Điểm đạt / tối đa</th>
                  <th scope="col">
                    Hoàn thành lúc<small>Giờ Việt Nam · UTC+7</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={`${row.rank}-${row.pseudonym}`}>
                    <td>
                      <span className={styles.rank} data-rank={row.rank}>
                        {String(row.rank).padStart(2, "0")}
                      </span>
                    </td>
                    <th scope="row">
                      <span className={styles.alias}>{row.pseudonym}</span>
                    </th>
                    <td>
                      <TableScore earned={row.earned} possible={row.possible} />
                    </td>
                    <td>
                      <TableTime value={row.completedAt} seconds />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <footer className={styles.footer}>
            <p role="status">
              Đã tải {items.length} kết quả{query.hasNextPage ? "" : " · Đã hết danh sách"}
            </p>
            {query.hasNextPage ? (
              <Button variant="secondary" disabled={query.isFetching} onClick={() => void c.more()}>
                {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </Button>
            ) : null}
          </footer>
        </section>
      ) : null}
      {!hidden ? (
        <p className={styles.caption}>
          Điểm và thứ hạng thuộc phiên bản này. Chỉ hiển thị bí danh; không đánh dấu dòng của bạn.
        </p>
      ) : null}
    </div>
  );
}
