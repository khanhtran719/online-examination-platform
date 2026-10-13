import { Link, useLocation } from "react-router";

import { useTitle } from "@web/app/use-title";
import { Alert, Button } from "@web/shared/ui/ui";

import { AuthFrame } from "./auth-frame";
import { AuthSessionState } from "./auth-session-state";
import { LoginForm } from "./login-form";
import { useLogin } from "./use-login";

export function LoginPage() {
  useTitle("Đăng nhập");
  const model = useLogin();
  const location = useLocation();
  const verified =
    typeof location.state === "object" &&
    location.state !== null &&
    location.state.verified === true;
  return (
    <AuthFrame
      title="Đăng nhập"
      description="Tiếp tục bài đang làm hoặc chọn một đề mới. Dùng email và mật khẩu của bạn."
      step={3}
      footer={
        <>
          <Link to="/register">Chưa có tài khoản</Link>
          <Link to="/check-email">Gửi lại email xác nhận</Link>
        </>
      }
    >
      {verified ? (
        <Alert tone="success" title="Email đã xác nhận">
          Hãy đăng nhập bằng mật khẩu đã thiết lập khi xác nhận lần đầu.
        </Alert>
      ) : null}
      {model.error ? <Alert title="Không đăng nhập được">{model.error}</Alert> : null}
      {model.allowed ? (
        <>
          {model.reading ? <p role="status">Đang tải hồ sơ…</p> : null}
          {model.readFailed ? (
            <Button
              disabled={model.reading || model.remaining > 0}
              onClick={() => void model.retryRead()}
            >
              {model.remaining ? `Tải lại sau ${model.remaining} giây` : "Thử tải lại hồ sơ"}
            </Button>
          ) : (
            <LoginForm
              key={model.scopeKey}
              disabled={model.reading || model.remaining > 0}
              onSubmit={model.submit}
            />
          )}
          {model.remaining > 0 ? <p role="status">Thử lại sau {model.remaining} giây.</p> : null}
        </>
      ) : model.session.status === "authenticated" ? (
        <>
          <p>Bạn đang đăng nhập. Tiếp tục đến không gian làm bài.</p>
          <Link to="/dashboard">Về bảng làm việc</Link>
        </>
      ) : (
        <AuthSessionState session={model.session} />
      )}
    </AuthFrame>
  );
}
