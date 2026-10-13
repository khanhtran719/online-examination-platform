import { Link } from "react-router";

import type { useSession } from "@web/app/session";
import { Alert, Button } from "@web/shared/ui/ui";

import styles from "./auth-frame.module.css";

export function AuthSessionState({ session }: { session: ReturnType<typeof useSession> }) {
  if (session.status === "loading") return <p role="status">Đang kiểm tra phiên trình duyệt…</p>;
  if (session.status === "unavailable")
    return (
      <div className={styles.form}>
        <Alert title="Chưa kiểm tra được phiên">
          Kiểm tra kết nối rồi thử lại trước khi tiếp tục.
        </Alert>
        <Button variant="secondary" onClick={() => void session.reload()}>
          Kiểm tra lại phiên
        </Button>
      </div>
    );
  if (session.status === "authenticated" || session.needsReauth)
    return (
      <div className={styles.form}>
        <Alert tone="warning" title="Hãy đăng xuất trước">
          Tài khoản đang đăng nhập không thể xác nhận email trong phiên này.
        </Alert>
        {session.logoutError ? (
          <Alert title="Chưa xác nhận đăng xuất">{session.logoutError}</Alert>
        ) : null}
        <Button variant="secondary" onClick={() => void session.logout()}>
          Đăng xuất
        </Button>
        <Link to="/dashboard">Về bảng làm việc</Link>
      </div>
    );
  return null;
}
