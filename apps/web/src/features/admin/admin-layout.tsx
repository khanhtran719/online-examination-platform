import { Link, NavLink, Outlet } from "react-router";
import { WorkspaceFrame } from "../../app/workspace-frame";
import { useRuntime } from "../../app/runtime";
import { useTitle } from "../../app/use-title";
import type { Permission } from "../../shared/api/dto";
import { Alert } from "../../shared/ui/ui";
import { PaperArt } from "../../shared/ui/paper-art";
import { AdminHeading } from "./admin-ui";
import adminStyles from "./admin.module.css";
import styles from "../../shared/styles/layout.module.css";

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
      if (to === "/admin/metrics") return demo.permissions.includes("system.metrics.read");
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

export function AdminHomePage() {
  useTitle("Tổng quan quản trị");
  const { demo } = useRuntime();
  const tasks: { to: string; title: string; copy: string; permission: Permission }[] = [
    {
      to: "/admin/exams",
      title: "Soạn và phát hành đề",
      copy: "Tổ chức các phần, chọn câu và kiểm tra bản nháp trước khi mở thi.",
      permission: "catalog.manage",
    },
    {
      to: "/admin/questions",
      title: "Ngân hàng câu hỏi",
      copy: "Biên soạn lựa chọn, điểm và đáp án trong một không gian rõ ràng.",
      permission: "catalog.manage",
    },
    {
      to: "/admin/monitor",
      title: "Theo dõi các lượt thi",
      copy: "Xem lượt đang làm, bài đã nộp và kết quả theo từng phiên bản.",
      permission: "reporting.read",
    },
    {
      to: "/admin/imports/new",
      title: "Nhập câu từ JSON",
      copy: "Kiểm tra tệp, đọc lỗi từng dòng rồi xác nhận ghi vào ngân hàng.",
      permission: "catalog.import",
    },
  ];
  return (
    <>
      <AdminHeading
        title="Quản trị đề và kết quả"
        eyebrow="KHÔNG GIAN QUẢN TRỊ"
        description="Từ câu hỏi đầu tiên đến phiên bản sẵn sàng cho kỳ thi."
      />
      <section className={adminStyles.welcome}>
        <div>
          <p className={adminStyles.eyebrow}>MỘT KỲ THI TỐT BẮT ĐẦU TỪ ĐÂY</p>
          <h2>
            Chuẩn bị rõ ràng.
            <br />
            Phát hành tự tin.
          </h2>
          <p>
            Giữ bản nháp linh hoạt, khóa nội dung khi phát hành và theo dõi từng lượt thi từ một
            nơi.
          </p>
        </div>
        <div>
          <PaperArt compact />
        </div>
      </section>
      <nav className={adminStyles.shortcuts} aria-label="Công việc quản trị">
        {tasks
          .filter((task) => demo?.permissions.includes(task.permission))
          .map((task) => (
            <Link key={task.to} className={adminStyles.shortcut} to={task.to}>
              <span className={adminStyles.shortcutTitle}>
                {task.title}
                <span aria-hidden="true">↗</span>
              </span>
              <p>{task.copy}</p>
            </Link>
          ))}
      </nav>
    </>
  );
}
