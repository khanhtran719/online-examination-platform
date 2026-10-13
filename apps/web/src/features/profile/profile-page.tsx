import { useCallback, useState } from "react";
import { Link, useBeforeUnload, useBlocker } from "react-router";

import { useTitle } from "@web/app/use-title";
import { formatDateTime } from "@web/shared/format";
import { Alert, Button, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./profile.module.css";
import { ProfileDialogs } from "./profile-dialogs";
import { ProfileSettings } from "./profile-settings";
import { useProfile } from "./use-profile";

export function ProfilePage() {
  useTitle("Hồ sơ");
  const profile = useProfile();
  return <ProfileContent key={profile.scope} profile={profile} />;
}

function ProfileContent({ profile }: { profile: ReturnType<typeof useProfile> }) {
  const [discard, setDiscard] = useState(false);
  const [logout, setLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      profile.unconfirmed && !loggingOut && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (profile.unconfirmed && !loggingOut) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [profile.unconfirmed, loggingOut],
    ),
  );
  if (!profile.visible || !profile.base)
    return (
      <div className={styles.page}>
        <h1>Hồ sơ thí sinh</h1>
        {profile.accessError ? (
          <ErrorPanel error={profile.accessError} />
        ) : profile.needsReauth ? (
          <Alert tone="warning" title="Cần đăng nhập lại">
            <p>
              Phiên chưa được xác nhận. Nội dung riêng đã được ẩn; đọc lại hồ sơ sau khi đăng nhập.
            </p>
            <Link to="/login?return=%2Fprofile">Đăng nhập lại</Link>
          </Alert>
        ) : (
          <SkeletonLines />
        )}
      </div>
    );
  const base = profile.base;
  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>TÀI KHOẢN CỦA BẠN</p>
        <h1>Hồ sơ thí sinh</h1>
        <p>Quản lý tên hiển thị và lựa chọn tham gia bảng xếp hạng.</p>
      </div>
      <div className={styles.columns}>
        <aside className={styles.identity} aria-label="Thông tin đã xác nhận">
          <span className={styles.avatar} aria-hidden="true">
            {base.displayName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => [...word][0])
              .join("")
              .toLocaleUpperCase("vi")}
          </span>
          <h2>{base.displayName}</h2>
          <p className={styles.verified}>✓ Đã xác thực email</p>
          <dl>
            <dt>Email · Chỉ đọc</dt>
            <dd>{base.email}</dd>
            <dt>Xác thực lúc</dt>
            <dd>{formatDateTime(base.emailVerifiedAt)} · Giờ Việt Nam UTC+7</dd>
          </dl>
          <p className={styles.helper}>
            Email này dùng để đăng nhập. Trang Hồ sơ hiện chưa hỗ trợ đổi email.
          </p>
          <Link to="/history">Xem lịch sử thi →</Link>
        </aside>
        <div className={styles.mainColumn}>
          <ProfileSettings profile={profile} onDiscard={() => setDiscard(true)} />
          <section className={styles.session} aria-labelledby="profile-session-title">
            <div>
              <h2 id="profile-session-title">Phiên làm việc</h2>
              <p className={styles.helper}>
                Đăng xuất khỏi phiên hiện tại. Thay đổi chưa xác nhận chỉ được giữ trong bộ nhớ
                trang.
              </p>
            </div>
            <Button variant="secondary" disabled={loggingOut} onClick={() => setLogout(true)}>
              Đăng xuất tài khoản
            </Button>
          </section>
        </div>
      </div>
      <ProfileDialogs
        profile={profile}
        blocker={blocker}
        discard={discard}
        logout={logout}
        closeDiscard={() => setDiscard(false)}
        closeLogout={() => setLogout(false)}
        confirmLogout={() => {
          setLogout(false);
          setLoggingOut(true);
          void profile.logout();
        }}
      />
    </div>
  );
}
