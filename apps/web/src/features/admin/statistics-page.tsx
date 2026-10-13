import { Link, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { rateLabel } from "@web/shared/format";
import {
  Button,
  EmptyState,
  ErrorPanel,
  SkeletonLines,
  tableClass,
  TableScroll,
} from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminHeading, adminId, PageEnd } from "./admin-ui";
import { CapabilityGate } from "./gate";
import styles from "./operations.module.css";
import { useQuestionStatistics } from "./use-report-insights";

export function StatisticsPage() {
  const { examId = "", versionId = "" } = useParams();
  return <Statistics key={`${examId}:${versionId}`} examId={examId} versionId={versionId} />;
}
function Statistics({ examId, versionId }: { examId: string; versionId: string }) {
  useTitle("Thống kê câu hỏi");
  const c = useQuestionStatistics(examId, versionId),
    { query, items, hidden, refresh, more, selected } = c;
  return (
    <CapabilityGate permission="reporting.read">
      <div className={styles.page}>
        <AdminHeading
          title="Thống kê câu hỏi"
          eyebrow="QUẢN TRỊ / BÁO CÁO"
          description={`Đúng phiên bản đã khóa · ${adminId(versionId)}`}
        >
          <Link to={`/admin/exams/${examId}`}>Về đề →</Link>
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void refresh()}
          >
            Tải lại
          </Button>
        </AdminHeading>
        {query.isLoading ? <SkeletonLines /> : null}
        {query.error ? (
          <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void refresh()} />
        ) : null}
        {!hidden && query.data ? (
          <section className={admin.panel}>
            <div className={styles.scope}>
              <p>{items.length} câu đã tải</p>
              <p>Tỷ lệ mỗi câu dùng số lượt hoàn thành của chính câu đó.</p>
            </div>
            {items.length === 0 ? (
              <EmptyState title="Chưa có thống kê">
                Phiên bản này chưa có câu để thống kê.
              </EmptyState>
            ) : (
              <TableScroll label="Thống kê câu hỏi theo phiên bản">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {[
                        "Mã câu",
                        "Hoàn thành",
                        "Đúng",
                        "Sai",
                        "Chưa chọn",
                        "Tỷ lệ đúng",
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
                      <tr
                        key={r.questionId}
                        className={
                          selected?.questionId === r.questionId ? styles.selected : undefined
                        }
                      >
                        <td className={styles.code}>{adminId(r.questionId)}</td>
                        <td>{r.completedAttempts}</td>
                        <td>{r.correct}</td>
                        <td>{r.incorrect}</td>
                        <td>{r.unanswered}</td>
                        <td>
                          {r.completedAttempts
                            ? `${r.correct} / ${r.completedAttempts} lượt · ${rateLabel(r.correct, r.completedAttempts)}`
                            : "Chưa có mẫu"}
                        </td>
                        <td>
                          <Button
                            variant="secondary"
                            aria-pressed={selected?.questionId === r.questionId}
                            onClick={() => c.setSelectedId(r.questionId)}
                          >
                            Xem lựa chọn
                          </Button>
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
        {selected ? (
          <section className={admin.panel}>
            <div className={styles.scope}>
              <h2>Lượt lựa chọn · Câu {adminId(selected.questionId)}</h2>
              <p>Tổng lượt lựa chọn: {selected.options.reduce((n, o) => n + o.selectedCount, 0)}</p>
            </div>
            <p>
              Một bài có thể chọn nhiều lựa chọn; tổng lượt chọn có thể vượt số bài. Mỗi thanh có
              trục từ 0 đến {selected.completedAttempts} lượt hoàn thành.
            </p>
            {selected.completedAttempts === 0 ? <p>Chưa có mẫu</p> : null}
            <TableScroll label="Lượt lựa chọn của câu đã chọn">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th scope="col">Mã lựa chọn</th>
                    <th scope="col">Số lần chọn</th>
                    <th scope="col">Theo số lượt hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.options.map((o) => (
                    <tr key={o.optionId}>
                      <td className={styles.code}>{adminId(o.optionId)}</td>
                      <td>{o.selectedCount}</td>
                      <td>
                        {selected.completedAttempts > 0 ? (
                          <span
                            className={styles.bar}
                            role="img"
                            aria-label={`${o.selectedCount} trên ${selected.completedAttempts} lượt`}
                          >
                            <span
                              style={{
                                width: `${(o.selectedCount / selected.completedAttempts) * 100}%`,
                              }}
                            />
                          </span>
                        ) : (
                          "Chưa có mẫu"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </section>
        ) : null}
      </div>
    </CapabilityGate>
  );
}
