import { NavLink, Outlet } from "react-router";

import { useRuntime } from "@web/app/runtime";
import { useTitle } from "@web/app/use-title";
import { WorkspaceFrame } from "@web/app/workspace-frame";
import type { Permission } from "@web/shared/api/dto";
import styles from "@web/shared/styles/layout.module.css";
import { Alert } from "@web/shared/ui/ui";

export { AdminHomePage } from "./admin-home-page";

const links = [
  ["/admin", "Tổng quan", "grid"],
  ["/admin/exams", "Đề thi", "paper"],
  ["/admin/questions", "Ngân hàng câu", "bank"],
  ["/admin/imports/new", "Nhập JSON", "upload"],
  ["/admin/monitor", "Giám sát", "activity"],
  ["/admin/metrics", "Số liệu", "chart"],
  ["/admin/audit", "Nhật ký", "log"],
] as const;

export function AdminLayout() {
  useTitle("Quản trị");
  const { mode, demo } = useRuntime();
  const adminPermissions: Permission[] = [
    "catalog.manage",
    "reporting.read",
    "audit.read",
    "system.metrics.read",
    "assessment.review.admin",
  ];
  const allowed =
    demo !== null && adminPermissions.some((permission) => demo.permissions.includes(permission));
  if (mode === "live" || !demo) {
    return (
      <WorkspaceFrame
        section="Quản trị"
        items={[{ to: "/dashboard", label: "Bảng làm việc", icon: "back" }]}
      >
        <div className={styles.wrap}>
          <h1 className={styles.title}>Quản trị</h1>
          <Alert tone="warning" title="Admin đang bị chặn">
            Hồ sơ không có danh sách quyền. Bản live không đoán quyền từ phiên đăng nhập.
          </Alert>
          <NavLink className={styles.chip} to="/dashboard">
            Về bảng làm việc
          </NavLink>
        </div>
      </WorkspaceFrame>
    );
  }
  if (!allowed) {
    return (
      <WorkspaceFrame
        section="Quản trị"
        items={[{ to: "/dashboard", label: "Bảng làm việc", icon: "back" }]}
      >
        <div className={styles.wrap}>
          <h1 className={styles.title}>Quản trị</h1>
          <Alert title="Preset này không có quyền quản trị">
            Hãy dùng preset Admin trong thanh dữ liệu mẫu nếu bạn đang xem demo.
          </Alert>
          <NavLink className={styles.chip} to="/dashboard">
            Về bảng làm việc
          </NavLink>
        </div>
      </WorkspaceFrame>
    );
  }
  const items = links
    .filter(([to]) => {
      if (to === "/admin") return true;
      if (to === "/admin/exams" || to === "/admin/questions")
        return demo.permissions.includes("catalog.manage");
      if (to === "/admin/imports/new") return demo.permissions.includes("catalog.import");
      if (to === "/admin/monitor") return demo.permissions.includes("reporting.read");
      if (to === "/admin/metrics")
        return (
          demo.permissions.includes("reporting.read") ||
          demo.permissions.includes("system.metrics.read")
        );
      if (to === "/admin/audit") return demo.permissions.includes("audit.read");
      return false;
    })
    .map(([to, label, icon]) => ({ to, label, icon, end: to === "/admin" }));
  return (
    <WorkspaceFrame
      section="Quản trị"
      navLabel="Quản trị"
      items={[...items, { to: "/dashboard", label: "Về bảng làm việc", icon: "back" }]}
    >
      <div className={styles.wrap}>
        <div className={styles.stack}>
          <Outlet />
        </div>
      </div>
    </WorkspaceFrame>
  );
}
