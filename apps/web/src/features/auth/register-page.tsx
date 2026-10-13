import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { Alert } from "@web/shared/ui/ui";

import { AuthFrame } from "./auth-frame";
import { AuthSessionState } from "./auth-session-state";
import { RegisterForm } from "./register-form";
import { useRegister } from "./use-register";

export function RegisterPage() {
  useTitle("Tạo tài khoản");
  const model = useRegister();
  return (
    <AuthFrame
      title="Tạo tài khoản"
      description="Dùng email của bạn để bắt đầu. Xác nhận email trước khi đăng nhập và chọn đề."
      step={1}
      footer={
        <>
          <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
          <Link to="/">Về trang chủ</Link>
        </>
      }
    >
      {model.error ? <Alert title="Chưa nhận được xác nhận">{model.error}</Alert> : null}
      {model.session.status === "anonymous" && !model.session.needsReauth ? (
        <>
          <RegisterForm
            key={model.scopeKey}
            disabled={model.remaining > 0}
            onSubmit={model.submit}
          />
          {model.remaining > 0 ? <p role="status">Thử lại sau {model.remaining} giây.</p> : null}
        </>
      ) : (
        <AuthSessionState session={model.session} />
      )}
    </AuthFrame>
  );
}
