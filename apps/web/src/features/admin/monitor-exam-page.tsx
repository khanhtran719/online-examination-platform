import { Link, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatDateTime, statusLabel } from "@web/shared/format";
import {
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
import { useMonitorExam } from "./use-operations";

export function MonitorExamPage() {
  const { examId = "" } = useParams();
  return <MonitorExam key={examId} examId={examId} />;
}
function MonitorExam({ examId }: { examId: string }) {
  useTitle("Giám sát đề thi");
  const { query, items, hidden, refresh, more } = useMonitorExam(examId);
  return (
    <CapabilityGate permission="reporting.read">
      <div className={styles.page}>
        <AdminHeading
          title="Giám sát đề thi"
          eyebrow="QUẢN TRỊ / GIÁM SÁT"
          description={`Đề ${adminId(examId)} · Lượt đang làm qua các phiên bản của đề.`}
        >
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void refresh()}
          >
            Tải lại
          </Button>
          <Link to={`/admin/exams/${examId}/submissions`}>Bài đã nộp →</Link>
        </AdminHeading>
        {!hidden && query.data ? (
          <div className={styles.scope}>
            <p>Mốc máy chủ của trang đầu: {formatDateTime(query.data.pages[0]!.asOf)} · UTC+7</p>
            <p>Tự tải lại khi trang đang hiển thị. Mỗi trang có mốc đọc riêng.</p>
          </div>
        ) : null}
        {query.isLoading ? <SkeletonLines /> : null}
        {query.error ? (
          <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void refresh()} />
        ) : null}
        {!hidden && query.data ? (
          <section className={admin.panel}>
            <h2>Đang làm bài</h2>
            <p>
              {items.length} lượt đã tải. Trạng thái lượt thi không thể hiện tình trạng trực tuyến.
              Tải lại sẽ đọc từ đầu.
            </p>
            {items.length === 0 ? (
              <EmptyState title="Không có thí sinh đang làm">
                Không có lượt đang làm còn hạn tại mốc đọc này.
              </EmptyState>
            ) : (
              <TableScroll label="Thí sinh đang làm">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {[
                        "Mã thí sinh",
                        "Mã lượt",
                        "Trạng thái",
                        "Bắt đầu",
                        "Hạn nộp",
                        "Chi tiết",
                      ].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.attemptId}>
                        <td className={styles.code}>{adminId(r.candidateId)}</td>
                        <td className={styles.code}>{adminId(r.attemptId)}</td>
                        <td>
                          <AdminBadge tone="success">{statusLabel(r.status)}</AdminBadge>
                        </td>
                        <td>{formatDateTime(r.startedAt)}</td>
                        <td>{formatDateTime(r.deadline)}</td>
                        <td>
                          <Link to={`/admin/attempts/${r.attemptId}`}>Xem lượt →</Link>
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
