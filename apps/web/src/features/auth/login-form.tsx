import { type FormEvent, useRef, useState } from "react";

import { Button, PasswordField, TextField } from "@web/shared/ui/ui";
import { validateLogin } from "@web/shared/validation";

import authStyles from "./auth-frame.module.css";

export function LoginForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (body: { email: string; password: string }) => Promise<void>;
  disabled?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const locked = pending || disabled;
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || disabled) return;
    const result = validateLogin({ email, password });
    setErrors(result.errors);
    if (!result.body) return;
    busy.current = true;
    setPending(true);
    try {
      await onSubmit(result.body);
    } finally {
      setPassword("");
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
      <PasswordField
        label="Mật khẩu"
        disabled={locked}
        autoComplete="current-password"
        maxLength={256}
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" disabled={locked}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
