import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useSession } from "../../app/session";
import styles from "./public.module.css";
import { Brand } from "../../shared/ui/brand";
import { Navigation } from "../../shared/ui/navigation";

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
      <a className="skip-link" href="#content">
        Đi tới nội dung
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <Navigation
            items={links.map((link, index) => ({ ...link, emphasis: index === links.length - 1 }))}
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
