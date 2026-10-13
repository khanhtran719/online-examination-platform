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
  TextField,
} from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminBadge, AdminHeading, adminId, PageEnd } from "./admin-ui";
import { CapabilityGate } from "./gate";
import styles from "./operations.module.css";
import { useSubmissions } from "./use-operations";

export function SubmissionsPage() {
  const { examId = "" } = useParams();
  return <Submissions key={examId} examId={examId} />;
}
function Submissions({ examId }: { examId: string }) {
  useTitle("Bài đã nộp");
  const c = useSubmissions(examId),
    { query, items, hidden, refresh, more } = c;
  return (
    <CapabilityGate permission="reporting.read">
      <div className={styles.page}>
        <AdminHeading
          title="Bài đã nộp"
          eyebrow="QUẢN TRỊ / GIÁM SÁT / LƯỢT THI"
          description={`Đề ${adminId(examId)} · Danh sách lượt của đề; có thể gồm lượt chưa nộp.`}
        >
          <Link to={`/admin/exams/${examId}/monitor`}>← Giám sát</Link>
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void refresh()}
          >
            Tải lại
          </Button>
        </AdminHeading>
        <section className={admin.panel}>
          <form
            className={styles.filter}
            onSubmit={(e) => {
              e.preventDefault();
              c.apply();
            }}
          >
            <TextField
              label="Lọc theo phiên bản đã phát hành"
              value={c.draft}
              disabled={hidden}
              onChange={(e) => c.setDraft(e.target.value)}
            />
            <Button type="submit" disabled={hidden || query.isFetching}>
              Áp dụng bộ lọc
            </Button>
          </form>
          {c.error ? <p role="alert">{c.error}</p> : null}
          {!hidden ? (
            <p>
              {c.version
                ? `Đang lọc phiên bản ${adminId(c.version)}.`
                : "Đang đọc mọi phiên bản của đề."}
            </p>
          ) : null}
        </section>
        {query.isLoading ? <SkeletonLines /> : null}
        {query.error ? (
          <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void refresh()} />
        ) : null}
        {!hidden && query.data ? (
          <section className={admin.panel}>
            <div className={styles.scope}>
              <p>{items.length} lượt đã tải</p>
              <p>Tải lúc {formatDateTime(new Date(query.dataUpdatedAt).toISOString())} · UTC+7</p>
            </div>
            {items.length === 0 ? (
              <EmptyState title="Chưa có lượt thi">
                Không có lượt trong phạm vi đang đọc.
              </EmptyState>
            ) : (
              <TableScroll label="Bài đã nộp theo phiên bản">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {[
                        "Mã thí sinh",
                        "Mã lượt",
                        "Trạng thái",
                        "Phiên bản",
                        "Nộp lúc",
                        "Điểm",
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
                          <AdminBadge
                            tone={
                              r.status === "FAILED" || r.expired
                                ? "warning"
                                : r.status === "COMPLETED"
                                  ? "success"
                                  : "neutral"
                            }
                          >
                            {statusLabel(r.status)}
                          </AdminBadge>
                          {r.expired ? <span className={admin.rowSub}>Nộp khi hết giờ</span> : null}
                        </td>
                        <td className={styles.code}>{adminId(r.publishedVersionId)}</td>
                        <td>{r.submittedAt ? formatDateTime(r.submittedAt) : "Chưa có giờ nộp"}</td>
                        <td>
                          {r.earned === null || r.possible === null
                            ? "Chưa có điểm"
                            : `${r.earned}/${r.possible}`}
                        </td>
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
