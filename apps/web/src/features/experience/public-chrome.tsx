import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useSession } from "../../app/session";
import styles from "./public.module.css";

export function PublicFrame({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.pathname;
  const immersive = location.pathname === "/" || location.pathname === "/experience";
  const links = [
    { to: "/experience", label: "Trải nghiệm" },
    { to: "/how-it-works", label: "Cách bắt đầu" },
    { to: "/help", label: "Trợ giúp" },
    ...(session.status === "authenticated"
      ? [
          { to: "/dashboard", label: "Bảng làm việc" },
          { to: "/exams", label: "Đề thi" },
        ]
      : [
          { to: "/login", label: "Đăng nhập" },
          { to: "/register", label: "Tạo tài khoản" },
        ]),
  ];
  return (
    <div className={styles.frame}>
      <a className="skip-link" href="#content">
        Đi tới nội dung
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/" aria-label="ExamPlatform — trang chủ">
            <span className={styles.brandMark} aria-hidden="true">
              e
            </span>
            <span>
              Exam<span className={styles.brandLight}>Platform</span>
            </span>
          </Link>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls="public-nav"
            onClick={() => setOpenAt(open ? null : location.pathname)}
          >
            {open ? "Đóng menu" : "Menu"}
          </button>
          <nav
            id="public-nav"
            className={`${styles.nav} ${open ? styles.navOpen : ""}`}
            aria-label="Chính"
          >
            {links.map((link, index) => (
              <NavLink
                className={index === links.length - 1 ? styles.headerCta : styles.navLink}
                key={link.to}
                to={link.to}
                onClick={() => setOpenAt(null)}
              >
                {link.label}
                {index === links.length - 1 ? <span aria-hidden="true">↗</span> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="content" className={immersive ? styles.immersiveMain : styles.standardMain}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div>
          <span>ExamPlatform · Vào nhịp thi</span>
          <nav aria-label="Thông tin">
            <Link to="/help">Trợ giúp</Link>
            <Link to="/experience">
              Thử trải nghiệm <span aria-hidden="true">→</span>
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
