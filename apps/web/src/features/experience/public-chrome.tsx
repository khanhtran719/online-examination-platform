import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { useSession } from "@web/app/session";
import { Brand } from "@web/shared/ui/brand";
import { Navigation } from "@web/shared/ui/navigation";

import styles from "./public.module.css";

export function PublicFrame({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
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
      <header className={styles.header}>
        <a className={`skip-link ${styles.skipLink}`} href="#content">
          Đi tới nội dung
        </a>
        <div className={styles.headerInner}>
          <Brand />
          <Navigation
            className={styles.publicNav}
            items={links.map((link, index) => ({
              ...link,
              emphasis: index === links.length - 1,
              className:
                index < 3
                  ? styles.primaryNavLink
                  : index === 3
                    ? `${styles.accountNavLink} ${styles.accountNavStart}`
                    : styles.primaryNavAction,
            }))}
          />
        </div>
      </header>
      <main
        id="content"
        tabIndex={-1}
        className={immersive ? styles.immersiveMain : styles.standardMain}
      >
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
