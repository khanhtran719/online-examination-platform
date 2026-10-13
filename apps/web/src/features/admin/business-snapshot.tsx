import type { BusinessMetrics } from "@web/shared/api/dto";
import { formatDateTime } from "@web/shared/format";

import styles from "./operations.module.css";

export function BusinessScope({ data }: { data: BusinessMetrics }) {
  return (
    <div className={styles.scopeBox}>
      <p>Mốc dữ liệu máy chủ: {formatDateTime(data.asOf)} · Giờ Việt Nam (UTC+7)</p>
      <p>
        Lượt bắt đầu từ {formatDateTime(data.window.from)} đến trước{" "}
        {formatDateTime(data.window.to)}.
      </p>
      <p>
        Đếm lượt theo trạng thái hiện tại. Đã nộp bao gồm lượt đã hoàn thành hoặc xử lý thất bại;
        các số không cộng lại thành tổng.
      </p>
    </div>
  );
}
export function BusinessKpis({ data }: { data: BusinessMetrics }) {
  return (
    <dl className={styles.kpis}>
      {[
        ["Đang làm", data.counts.activeAttempts, "▷"],
        ["Đã nộp", data.counts.submittedAttempts, "▤"],
        ["Hoàn thành", data.counts.completedAttempts, "✓"],
        ["Thất bại", data.counts.failedAttempts, "!"],
      ].map(([label, count, icon]) => (
        <div className={styles.kpi} key={label} data-warning={label === "Thất bại"}>
          <span aria-hidden="true" className={styles.icon}>
            {icon}
          </span>
          <dt>{label}</dt>
          <dd>{count}</dd>
        </div>
      ))}
    </dl>
  );
}
