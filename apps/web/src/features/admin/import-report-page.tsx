import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { Link, useParams } from "react-router";
import { formatDateTime } from "../../shared/format";
import { ErrorPanel, SkeletonLines, tableClass, TableScroll } from "../../shared/ui/ui";
import { AdminBadge, AdminHeading } from "./admin-ui";
import { useQuery } from "@tanstack/react-query";

export function ImportReportPage() {
  const { importId = "" } = useParams();
  useTitle("Báo cáo nhập");
  const gate = useCapability("catalog.import");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const report = useQuery({
    queryKey: ["import-report", importId],
    enabled: gate === "allowed" && !blocked,
    queryFn: () => api.getImportReport(importId).then((response) => response.data),
  });
  const hidden = useProtectedAccess(report.error, [["import-report", importId]], blocked, () =>
    setBlocked(true),
  );
  const data = hidden ? null : report.data;
  return (
    <CapabilityGate permission="catalog.import">
      <AdminHeading title="Báo cáo nhập" eyebrow="NGÂN HÀNG CÂU">
        <Link className={styles.primaryLink} to="/admin/imports/new">
          Nhập tệp khác
        </Link>
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
              <dd className={styles.code}>{data.id}</dd>
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
                        <Link
                          className={styles.code}
                          to={`/admin/questions/${question.questionId}/edit`}
                        >
                          {question.questionId}
                        </Link>
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
