import { Alert, Button, ErrorPanel, TextField } from "@web/shared/ui/ui";

import styles from "./profile.module.css";
import type { useProfile } from "./use-profile";

export function ProfileSettings({
  profile,
  onDiscard,
}: {
  profile: ReturnType<typeof useProfile>;
  onDiscard: () => void;
}) {
  return (
    <section className={styles.settings} aria-labelledby="profile-settings-title">
      <div>
        <h2 id="profile-settings-title">Cài đặt thông tin</h2>
        <p className={styles.helper}>Chỉ thay đổi được máy chủ xác nhận mới là bản đã lưu.</p>
      </div>
      {profile.receipt ? (
        <Alert tone="success" title="Đã lưu hồ sơ">
          Thay đổi đã được máy chủ xác nhận.
          {profile.readError ? " Chưa tải được bản hiện tại; hãy tải lại để tiếp tục sửa." : ""}
        </Alert>
      ) : null}
      {profile.phase === "unknown" ? (
        <Alert tone="warning" title="Chưa nhận được xác nhận">
          <p>
            Chưa rõ lần lưu đã được ghi chưa. Nội dung đang gửi được giữ nguyên; thử lại dùng cùng
            yêu cầu.
          </p>
          <Button
            disabled={profile.retryWait > 0 || profile.reading}
            onClick={() => void profile.retry()}
          >
            Thử lại cùng yêu cầu
          </Button>
        </Alert>
      ) : null}
      {profile.phase === "saving" ? <p role="status">Đang lưu hồ sơ…</p> : null}
      {profile.error && profile.phase !== "conflict" ? <ErrorPanel error={profile.error} /> : null}
      {profile.readError && profile.phase === "accepted" ? (
        <>
          <ErrorPanel error={profile.readError} />
          <Button
            variant="secondary"
            disabled={profile.reading || profile.retryWait > 0}
            onClick={() => void profile.refresh()}
          >
            Tải lại hồ sơ
          </Button>
        </>
      ) : null}
      {profile.retryWait > 0 ? (
        <p role="status">Có thể thử lại sau {profile.retryWait} giây.</p>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void profile.save();
        }}
        aria-busy={profile.phase === "saving" || profile.reading}
      >
        <TextField
          label="Tên hiển thị"
          value={profile.name}
          disabled={profile.locked}
          required
          maxLength={160}
          autoComplete="name"
          aria-describedby="profile-name-help profile-name-count"
          error={profile.nameError ?? undefined}
          onChange={(event) => profile.changeName(event.target.value)}
        />
        <div className={styles.fieldHelp}>
          <p id="profile-name-help">Từ 1 đến 80 ký tự.</p>
          <p id="profile-name-count">{[...profile.name.trim()].length}/80 ký tự</p>
        </div>
        <label className={styles.privacy}>
          <input
            type="checkbox"
            aria-labelledby="profile-leaderboard-label"
            aria-describedby="profile-leaderboard-help"
            checked={profile.optIn}
            disabled={profile.locked}
            onChange={(event) => profile.changeOptIn(event.target.checked)}
          />
          <span>
            <strong id="profile-leaderboard-label">Tham gia bảng xếp hạng</strong>
            <span id="profile-leaderboard-help">
              Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở.
              Email và tên hiển thị không được đưa vào bảng.
            </span>
            <span className={styles.privacyStatus}>
              {profile.optIn ? "Bật · Hiện bí danh" : "Tắt · Không tham gia"}
            </span>
          </span>
        </label>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={!profile.dirty || profile.locked}
            onClick={onDiscard}
          >
            Hủy thay đổi
          </Button>
          <Button type="submit" disabled={!profile.canSave}>
            {profile.phase === "saving" ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </section>
  );
}
