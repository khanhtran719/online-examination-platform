import { Link, useLocation } from "react-router";

import { useTitle } from "@web/app/use-title";
import { Alert, Button, TextField } from "@web/shared/ui/ui";

import { AuthFrame } from "./auth-frame";
import styles from "./auth-frame.module.css";
import { AuthSessionState } from "./auth-session-state";
import { useCheckEmail } from "./use-check-email";

export function CheckEmailPage() {
  useTitle("Kiểm tra email");
  const model = useCheckEmail();
  const location = useLocation();
  const accepted =
    typeof location.state === "object" &&
    location.state !== null &&
    location.state.accepted === true;
  return (
    <AuthFrame
      title="Kiểm tra email"
      description="Mở hướng dẫn trong hộp thư để hoàn tất xác nhận."
      step={2}
      layout="focused"
      footer={
        <>
          <Link to="/login">Về đăng nhập</Link>
          <Link to="/register">Tạo tài khoản</Link>
        </>
      }
    >
      {model.feedback ? (
        <Alert
          tone={
            model.feedback.type === "error"
              ? "danger"
              : model.feedback.type === "limited"
                ? "warning"
                : "success"
          }
          title={
            model.feedback.type === "error"
              ? "Chưa gửi lại được"
              : model.feedback.type === "limited"
                ? "Hãy chờ trước khi gửi lại"
                : "Đã nhận yêu cầu"
          }
        >
          {model.feedback.message}
        </Alert>
      ) : accepted ? (
        <Alert tone="success" title="Đã nhận yêu cầu">
          Nếu email đủ điều kiện, hệ thống sẽ gửi hướng dẫn xác nhận. Hãy kiểm tra cả thư rác.
        </Alert>
      ) : (
        <p>
          Nếu email đủ điều kiện, hệ thống sẽ gửi hướng dẫn xác nhận sau khi nhận yêu cầu của bạn.
        </p>
      )}
      <ol className={styles.instructions}>
        <li>Tìm email xác nhận và mở liên kết trong thư. Liên kết có hiệu lực 30 phút.</li>
        <li>Thiết lập mật khẩu rồi đăng nhập để chọn đề.</li>
      </ol>
      {model.session.status === "anonymous" && !model.session.needsReauth ? (
        <div className={styles.form}>
          <TextField
            label="Email cần gửi lại"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={model.email}
            disabled={model.pending}
            error={model.fieldError}
            onChange={(event) => model.setEmail(event.target.value)}
          />
          <p className={styles.hint}>Nhập email vừa dùng nếu cần yêu cầu hướng dẫn mới.</p>
          <Button
            disabled={model.pending || model.remaining > 0}
            onClick={() => void model.resend()}
          >
            {model.pending
              ? "Đang gửi…"
              : model.remaining > 0
                ? `Gửi lại sau ${model.remaining} giây`
                : "Gửi lại hướng dẫn"}
          </Button>
          <p className={styles.hint}>
            Bạn có thể gửi lại sau ít nhất 60 giây. Máy chủ có thể yêu cầu chờ lâu hơn.
          </p>
        </div>
      ) : (
        <AuthSessionState session={model.session} />
      )}
    </AuthFrame>
  );
}
