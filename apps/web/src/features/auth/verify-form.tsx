import { type FormEvent, useId, useRef, useState } from "react";

import { Button, PasswordField } from "@web/shared/ui/ui";
import { validateFinalPassword } from "@web/shared/validation";

import authStyles from "./auth-frame.module.css";

export function VerifyForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (body: { password: string }) => Promise<void>;
  disabled?: boolean;
}) {
  const hintId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const locked = pending || disabled;
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || disabled) return;
    const next = validateFinalPassword(password, confirmPassword);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    busy.current = true;
    setPending(true);
    try {
      await onSubmit({ password });
    } finally {
      setPassword("");
      setConfirmPassword("");
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form className={authStyles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <PasswordField
        label="Mật khẩu mới"
        disabled={locked}
        autoComplete="new-password"
        maxLength={256}
        aria-describedby={hintId}
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <p id={hintId} className={authStyles.hint}>
        Tối thiểu mười lăm ký tự. Đây là mật khẩu dùng để đăng nhập sau khi xác nhận.
      </p>
      <PasswordField
        label="Nhập lại mật khẩu"
        disabled={locked}
        autoComplete="new-password"
        maxLength={256}
        value={confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <Button type="submit" disabled={locked}>
        {pending ? "Đang xác nhận…" : "Xác nhận email"}
      </Button>
    </form>
  );
}
