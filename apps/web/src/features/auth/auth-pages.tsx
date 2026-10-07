import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTitle } from "../../app/use-title";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import { isApiError } from "../../shared/api/errors";
import { safeReturnPath } from "../../shared/format";
import { validateFinalPassword, validateLogin, validateRegister } from "../../shared/validation";
import { Alert, Button, PasswordField, TextField } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";

export function HowPage() {
  useTitle("Cách hoạt động");
  return (
    <div className={`${styles.wrap} ${styles.reading}`}>
      <h1 className={styles.title}>Cách hoạt động</h1>
      <ol className={styles.stack}>
        <li>Tạo tài khoản. Hệ thống chỉ báo đã nhận yêu cầu, không đăng nhập ngay.</li>
        <li>
          Mở liên kết xác nhận, chọn mật khẩu cuối và bấm xác nhận. Mở liên kết không tự kích hoạt
          tài khoản.
        </li>
        <li>Đăng nhập bằng email và mật khẩu. Phiên nằm trong cookie của trình duyệt.</li>
        <li>Bắt đầu lượt thi. Câu trả lời được lưu theo lô sau khi máy chủ xác nhận.</li>
        <li>Nộp bài. Điểm xuất hiện khi máy chủ xử lý xong, không được tính trong trình duyệt.</li>
      </ol>
    </div>
  );
}

export function HelpPage() {
  useTitle("Trợ giúp");
  return (
    <div className={`${styles.wrap} ${styles.reading}`}>
      <h1 className={styles.title}>Trợ giúp</h1>
      <div className={styles.card}>
        <h2>Lưu câu trả lời</h2>
        <p>
          “Đã lưu” chỉ xuất hiện sau khi máy chủ xác nhận. Mất kết nối nghĩa là thay đổi vẫn nằm
          trên trình duyệt.
        </p>
      </div>
      <div className={styles.card}>
        <h2>Xung đột</h2>
        <p>
          Nếu cùng một câu đổi ở nơi khác, bạn chọn giữ lựa chọn của mình hoặc dùng bản máy chủ. Ứng
          dụng không tự ghi đè.
        </p>
      </div>
      <div className={styles.card}>
        <h2>Hết giờ</h2>
        <p>
          Đồng hồ dựa trên giờ máy chủ. Hết giờ thì không lưu thêm; những câu chưa được xác nhận
          được thông báo riêng.
        </p>
      </div>
      <p className={styles.muted}>Chưa có kênh hỗ trợ vận hành.</p>
    </div>
  );
}

export function NotFoundPage() {
  useTitle("Không có trang");
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Không có trang này</h1>
      <Link className={styles.chip} to="/">
        Về trang chủ
      </Link>
    </div>
  );
}

export function RegisterForm({
  onSubmit,
}: {
  onSubmit: (body: { email: string; displayName: string; password: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateRegister({ email, displayName, password, confirmPassword });
    setErrors(result.errors);
    if (!result.body) return;
    setPending(true);
    try {
      await onSubmit(result.body);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={styles.stack} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Tên hiển thị"
        autoComplete="name"
        value={displayName}
        error={errors.displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />
      <PasswordField
        label="Mật khẩu"
        autoComplete="new-password"
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordField
        label="Nhập lại mật khẩu"
        autoComplete="new-password"
        value={confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang gửi…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}

export function RegisterPage() {
  useTitle("Tạo tài khoản");
  const { api, demo } = useRuntime();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <h1 className={styles.title}>Tạo tài khoản</h1>
      <p>
        Nếu thông tin hợp lệ, hãy kiểm tra email. Hệ thống không cho biết email đã tồn tại và không
        đăng nhập ngay.
      </p>
      {error ? <Alert title="Chưa gửi được yêu cầu">{error}</Alert> : null}
      <RegisterForm
        onSubmit={async (body) => {
          setError(null);
          try {
            await api.register(body);
            demo?.notify();
            navigate("/check-email", { state: { email: body.email } });
          } catch (caught) {
            setError(isApiError(caught) ? caught.message : "Không gửi được yêu cầu.");
          }
        }}
      />
    </div>
  );
}

export function LoginForm({
  onSubmit,
}: {
  onSubmit: (body: { email: string; password: string }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateLogin({ email, password });
    setErrors(result.errors);
    if (!result.body) return;
    setPending(true);
    try {
      await onSubmit(result.body);
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={styles.stack} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        label="Mật khẩu"
        autoComplete="current-password"
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}

export function LoginPage() {
  useTitle("Đăng nhập");
  const { api } = useRuntime();
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const verified = (location.state as { verified?: boolean } | null)?.verified === true;
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <h1 className={styles.title}>Đăng nhập</h1>
      <p>
        Chỉ dùng email và mật khẩu. Magic link và GitHub chưa có trong contract nên không có nút
        giả.
      </p>
      {verified ? (
        <Alert tone="success" title="Email đã xác nhận">
          Hãy đăng nhập bằng mật khẩu đã thiết lập khi xác nhận lần đầu.
        </Alert>
      ) : null}
      {error ? <Alert title="Không đăng nhập được">{error}</Alert> : null}
      <LoginForm
        onSubmit={async (body) => {
          setError(null);
          try {
            await api.login(body);
            const ready = await session.reload({ confirmedLogin: true });
            if (!ready) {
              setError("Máy chủ đã nhận đăng nhập nhưng chưa tải được hồ sơ.");
              return;
            }
            navigate(safeReturnPath(params.get("return")));
          } catch (caught) {
            if (isApiError(caught) && caught.status === 401)
              setError("Email hoặc mật khẩu không đúng.");
            else setError(isApiError(caught) ? caught.message : "Không đăng nhập được.");
          }
        }}
      />
      <Link to="/register">Chưa có tài khoản</Link>
    </div>
  );
}

export function CheckEmailPage() {
  useTitle("Kiểm tra email");
  const { api, demo } = useRuntime();
  const location = useLocation();
  const initial = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initial);
  const [message, setMessage] = useState("Nếu email hợp lệ, hộp thư sẽ có hướng dẫn xác nhận.");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const remaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  async function resend() {
    if (remaining > 0 || pending) return;
    setPending(true);
    const started = Date.now();
    try {
      await api.requestEmailVerification({ email: email.trim().toLowerCase() });
      demo?.notify();
      setMessage(
        "Nếu email hợp lệ, hướng dẫn mới sẽ được gửi. Thông báo này không cho biết email có tồn tại hay không.",
      );
      setCooldownUntil(started + 60_000);
    } catch (caught) {
      if (isApiError(caught) && caught.status === 429) {
        const wait = (caught.retryAfterSeconds ?? 60) * 1000;
        setCooldownUntil(Date.now() + wait);
        setMessage(
          `Máy chủ yêu cầu chờ ${caught.retryAfterSeconds ?? 60} giây. Tải lại trang không tự xóa giới hạn của máy chủ.`,
        );
      } else {
        setMessage(isApiError(caught) ? caught.message : "Chưa gửi lại được.");
      }
    } finally {
      setPending(false);
      setNow(Date.now());
    }
  }
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <h1 className={styles.title}>Kiểm tra email</h1>
      <Alert tone="success" title="Đã nhận yêu cầu">
        {message}
      </Alert>
      <TextField
        label="Email cần gửi lại"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button disabled={pending || remaining > 0} onClick={() => void resend()}>
        {remaining > 0 ? `Gửi lại sau ${remaining} giây` : "Gửi lại hướng dẫn"}
      </Button>
      <CooldownClock cooldownUntil={cooldownUntil} onTick={setNow} />
    </div>
  );
}

function CooldownClock({
  cooldownUntil,
  onTick,
}: {
  cooldownUntil: number | null;
  onTick: (now: number) => void;
}) {
  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const id = window.setInterval(() => onTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil, onTick]);
  return null;
}

export function VerifyForm({
  onSubmit,
}: {
  onSubmit: (body: { password: string }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validateFinalPassword(password, confirmPassword);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    try {
      await onSubmit({ password });
    } finally {
      setPending(false);
    }
  }
  return (
    <form className={styles.stack} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <PasswordField
        label="Mật khẩu mới"
        autoComplete="new-password"
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordField
        label="Nhập lại mật khẩu"
        autoComplete="new-password"
        value={confirmPassword}
        error={errors.confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang xác nhận…" : "Xác nhận email"}
      </Button>
    </form>
  );
}

export function VerifyPage() {
  useTitle("Xác nhận email");
  const { api, verifyToken } = useRuntime();
  const session = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const missing = verifyToken === "";
  const invalid = verifyToken === "invalid";
  return (
    <div className={`${styles.wrap} ${styles.narrow}`}>
      <h1 className={styles.title}>Xác nhận email</h1>
      <p>
        Mã trong liên kết đã được đưa vào bộ nhớ của trang và xóa khỏi thanh địa chỉ. Trang không tự
        gửi yêu cầu.
      </p>
      <p>
        Nếu liên kết đã được dùng, gửi lại chỉ xác nhận trạng thái và không đổi mật khẩu đã thiết
        lập.
      </p>
      {missing ? (
        <Alert title="Liên kết không có mã">Hãy mở liên kết đầy đủ từ email.</Alert>
      ) : null}
      {invalid ? (
        <Alert title="Liên kết không hợp lệ">Mã không đúng định dạng. Hãy yêu cầu gửi lại.</Alert>
      ) : null}
      {session.status === "authenticated" ? (
        <div className={styles.stack}>
          <Alert tone="warning" title="Hãy đăng xuất trước">
            Tài khoản đang đăng nhập không thể xác nhận email trong phiên này.
          </Alert>
          <Button variant="secondary" onClick={() => void session.logout()}>
            Đăng xuất
          </Button>
        </div>
      ) : null}
      {!missing && !invalid && session.status !== "authenticated" ? (
        <>
          {error ? <Alert title="Chưa xác nhận được">{error}</Alert> : null}
          <VerifyForm
            onSubmit={async ({ password }) => {
              setError(null);
              try {
                await api.confirmEmailVerification({ token: verifyToken, password });
                navigate("/login", { state: { verified: true } });
              } catch (caught) {
                setError(isApiError(caught) ? caught.message : "Không xác nhận được.");
              }
            }}
          />
        </>
      ) : null}
    </div>
  );
}
