import { Link } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { useTitle } from "@web/app/use-title";
import type { Permission } from "@web/shared/api/dto";
import { Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import admin from "./admin.module.css";
import { AdminHeading } from "./admin-ui";
import { BusinessKpis, BusinessScope } from "./business-snapshot";
import styles from "./operations.module.css";
import { useBusinessMetrics } from "./use-business-metrics";

const tasks: { to: string; title: string; copy: string; permission: Permission; icon: string }[] = [
  {
    to: "/admin/exams",
    title: "Soạn và phát hành đề",
    copy: "Tổ chức các phần, chọn câu và kiểm tra bản nháp trước khi mở thi.",
    permission: "catalog.manage",
    icon: "▤",
  },
  {
    to: "/admin/monitor",
    title: "Theo dõi các lượt thi",
    copy: "Chọn đề để xem lượt đang làm, bài nộp và kết quả.",
    permission: "reporting.read",
    icon: "↗",
  },
  {
    to: "/admin/questions",
    title: "Ngân hàng câu hỏi",
    copy: "Biên soạn lựa chọn, điểm và đáp án trong một không gian rõ ràng.",
    permission: "catalog.manage",
    icon: "▥",
  },
  {
    to: "/admin/imports/new",
    title: "Nhập câu từ JSON",
    copy: "Kiểm tra tệp và đọc lỗi trước khi ghi vào ngân hàng.",
    permission: "catalog.import",
    icon: "↑",
  },
];
export function AdminHomePage() {
  useTitle("Tổng quan quản trị");
  const { demo } = useRuntime(),
    metrics = useBusinessMetrics();
  return (
    <div className={styles.page}>
      <AdminHeading
        title="Tổng quan quản trị"
        eyebrow="QUẢN TRỊ / TỔNG QUAN"
        description="Chọn công việc và xem trạng thái các lượt thi."
      >
        {metrics.gate === "allowed" ? (
          <Button
            variant="secondary"
            disabled={metrics.hidden || metrics.query.isFetching}
            onClick={() => void metrics.query.refetch()}
          >
            Tải lại
          </Button>
        ) : null}
      </AdminHeading>
      {metrics.gate !== "allowed" ? (
        <Alert title="Chưa có quyền đọc báo cáo">
          Các công việc được hiển thị theo quyền hiện tại.
        </Alert>
      ) : null}
      {metrics.query.isLoading ? <SkeletonLines /> : null}
      {metrics.query.error ? (
        <ErrorPanel
          error={metrics.query.error}
          onRetry={metrics.hidden ? undefined : () => void metrics.query.refetch()}
        />
      ) : null}
      {metrics.query.error && metrics.data ? (
        <p role="status">Đang hiển thị snapshot lần tải thành công trước.</p>
      ) : null}
      {metrics.data ? (
        <section className={`${admin.panel} ${styles.snapshot}`}>
          <h2>Trạng thái lượt thi</h2>
          <BusinessScope data={metrics.data} />
          <BusinessKpis data={metrics.data} />
        </section>
      ) : null}
      <h2>Công việc quản trị</h2>
      <nav className={styles.grid} aria-label="Công việc quản trị">
        {tasks
          .filter((t) => demo?.permissions.includes(t.permission))
          .map((t) => (
            <Link key={t.to} to={t.to} className={styles.task}>
              <span className={styles.icon} aria-hidden="true">
                {t.icon}
              </span>
              <div>
                <h3>{t.title}</h3>
                <p>{t.copy}</p>
                <strong>Mở công việc →</strong>
              </div>
            </Link>
          ))}
      </nav>
    </div>
  );
}
