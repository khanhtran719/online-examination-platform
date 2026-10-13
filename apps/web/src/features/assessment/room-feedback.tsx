import { useState } from "react";

import layout from "@web/shared/styles/layout.module.css";
import { Alert, Button, PasswordField, TextField } from "@web/shared/ui/ui";
import { validateLogin } from "@web/shared/validation";

import styles from "./room.module.css";
import type { useExamRoom } from "./use-exam-room";

export function RoomFeedback({ room }: { room: ReturnType<typeof useExamRoom> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {!room.save.canSave ? (
        <Alert tone="warning" title="Đã khóa lưu">
          Không còn lưu câu trả lời mới. Thay đổi chưa xác nhận không được tính là đã lưu.
        </Alert>
      ) : null}
      {room.notice ? (
        <Alert tone="warning" title="Lưu ý">
          {room.notice}
        </Alert>
      ) : null}
      {room.save.offline || room.save.inFlight?.exhausted ? (
        <Alert
          tone="warning"
          title={room.save.offline ? "Chưa kết nối" : "Chưa xác nhận được đã lưu"}
        >
          <p>
            Thay đổi chỉ được giữ trong bộ nhớ trang này. Đừng tải lại trang khi chưa được xác nhận.
          </p>
          <Button
            disabled={!room.save.canSave || !room.save.authenticated}
            onClick={room.retrySave}
          >
            Thử lưu lại
          </Button>
        </Alert>
      ) : null}
      {room.submit.phase === "verifying" || room.submitStopped ? (
        <Alert tone="warning" title="Chưa xác nhận đã nộp">
          <p>
            {room.submitStopped
              ? "Đã dừng kiểm tra tự động. Bạn có thể kiểm tra lại trạng thái khi kết nối sẵn sàng."
              : "Đang kiểm tra trạng thái bài. Giữ trang mở; bạn chưa thể sửa hoặc nộp một lần mới."}
          </p>
          {room.submit.unconfirmedCount > 0 ? (
            <p>{room.submit.unconfirmedCount} thay đổi chưa được xác nhận lưu.</p>
          ) : null}
          {room.submitStopped ? (
            <Button disabled={!room.canCheckSubmit} onClick={room.retryReconcile}>
              Kiểm tra trạng thái nộp
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {!room.save.authenticated && !room.accessError ? (
        <form
          className={`${layout.card} ${styles.reauth}`}
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = validateLogin({ email, password });
            if (!parsed.body) {
              setError("Nhập email và mật khẩu.");
              return;
            }
            setError(null);
            void room
              .reauthenticate(parsed.body.email, parsed.body.password)
              .then(() => setPassword(""))
              .catch(() => {
                setPassword("");
                setError("Chưa đăng nhập lại được. Kiểm tra email, mật khẩu và kết nối.");
              });
          }}
        >
          <h2>Đăng nhập lại</h2>
          <p>Đáp án chưa xác nhận được giữ trên trang. Đăng nhập đúng tài khoản để tiếp tục.</p>
          {error ? <p role="alert">{error}</p> : null}
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            disabled={room.recovering}
            onChange={(event) => setEmail(event.target.value)}
          />
          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            value={password}
            disabled={room.recovering}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" disabled={room.recovering}>
            {room.recovering ? "Đang đăng nhập…" : "Đăng nhập lại"}
          </Button>
        </form>
      ) : null}
    </>
  );
}
