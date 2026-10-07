import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Brand } from "../shared/ui/brand";
import { Navigation, type NavItem } from "../shared/ui/navigation";
import { Button, Dialog } from "../shared/ui/ui";
import layout from "../shared/styles/layout.module.css";
import styles from "./workspace-frame.module.css";
import { useSession } from "./session";

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
        <Brand />
        <p className={styles.railLabel}>{section}</p>
        <Navigation items={items} label={navLabel} variant="rail" />
        <div className={styles.railFooter}>
          <span>Vào nhịp thi.</span>
          <Link to="/help">
            Trợ giúp <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.context}>{section}</span>
          <div className={styles.account}>
            {session.profile ? (
              <span className={styles.name}>{session.profile.displayName}</span>
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
