import { useState } from "react";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import { useTitle } from "../../app/use-title";
import { isApiError } from "../../shared/api/errors";
import { uuidV7 } from "../../shared/api/uuid";
import { Alert, Button, TextField } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";

export function ProfilePage() {
  useTitle("Hồ sơ");
  const { api, mode, demo } = useRuntime();
  const session = useSession();
  const profile = session.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [optIn, setOptIn] = useState(profile?.leaderboardOptIn ?? false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [sentName, setSentName] = useState<string | null>(null);
  const [sentOptIn, setSentOptIn] = useState<boolean | null>(null);
  const [conflict, setConflict] = useState(false);
  if (!profile) return null;
  const nameDrift = displayName !== profile.displayName || optIn !== profile.leaderboardOptIn;
  async function save() {
    if (!profile) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError("Tên hiển thị từ 1 đến 80 ký tự.");
      return;
    }
    if (key && sentName !== null && (sentName !== trimmed || sentOptIn !== optIn)) {
      setError("Nội dung đã đổi so với lần lưu chưa xác nhận. Khôi phục nội dung đã gửi rồi bấm lưu lại.");
      return;
    }
    const idempotencyKey = key ?? uuidV7();
    setKey(idempotencyKey);
    setSentName(trimmed);
    setSentOptIn(optIn);
    setPending(true);
    setError(null);
    try {
      await api.updateProfile(idempotencyKey, {
        displayName: trimmed,
        leaderboardOptIn: optIn,
        expectedRevision: profile.revision,
      });
      setKey(null);
      setSentName(null);
      setSentOptIn(null);
      setConflict(false);
      setMessage("Đã lưu hồ sơ.");
      await session.reload({ quiet: true });
    } catch (caught) {
      if (isApiError(caught) && caught.status === 409) {
        setKey(null);
        setSentName(null);
        setSentOptIn(null);
        setConflict(true);
        await session.reload({ quiet: true });
        setError("Hồ sơ đã đổi ở nơi khác. Bản bạn đang sửa vẫn còn để đối chiếu.");
      } else if (isApiError(caught) && (caught.kind === "network" || caught.kind === "timeout")) {
        setError("Chưa rõ hồ sơ đã được ghi chưa. Bấm lưu lại sẽ gửi cùng nội dung và cùng khóa.");
      } else {
        setKey(null);
        setSentName(null);
        setSentOptIn(null);
        setError(isApiError(caught) ? caught.message : "Không lưu được.");
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <h1 className={styles.title}>Hồ sơ</h1>
      <p>{profile.email}</p>
      <p className={styles.muted}>Revision {profile.revision}</p>
      {conflict ? (
        <Alert tone="warning" title="Đối chiếu hồ sơ">
          Bản trên máy chủ: {profile.displayName}, hiện trên bảng xếp hạng: {profile.leaderboardOptIn ? "có" : "không"}. Bản bạn đang sửa: {displayName}, hiện trên bảng xếp hạng: {optIn ? "có" : "không"}.
        </Alert>
      ) : null}
      {mode === "live" ? (
        <Alert tone="warning" title="Chưa có quyền quản trị">
          Hồ sơ không kèm danh sách quyền. Trang quản trị chưa mở cho đến khi máy chủ cho biết quyền. Ứng dụng không đọc token để đoán quyền.
        </Alert>
      ) : (
        <p className={styles.muted}>
          Quyền demo hiện tại: {demo?.permissions.join(", ")}. Công tắc quyền nằm ở thanh dữ liệu mẫu, không phải hồ sơ thật.
        </p>
      )}
      {message ? <Alert tone="success" title="Đã lưu">{message}</Alert> : null}
      {error ? <Alert title="Chưa lưu được">{error}</Alert> : null}
      <TextField label="Tên hiển thị" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      <label className={styles.row}>
        <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} />
        Hiện bí danh trên bảng xếp hạng. Tên hiển thị không được đưa vào bảng.
      </label>
      <Button disabled={pending || !nameDrift} onClick={() => void save()}>
        {pending ? "Đang lưu…" : "Lưu hồ sơ"}
      </Button>
    </div>
  );
}
