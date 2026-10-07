import { Link, Navigate, Outlet, useLocation } from "react-router";
import { safeReturnPath } from "../shared/format";
import { ErrorPanel, SkeletonLines } from "../shared/ui/ui";
import type { NavItem } from "../shared/ui/navigation";
import styles from "../shared/styles/layout.module.css";
import { useRuntime } from "./runtime";
import { useSession } from "./session";
import { WorkspaceFrame } from "./workspace-frame";
import { PublicFrame } from "../features/experience/public-chrome";

export function PublicShell() {
  return (
    <PublicFrame>
      <Outlet />
    </PublicFrame>
  );
}

export function RequireAuth() {
  const session = useSession();
  const location = useLocation();
  if (session.status === "loading") return <SkeletonLines />;
  if (session.status === "unavailable") {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Không kết nối được phiên</h1>
        <ErrorPanel error={session.error} onRetry={() => void session.reload()} />
        <Link className={styles.chip} to="/">
          Về trang chủ
        </Link>
      </div>
    );
  }
  if (session.status !== "authenticated") {
    const back = safeReturnPath(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?return=${encodeURIComponent(back)}`} replace />;
  }
  return <Outlet />;
}

const ADMIN_PERMISSIONS = [
  "catalog.manage",
  "catalog.keys.read",
  "catalog.import",
  "reporting.read",
  "assessment.review.admin",
  "assessment.replay",
  "audit.read",
  "system.metrics.read",
] as const;

export function CandidateShell() {
  const { mode, demo } = useRuntime();
  const showAdmin =
    mode === "demo" &&
    demo?.permissions.some((permission) =>
      ADMIN_PERMISSIONS.includes(permission as (typeof ADMIN_PERMISSIONS)[number]),
    );
  const items: NavItem[] = [
    { to: "/dashboard", label: "Bảng làm việc", icon: "grid" },
    { to: "/exams", label: "Đề thi", icon: "paper" },
    { to: "/history", label: "Lịch sử", icon: "clock" },
    { to: "/profile", label: "Hồ sơ", icon: "person" },
    ...(showAdmin ? [{ to: "/admin", label: "Quản trị", icon: "shield" as const }] : []),
  ];
  return (
    <WorkspaceFrame items={items}>
      <Outlet />
    </WorkspaceFrame>
  );
}

export function ExamShell() {
  return (
    <div className={styles.examFrame}>
      <a className="skip-link" href="#content">
        Đi tới nội dung
      </a>
      <Outlet />
    </div>
  );
}
