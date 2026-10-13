import { useTitle } from "@web/app/use-title";
import { formatDateTime } from "@web/shared/format";
import { Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminHeading } from "./admin-ui";
import { BusinessKpis, BusinessScope } from "./business-snapshot";
import { useCapability } from "./gate";
import styles from "./operations.module.css";
import { useBusinessMetrics } from "./use-business-metrics";

export function MetricsPage() {
  useTitle("Số liệu");
  const { query, hidden, data, gate } = useBusinessMetrics(),
    technical = useCapability("system.metrics.read");
  return (
    <div className={styles.page}>
      <AdminHeading
        title="Số liệu"
        eyebrow="QUẢN TRỊ / SỐ LIỆU"
        description="Snapshot nghiệp vụ và trạng thái nguồn đo"
      >
        {gate === "allowed" ? (
          <Button
            variant="secondary"
            disabled={hidden || query.isFetching}
            onClick={() => void query.refetch()}
          >
            Tải lại
          </Button>
        ) : null}
      </AdminHeading>
      {gate !== "allowed" ? (
        <Alert title="Chưa có quyền đọc báo cáo">
          Cần quyền đọc báo cáo để xem số liệu nghiệp vụ.
        </Alert>
      ) : null}
      {query.isLoading ? <SkeletonLines /> : null}
      {query.error ? (
        <ErrorPanel error={query.error} onRetry={hidden ? undefined : () => void query.refetch()} />
      ) : null}
      {query.error && data ? (
        <p role="status">Đang hiển thị snapshot lần tải thành công trước.</p>
      ) : null}
      {data ? (
        <>
          <BusinessScope data={data} />
          <BusinessKpis data={data} />
          <div className={styles.grid}>
            <section className={admin.panel}>
              <h2>Lượt trong cửa sổ đã chọn</h2>
              <p>Trạng thái hiện tại của lượt bắt đầu trong phạm vi trên.</p>
              <dl className={styles.facts}>
                {[
                  ["Đã bắt đầu", data.counts.startedAttempts],
                  ["Đang làm", data.counts.activeAttempts],
                  ["Đã nộp", data.counts.submittedAttempts],
                  ["Hoàn thành", data.counts.completedAttempts],
                  ["Thất bại", data.counts.failedAttempts],
                  ["Đã nộp khi hết hạn", data.counts.expiredSubmissions],
                  ["Hoàn thành khi hết hạn", data.counts.expiredCompletedAttempts],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{n}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className={admin.panel}>
              <h2>Chờ xử lý toàn hệ thống</h2>
              <p>
                Không giới hạn cửa sổ bên trái. Đây là các lượt thi, không phải độ sâu hàng đợi.
              </p>
              <dl className={styles.facts}>
                {[
                  ["Đang chờ", `${data.backlog.pendingAttempts} lượt`],
                  ["Yêu cầu xử lý lại", `${data.backlog.replayPendingAttempts} lượt`],
                  [
                    "Bài nộp cũ nhất",
                    data.backlog.oldestSubmittedAt
                      ? formatDateTime(data.backlog.oldestSubmittedAt)
                      : "Không có bài chờ",
                  ],
                  [
                    "Tuổi bài nộp cũ nhất",
                    data.backlog.oldestAgeSeconds === null
                      ? "Không có bài chờ"
                      : `${data.backlog.oldestAgeSeconds.toLocaleString("vi-VN")} giây`,
                  ],
                ].map(([label, n]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{n}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      ) : null}
      {technical === "allowed" ? (
        <div className={styles.grid}>
          {[
            ["HTTP", "Yêu cầu mỗi giây", "HTTP p95"],
            ["Hàng đợi", "Độ sâu hàng đợi", "Tuổi job cũ nhất"],
          ].map(([title, ...labels]) => (
            <section className={admin.panel} key={title}>
              <h2>{title}</h2>
              <dl className={styles.facts}>
                {labels.map((label) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>Chưa có dữ liệu</dd>
                  </div>
                ))}
              </dl>
              <p>Chưa có nguồn đo {title}.</p>
            </section>
          ))}
        </div>
      ) : (
        <Alert title="Chưa có quyền xem số liệu kỹ thuật">Số liệu kỹ thuật cần quyền riêng.</Alert>
      )}
    </div>
  );
}
