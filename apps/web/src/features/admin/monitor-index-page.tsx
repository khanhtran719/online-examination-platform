import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { categoryLabel, formatDateTime, formatDuration } from "@web/shared/format";
import {
  Alert,
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  tableClass,
  TableScroll,
} from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminBadge, AdminHeading, adminId, PageEnd } from "./admin-ui";
import { CapabilityGate } from "./gate";
import styles from "./operations.module.css";
import { useMonitorIndex } from "./use-operations";

export function MonitorIndexPage() {
  useTitle("Giám sát");
  const { query, items, hidden, refresh, more, manage } = useMonitorIndex();
  return (
    <CapabilityGate permission="reporting.read">
      <div className={styles.page}>
        <AdminHeading
          title="Chọn đề để giám sát"
          eyebrow="QUẢN TRỊ / GIÁM SÁT"
          description="Mở một đề để xem lượt đang làm và bài nộp."
        >
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void refresh()}
          >
            Tải lại
          </Button>
        </AdminHeading>
        {manage !== "allowed" ? (
          <Alert title="Không liệt kê đề">
            Cần quyền quản lý đề để lấy danh sách. Người có quyền báo cáo vẫn có thể mở đường dẫn
            giám sát đã biết.
          </Alert>
        ) : null}
        {query.isLoading ? <SkeletonLines /> : null}
        {query.error ? (
          <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void refresh()} />
        ) : null}
        {!hidden && query.data ? (
          <section className={admin.panel}>
            <div className={styles.scope}>
              <h2>Đề thi</h2>
              <p>
                {items.length} đề đã tải · Tải lúc{" "}
                {formatDateTime(new Date(query.dataUpdatedAt).toISOString())} · UTC+7
              </p>
            </div>
            {items.length === 0 ? (
              <EmptyState title="Chưa có đề">Không có đề trong phần danh sách này.</EmptyState>
            ) : (
              <TableScroll label="Các đề cần giám sát">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {["Đề thi", "Trạng thái", "Bản sửa", "Lịch mở đề", "Theo dõi"].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span className={admin.rowTitle}>{e.title}</span>
                          <span className={admin.rowSub}>
                            {categoryLabel(e.category)} · {formatDuration(e.durationSeconds)}
                          </span>
                          <span className={admin.rowSub}>{adminId(e.id)}</span>
                        </td>
                        <td>
                          <AdminBadge tone={e.published ? "success" : "neutral"}>
                            {e.archived
                              ? "Đã lưu trữ"
                              : e.published
                                ? "Đang phát hành"
                                : "Bản nháp"}
                          </AdminBadge>
                        </td>
                        <td>{e.revision}</td>
                        <td>
                          {formatDateTime(e.openAt)}
                          <br />
                          {formatDateTime(e.closeAt)} · UTC+7
                        </td>
                        <td>
                          <Link to={`/admin/exams/${e.id}/monitor`}>Mở giám sát →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
            <PageEnd
              next={Boolean(query.hasNextPage)}
              loading={query.isFetching}
              onMore={() => void more()}
            />
          </section>
        ) : null}
      </div>
    </CapabilityGate>
  );
}
