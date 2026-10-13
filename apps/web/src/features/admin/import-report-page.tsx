import { Link, useParams } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatDateTime } from "@web/shared/format";
import { ErrorPanel, SkeletonLines, tableClass, TableScroll } from "@web/shared/ui/ui";

import { AdminBadge, AdminHeading } from "./admin-ui";
import styles from "./authoring.module.css";
import { CapabilityGate } from "./gate";
import { useImportReport } from "./use-import-report";

export function ImportReportPage() {
  const { importId = "" } = useParams();
  useTitle("Báo cáo nhập");
  const { report, hidden, data, canEdit } = useImportReport(importId);
  return (
    <CapabilityGate permission="catalog.import">
      <AdminHeading title="Báo cáo nhập" eyebrow="NGÂN HÀNG CÂU">
        <Link to="/admin/imports/new">Nhập tệp khác</Link>
      </AdminHeading>
      {report.isLoading ? <SkeletonLines /> : null}
      {report.error ? (
        <ErrorPanel
          error={report.error}
          onRetry={hidden ? undefined : () => void report.refetch()}
        />
      ) : null}
      {data ? (
        <section className={styles.panel}>
          <AdminBadge tone={data.committed ? "success" : "warning"}>
            {data.committed ? "Đã ghi vào ngân hàng" : "Chưa ghi vào ngân hàng"}
          </AdminBadge>
          <dl className={styles.facts}>
            <div>
              <dt>Mã báo cáo</dt>
              <dd className={styles.scope}>{data.id}</dd>
            </div>
            <div>
              <dt>Dữ liệu hợp lệ</dt>
              <dd>{data.valid ? "Có" : "Không"}</dd>
            </div>
            <div>
              <dt>Tạo lúc</dt>
              <dd>{formatDateTime(data.createdAt)}</dd>
            </div>
            <div>
              <dt>Câu đã ghi trong báo cáo</dt>
              <dd>{data.questions.length}</dd>
            </div>
          </dl>
          <h2>Kết quả kiểm tra</h2>
          {data.issues.length === 0 ? (
            <p>Không có lỗi dòng.</p>
          ) : (
            <ul>
              {data.issues.map((issue, index) => (
                <li key={`${issue.clientRef}-${issue.field}-${index}`}>
                  {issue.clientRef} · {issue.field}: {issue.message}
                </li>
              ))}
            </ul>
          )}
          {data.questions.length ? (
            <TableScroll label="Các câu đã nhập">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th scope="col">Mã trong tệp</th>
                    <th scope="col">Câu trong ngân hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questions.map((question) => (
                    <tr key={question.questionId}>
                      <td>{question.clientRef}</td>
                      <td>
                        {canEdit ? (
                          <Link
                            className={styles.scope}
                            to={`/admin/questions/${question.questionId}/edit`}
                          >
                            {question.questionId}
                          </Link>
                        ) : (
                          <span>{question.questionId}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : null}
        </section>
      ) : null}
    </CapabilityGate>
  );
}
