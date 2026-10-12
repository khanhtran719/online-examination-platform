import { type ReactNode, useState } from "react";
import { Link } from "react-router";

import layout from "../shared/styles/layout.module.css";
import { Brand } from "../shared/ui/brand";
import { Navigation, type NavItem } from "../shared/ui/navigation";
import { Button, Dialog } from "../shared/ui/ui";

import { useSession } from "./session";
import styles from "./workspace-frame.module.css";

export function WorkspaceFrame({
  items,
  section = "Không gian của bạn",
  navLabel = "Chính",
  children,
}: {
  items: readonly NavItem[];
  section?: string;
  navLabel?: string;
  children: ReactNode;
}) {
  const session = useSession();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className={styles.frame}>
      <a className="skip-link" href="#content">
        Đi tới nội dung
      </a>
      <aside className={styles.rail} aria-label="Không gian làm việc">
        <Brand variant="mark" />
        <Navigation items={items} label={navLabel} variant="rail" />
        <div className={styles.railFooter}>
          <Link to="/help" aria-label="Trợ giúp" title="Trợ giúp">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.identity}>
            <Brand variant="wordmark" />
            <span className={styles.context}>
              {section === "Quản trị" ? "Quản trị" : "Thí sinh"}
            </span>
          </div>
          <div className={styles.account}>
            {session.profile ? (
              <Link
                to="/profile"
                className={styles.profile}
                aria-label={`Hồ sơ: ${session.profile.displayName}`}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {session.profile.displayName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toLocaleUpperCase("vi-VN")}
                </span>
                <span className={styles.name}>{session.profile.displayName}</span>
              </Link>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => (session.hasUnconfirmed ? setConfirming(true) : void session.logout())}
            >
              Đăng xuất
            </Button>
          </div>
        </header>
        <main id="content" tabIndex={-1} className={styles.main}>
          {session.logoutError ? (
            <div className={layout.wrap}>
              <p role="status">{session.logoutError}</p>
            </div>
          ) : null}
          {children}
        </main>
        <footer className={styles.footer}>ExamPlatform · Vào nhịp thi</footer>
      </div>
      {confirming ? (
        <Dialog
          title="Đăng xuất khi còn thay đổi chưa xác nhận"
          onClose={() => setConfirming(false)}
        >
          <p>Một số đáp án chưa được máy chủ xác nhận. Đăng xuất sẽ xóa chúng khỏi trình duyệt.</p>
          <div className={layout.row}>
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
