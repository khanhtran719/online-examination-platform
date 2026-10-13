import type { ImportEntry, ImportReport } from "@web/shared/api/dto";
import { formatDateTime } from "@web/shared/format";
import { Alert, tableClass, TableScroll } from "@web/shared/ui/ui";

import { questionTypeLabel } from "./admin-ui";
import styles from "./authoring.module.css";

export function ImportValidation({
  report,
  entries,
}: {
  report: ImportReport;
  entries: readonly ImportEntry[];
}) {
  return (
    <section className={styles.panel}>
      <Alert
        tone={report.valid ? "success" : "warning"}
        title={report.committed ? "Đã ghi ngân hàng" : "Chưa ghi ngân hàng"}
      >
        <p>
          {report.valid ? "Dữ liệu hợp lệ." : "Dữ liệu cần sửa."} Kiểm tra lúc{" "}
          {formatDateTime(report.createdAt)}.
        </p>
        <p>Mã báo cáo {report.id}</p>
      </Alert>
      <div className={styles.stats}>
        <div>
          <strong>{entries.length}</strong>câu trong dữ liệu
        </div>
        <div>
          <strong>1</strong>phiên bản dữ liệu
        </div>
        <div>
          <strong>{report.issues.length}</strong>lỗi kiểm tra
        </div>
      </div>
      <p className={styles.scope}>
        {Object.entries(questionTypeLabel)
          .map(([type, label]) => `${label}: ${entries.filter((q) => q.type === type).length}`)
          .join(" · ")}
      </p>
      {report.issues.length ? (
        <ul>
          {report.issues.map((issue, index) => (
            <li key={index}>
              {issue.clientRef} · {issue.field}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      <h2>Các câu đã kiểm tra</h2>
      <TableScroll label="Các câu đã kiểm tra">
        <table className={`${tableClass} ${styles.table}`}>
          <thead>
            <tr>
              <th scope="col">Câu hỏi</th>
              <th scope="col">Mã trong tệp</th>
              <th scope="col">Loại</th>
              <th scope="col">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((q) => (
              <tr key={q.clientRef}>
                <th scope="row">{q.prompt}</th>
                <td>{q.clientRef}</td>
                <td>{questionTypeLabel[q.type]}</td>
                <td>{q.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </section>
  );
}
