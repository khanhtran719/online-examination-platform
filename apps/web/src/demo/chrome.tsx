import { useState } from "react";
import { Link } from "react-router";
import { useRuntime } from "../app/runtime";
import { useSession } from "../app/session";
import { Button } from "../shared/ui/ui";
import styles from "./chrome.module.css";

const faults = [
  ["none", "Bình thường"],
  ["delay-ack", "Trễ ACK 5 giây"],
  ["lose-ack", "Mất ACK sau khi đã ghi"],
  ["conflict-save", "Xung đột phiên bản"],
  ["save-429", "Giới hạn lưu"],
  ["save-503", "Máy chủ bận khi lưu"],
  ["refresh-lost", "Mất kết quả refresh"],
] as const;

export function DemoChrome() {
  const { demo } = useRuntime();
  const session = useSession();
  const [note, setNote] = useState<string | null>(null);
  const [stressId, setStressId] = useState<string | null>(null);
  if (!demo) return null;
  return (
    <div>
      <p className={styles.banner} role="status">
        Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
      </p>
      <details className={styles.panel}>
        <summary>Kịch bản mẫu</summary>
        <p>
          Tài khoản đã xác nhận: candidate@example.test / fixture-password-ok. Tài khoản
          pending@example.test chưa có mật khẩu. disabled@example.test bị từ chối với cùng câu đăng
          nhập.
        </p>
        <p>
          Phiên demo nằm trong bộ nhớ tiến trình này. Tải lại trang sẽ mất đăng nhập. Hai tab không
          dùng chung phiên.
        </p>
        <label>
          Quyền mẫu{" "}
          <select
            value={
              demo.permissions.includes("catalog.manage")
                ? "admin"
                : demo.permissions.includes("reporting.read")
                  ? "reviewer"
                  : "candidate"
            }
            onChange={(event) =>
              demo.setPreset(event.target.value as "candidate" | "admin" | "reviewer")
            }
          >
            <option value="candidate">Thí sinh</option>
            <option value="reviewer">Người xem báo cáo</option>
            <option value="admin">Quản trị</option>
          </select>
        </label>
        <label>
          Lỗi lưu tiếp theo{" "}
          <select
            value={demo.fault}
            onChange={(event) => demo.setFault(event.target.value as (typeof faults)[number][0])}
          >
            {faults.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Button variant="secondary" onClick={() => demo.reset()}>
            Đặt lại dữ liệu mẫu
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void session
                .recover()
                .then((result) =>
                  setNote(
                    result.type === "reauth" ? `Cần đăng nhập lại: ${result.reason}` : result.type,
                  ),
                );
            }}
          >
            Thử refresh có khóa
          </Button>
          <Button variant="secondary" onClick={() => setStressId(demo.loadStress(120))}>
            Tạo đề 120 câu
          </Button>
        </div>
        {note ? <p role="status">{note}</p> : null}
        {stressId ? (
          <p>
            Đề tải nặng: <Link to={`/exams/${stressId}`}>{stressId}</Link>
          </p>
        ) : null}
        <p>
          Lượt phiên bản cũ đang làm:{" "}
          <Link to="/attempts/00000000-0000-4000-8000-000000000402">mở phòng</Link>
        </p>
        <p>
          Kết quả TOEIC 5/6, 83.33%:{" "}
          <Link to="/attempts/00000000-0000-4000-8000-000000000401/result">mở kết quả</Link>
        </p>
        <h2>Hộp thư mẫu</h2>
        {demo.mailbox.length === 0 ? <p>Chưa có thư.</p> : null}
        <ul>
          {demo.mailbox.map((item) => (
            <li key={`${item.email}-${item.createdAt}`}>
              {item.email} · <a href={`/verify-email#token=${item.token}`}>Mở liên kết xác nhận</a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
