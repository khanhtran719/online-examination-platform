import { type FormEvent, useId, useRef, useState } from "react";

import { Button, PasswordField, TextField } from "@web/shared/ui/ui";
import { validateRegister } from "@web/shared/validation";

import authStyles from "./auth-frame.module.css";

export function RegisterForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (body: { email: string; displayName: string; password: string }) => Promise<void>;
  disabled?: boolean;
}) {
  const hintId = useId();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const locked = pending || disabled;
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || disabled) return;
    const result = validateRegister({ email, displayName, password, confirmPassword });
    setErrors(result.errors);
    if (!result.body) return;
    busy.current = true;
    setPending(true);
    try {
      await onSubmit(result.body);
    } finally {
      setPassword("");
      setConfirmPassword("");
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form className={authStyles.form} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <TextField
        label="Email"
        type="email"
        maxLength={254}
        disabled={locked}
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Tên hiển thị"
        maxLength={160}
        disabled={locked}
        autoComplete="name"
        value={displayName}
        error={errors.displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <PasswordField
        label="Mật khẩu"
        disabled={locked}
        autoComplete="new-password"
        maxLength={256}
        aria-describedby={hintId}
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <p id={hintId} className={authStyles.hint}>
        Tối thiểu mười lăm ký tự. Bạn có thể dùng một cụm từ dễ nhớ.
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
        {pending ? "Đang gửi…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
