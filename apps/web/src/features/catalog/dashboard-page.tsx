import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { ExamGlyph } from "@web/shared/ui/brand";
import { ActionLink, Alert } from "@web/shared/ui/ui";

import styles from "./dashboard.module.css";
import { DashboardActive, DashboardRecent } from "./dashboard-attempts";
import { DashboardCatalog } from "./dashboard-catalog";
import { useDashboard } from "./use-dashboard";

export function DashboardPage() {
  useTitle("Bảng làm việc");
  const model = useDashboard();
  if (!model.visible)
    return (
      <div className={styles.dashboard}>
        <h1>Bảng làm việc</h1>
        <Alert tone="warning" title="Cần kiểm tra lại phiên">
          Dữ liệu riêng đã được ẩn. Đăng nhập lại để tiếp tục.
        </Alert>
        <Link to="/login?return=%2Fdashboard">Đăng nhập lại</Link>
      </div>
    );
  return (
    <div className={styles.dashboard}>
      <header className={styles.greeting}>
        <div>
          <p className={styles.eyebrow}>Không gian làm bài</p>
          <h1>Bảng làm việc</h1>
          <p>
            Xin chào{model.profile?.displayName ? `, ${model.profile.displayName}` : ""}. Sẵn sàng
            cho câu hỏi tiếp theo?
          </p>
        </div>
        <ActionLink variant="secondary" to="/exams">
          Khám phá đề thi <span aria-hidden="true">↗</span>
        </ActionLink>
      </header>
      <div className={styles.columns}>
        <DashboardActive model={model} />
        <aside className={styles.guide} aria-labelledby="guide-title">
          <div className={styles.guideHeading}>
            <span className={styles.guideIcon} aria-hidden="true">
              <ExamGlyph />
            </span>
            <h2 id="guide-title">Một nhịp làm bài rõ ràng</h2>
          </div>
          <ol>
            <li>
              <strong>Chọn đáp án cho từng câu</strong>
              <p>Kiểm tra lựa chọn trước khi chuyển sang câu tiếp theo.</p>
            </li>
            <li>
              <strong>Đánh dấu để xem lại</strong>
              <p>Quay lại các câu cần cân nhắc trước khi nộp.</p>
            </li>
            <li>
              <strong>Kiểm tra trạng thái lưu</strong>
              <p>Chờ máy chủ xác nhận đáp án rồi nộp bài.</p>
            </li>
          </ol>
          <Link to="/how-it-works">
            Xem hướng dẫn <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
      <DashboardRecent model={model} />
      <DashboardCatalog model={model} />
    </div>
  );
}
