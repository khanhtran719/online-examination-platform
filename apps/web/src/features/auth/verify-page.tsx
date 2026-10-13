import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { Alert, Button } from "@web/shared/ui/ui";

import { AuthFrame } from "./auth-frame";
import { AuthSessionState } from "./auth-session-state";
import { useVerification } from "./use-verification";
import { VerifyForm } from "./verify-form";

export function VerifyPage() {
  useTitle("Xác nhận email");
  const model = useVerification();
  return (
    <AuthFrame
      title="Xác nhận email"
      description="Chọn mật khẩu và bấm xác nhận để hoàn tất. Liên kết đã dùng sẽ không thay đổi mật khẩu cũ."
      step={2}
      layout="focused"
      footer={
        <>
          <Link to="/check-email">Gửi lại email xác nhận</Link>
          <Link to="/login">Về đăng nhập</Link>
        </>
      }
    >
      {model.tokenState === "missing" ? (
        <Alert title="Liên kết không có mã">Hãy mở liên kết đầy đủ từ email.</Alert>
      ) : null}
      {model.tokenState === "invalid" ? (
        <Alert title="Liên kết không hợp lệ">Mã không đúng định dạng. Hãy yêu cầu gửi lại.</Alert>
      ) : null}
      {model.tokenState === "valid" ? (
        <>
          {!model.allowed ? (
            <AuthSessionState session={model.session} />
          ) : (
            <>
              {model.error ? <Alert title="Chưa xác nhận được">{model.error}</Alert> : null}
              {model.phase === "ready" || model.phase === "pending" ? (
                <VerifyForm
                  key={model.scopeKey}
                  disabled={model.phase === "pending"}
                  onSubmit={model.submit}
                />
              ) : null}
              {model.phase === "unknown" ? (
                <Button disabled={model.remaining > 0} onClick={() => void model.retry()}>
                  {model.remaining > 0
                    ? `Xác nhận lại sau ${model.remaining} giây`
                    : "Thử xác nhận lại"}
                </Button>
              ) : null}
              {model.phase === "context" ? (
                <Button variant="secondary" onClick={() => void model.session.reload()}>
                  Kiểm tra lại phiên
                </Button>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </AuthFrame>
  );
}
