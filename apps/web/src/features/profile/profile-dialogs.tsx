import type { Blocker } from "react-router";

import layout from "@web/shared/styles/layout.module.css";
import { Button, Dialog, ErrorPanel } from "@web/shared/ui/ui";

import styles from "./profile.module.css";
import type { useProfile } from "./use-profile";

export function ProfileDialogs({
  profile,
  blocker,
  discard,
  logout,
  closeDiscard,
  closeLogout,
  confirmLogout,
}: {
  profile: ReturnType<typeof useProfile>;
  blocker: Blocker;
  discard: boolean;
  logout: boolean;
  closeDiscard: () => void;
  closeLogout: () => void;
  confirmLogout: () => void;
}) {
  if (!profile.visible) return null;
  return (
    <>
      {profile.phase === "conflict" ? (
        <Dialog title="Hồ sơ đã thay đổi ở nơi khác" className={styles.conflictBackdrop}>
          <p>Bản đang sửa được giữ trên trang. So sánh với dữ liệu mới nhất trước khi chọn.</p>
          {profile.readError ? <ErrorPanel error={profile.readError} /> : null}
          {profile.reading ? <p role="status">Đang tải bản mới nhất…</p> : null}
          <div className={styles.compare}>
            <section>
              <h3>Bản máy chủ</h3>
              {profile.fresh ? (
                <>
                  <dl>
                    <dt>Tên hiển thị</dt>
                    <dd>{profile.fresh.displayName}</dd>
                    <dt>Bảng xếp hạng</dt>
                    <dd>
                      {profile.fresh.leaderboardOptIn
                        ? "Bật · Hiện bí danh"
                        : "Tắt · Không tham gia"}
                    </dd>
                  </dl>
                  <p className={styles.helper}>Bản đã lưu mới nhất vừa tải.</p>
                </>
              ) : (
                <p>Chưa tải được bản mới nhất. Chưa thể áp dụng lựa chọn.</p>
              )}
            </section>
            <section>
              <h3>Bản đang sửa</h3>
              <dl>
                <dt>Tên hiển thị</dt>
                <dd>{profile.name}</dd>
                <dt>Bảng xếp hạng</dt>
                <dd>{profile.optIn ? "Bật · Hiện bí danh" : "Tắt · Không tham gia"}</dd>
              </dl>
              <p className={styles.helper}>Chưa được xác nhận lưu.</p>
            </section>
          </div>
          <p className={styles.note}>
            Dùng bản máy chủ sẽ bỏ thay đổi trên trang. Giữ bản của tôi đưa nội dung về form để bạn
            kiểm tra và bấm lưu; hệ thống vẫn kiểm tra thay đổi mới hơn.
          </p>
          <div className={layout.row}>
            <Button
              variant="secondary"
              disabled={!profile.fresh || profile.reading}
              onClick={profile.useServer}
            >
              Dùng bản máy chủ
            </Button>
            <Button disabled={!profile.fresh || profile.reading} onClick={profile.keepMine}>
              Giữ bản của tôi
            </Button>
            <Button
              variant="secondary"
              disabled={profile.reading || profile.retryWait > 0}
              onClick={() => void profile.refresh()}
            >
              Tải lại bản mới nhất
            </Button>
          </div>
        </Dialog>
      ) : null}
      {discard ? (
        <Dialog title="Bỏ thay đổi hồ sơ?" onClose={closeDiscard}>
          <p>Tên hiển thị và lựa chọn bảng xếp hạng đang sửa sẽ được thay bằng bản đã lưu.</p>
          <div className={layout.row}>
            <Button variant="secondary" onClick={closeDiscard}>
              Tiếp tục sửa
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                profile.reset();
                closeDiscard();
              }}
            >
              Bỏ thay đổi
            </Button>
          </div>
        </Dialog>
      ) : null}
      {blocker.state === "blocked" ? (
        <Dialog title="Rời hồ sơ khi còn thay đổi?" onClose={() => blocker.reset()}>
          <p>
            Thay đổi chưa xác nhận chỉ được giữ trên trang. Nếu đã gửi yêu cầu lưu, rời trang không
            hủy yêu cầu đó. Hãy đọc lại hồ sơ khi quay lại.
          </p>
          <div className={layout.row}>
            <Button variant="secondary" onClick={() => blocker.reset()}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed()}>
              Vẫn rời trang
            </Button>
          </div>
        </Dialog>
      ) : null}
      {logout ? (
        <Dialog title="Đăng xuất tài khoản?" onClose={closeLogout}>
          <p>
            {profile.unconfirmed
              ? "Hồ sơ đang sửa hoặc lần lưu chưa xác nhận sẽ không còn trong bộ nhớ trang. Đăng xuất không hủy yêu cầu lưu đã gửi."
              : "Kết thúc phiên làm việc hiện tại. Các thay đổi đã được máy chủ xác nhận vẫn được giữ."}
          </p>
          <div className={layout.row}>
            <Button variant="secondary" onClick={closeLogout}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={confirmLogout}>
              Đăng xuất tài khoản
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
