import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import { useProtectedAccess } from "../../shared/protected-access";
import { CapabilityGate, useCapability } from "./gate";
import styles from "./admin.module.css";
import { formatDateTime } from "../../shared/format";
import { ErrorPanel, SkeletonLines } from "../../shared/ui/ui";
import { AdminHeading } from "./admin-ui";
import { useQuery } from "@tanstack/react-query";

export function MetricsPage() {
  useTitle("Số liệu hệ thống");
  const gate = useCapability("system.metrics.read");
  const { api } = useRuntime();
  const [blocked, setBlocked] = useState(false);
  const metrics = useQuery({
    queryKey: ["metrics"],
    enabled: gate === "allowed" && !blocked,
    queryFn: () => api.getSystemBusinessMetrics().then((response) => response.data),
  });
  const hidden = useProtectedAccess(metrics.error, [["metrics"]], blocked, () => setBlocked(true));
  return (
    <CapabilityGate permission="system.metrics.read">
      <AdminHeading
        title="Số liệu"
        eyebrow="SNAPSHOT HỆ THỐNG"
        description="Một mốc dữ liệu máy chủ trả về. Các chỉ số chưa có được ghi rõ bên dưới."
      />
      {metrics.isLoading ? <SkeletonLines /> : null}
      {metrics.error ? (
        <ErrorPanel
          error={metrics.error}
          onRetry={hidden ? undefined : () => void metrics.refetch()}
        />
      ) : null}
      {!hidden && metrics.data ? (
        <>
          <p className={styles.caption}>
            Mốc snapshot mẫu: {formatDateTime(metrics.data.asOf)}. Đây không phải số đo production.
          </p>
          <dl className={styles.statGrid}>
            {[
              ["Đang làm", metrics.data.activeCandidates],
              ["Đã nộp", metrics.data.submitted],
              ["Hoàn thành", metrics.data.completed],
              ["Thất bại", metrics.data.failed],
            ].map(([label, count]) => (
              <div key={label} className={styles.stat} data-warning={label === "Thất bại"}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.split}>
            <section className={styles.panel}>
              <h2>Vận hành</h2>
              <dl className={styles.facts}>
                <div>
                  <dt>Yêu cầu mỗi giây</dt>
                  <dd>{metrics.data.httpRps}</dd>
                </div>
                <div>
                  <dt>HTTP p95</dt>
                  <dd>{metrics.data.httpP95Ms} ms</dd>
                </div>
                <div>
                  <dt>Hàng đợi</dt>
                  <dd>{metrics.data.queueDepth}</dd>
                </div>
                <div>
                  <dt>Job cũ nhất</dt>
                  <dd>{metrics.data.oldestJobSeconds} giây</dd>
                </div>
              </dl>
            </section>
            <section className={styles.panel}>
              <h2>Chưa có dữ liệu</h2>
              <p>HTTP p99: Chưa có dữ liệu</p>
              <p>CPU: Chưa có dữ liệu</p>
              <p>RDS: Chưa có dữ liệu</p>
              <p>Redis: Chưa có dữ liệu</p>
              <p>Chi phí: Chưa có dữ liệu</p>
            </section>
          </div>
        </>
      ) : null}
    </CapabilityGate>
  );
}
