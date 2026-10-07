import { useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router";
import { safeReturnPath } from "../shared/format";
import { Button, Dialog, ErrorPanel, SkeletonLines } from "../shared/ui/ui";
import styles from "../shared/styles/layout.module.css";
import { useRuntime } from "./runtime";
import { useSession } from "./session";
import { PublicFrame } from "../features/experience/public-chrome";

function Brand() {
  return (
    <Link className={styles.brand} to="/">
      <svg className={styles.brandMark} viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="8" cy="8" r="1.1" fill="currentColor" />
        <circle cx="8" cy="12" r="1.1" fill="currentColor" />
        <circle cx="8" cy="16" r="1.1" fill="currentColor" />
        <path
          d="M12 8h6M12 12h6M12 16h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Exam Platform
    </Link>
  );
}

function NavLinks({
  links,
  open,
  id,
}: {
  links: { to: string; label: string }[];
  open: boolean;
  id?: string;
}) {
  return (
    <nav id={id} className={open ? styles.navOpen : styles.nav} aria-label="Chính">
      {links.map((link) => (
        <NavLink key={link.to} className={styles.navLink} to={link.to}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Header({ links, extra }: { links: { to: string; label: string }[]; extra?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <Button
          className={styles.menuButton}
          variant="secondary"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Đóng menu" : "Menu"}
        </Button>
        <NavLinks links={links} open={false} />
        {extra}
      </div>
      {open ? (
        <div className={styles.headerInner}>
          <NavLinks links={links} open id="site-nav" />
        </div>
      ) : null}
    </header>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <p className={styles.muted}>
          Giao diện tĩnh. Demo chạy được không có nghĩa là hệ thống đã sẵn sàng production.
        </p>
      </div>
    </footer>
  );
}

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
  const session = useSession();
  const { mode, demo } = useRuntime();
  const [confirming, setConfirming] = useState(false);
  const showAdmin =
    mode === "demo" &&
    demo?.permissions.some((permission) =>
      ADMIN_PERMISSIONS.includes(permission as (typeof ADMIN_PERMISSIONS)[number]),
    );
  const links = [
    { to: "/dashboard", label: "Bảng làm việc" },
    { to: "/exams", label: "Đề thi" },
    { to: "/history", label: "Lịch sử" },
    { to: "/profile", label: "Hồ sơ" },
    ...(showAdmin ? [{ to: "/admin", label: "Quản trị" }] : []),
  ];
  return (
    <div className={styles.frame}>
      <a className="skip-link" href="#content">
        Đi tới nội dung
      </a>
      <Header
        links={links}
        extra={
          <Button
            variant="secondary"
            onClick={() => (session.hasUnconfirmed ? setConfirming(true) : void session.logout())}
          >
            Đăng xuất
          </Button>
        }
      />
      {session.logoutError ? (
        <div className={styles.wrap}>
          <p role="status">{session.logoutError}</p>
        </div>
      ) : null}
      <main id="content" className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      {confirming ? (
        <Dialog
          title="Đăng xuất khi còn thay đổi chưa xác nhận"
          onClose={() => setConfirming(false)}
        >
          <p>Một số đáp án chưa được máy chủ xác nhận. Đăng xuất sẽ xóa chúng khỏi trình duyệt.</p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Ở lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirming(false);
                void session.logout();
              }}
            >
              Vẫn đăng xuất
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
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
