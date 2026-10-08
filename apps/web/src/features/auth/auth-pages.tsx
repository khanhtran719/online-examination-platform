import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useTitle } from "../../app/use-title";
import { useRuntime } from "../../app/runtime";
import { useSession } from "../../app/session";
import { isApiError } from "../../shared/api/errors";
import { safeReturnPath } from "../../shared/format";
import { validateFinalPassword, validateLogin, validateRegister } from "../../shared/validation";
import { Alert, Button, PasswordField, TextField } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { AuthFrame } from "./auth-frame";
import authStyles from "./auth-frame.module.css";

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
  const hintId = useId();
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
    <AuthFrame
      title="Tạo tài khoản"
      description="Bắt đầu với nhịp thi của bạn. Xác nhận email trước khi đăng nhập."
      step={1}
      footer={
        <>
          <span>Đã có tài khoản?</span>
          <Link to="/login">Đăng nhập</Link>
        </>
      }
    >
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
    </AuthFrame>
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
    </AuthFrame>
  );
}

export function CheckEmailPage() {
  useTitle("Kiểm tra email");
  const { api, demo } = useRuntime();
  const location = useLocation();
  const initial = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initial);
  const [message, setMessage] = useState(
    "Nếu email đủ điều kiện, hệ thống sẽ gửi hướng dẫn xác nhận. Hãy kiểm tra cả thư rác.",
  );
  const [feedback, setFeedback] = useState<"initial" | "accepted" | "limited" | "error">("initial");
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
      setFeedback("accepted");
      setMessage(
        "Nếu email hợp lệ, hướng dẫn mới sẽ được gửi. Thông báo này không cho biết email có tồn tại hay không.",
      );
      setCooldownUntil(started + 60_000);
    } catch (caught) {
      if (isApiError(caught) && caught.status === 429) {
        setFeedback("limited");
        const wait = (caught.retryAfterSeconds ?? 60) * 1000;
        setCooldownUntil(Date.now() + wait);
        setMessage(
          `Máy chủ yêu cầu chờ ${caught.retryAfterSeconds ?? 60} giây. Tải lại trang không tự xóa giới hạn của máy chủ.`,
        );
      } else {
        setFeedback("error");
        setMessage(isApiError(caught) ? caught.message : "Chưa gửi lại được.");
      }
    } finally {
      setPending(false);
      setNow(Date.now());
    }
  }
  return (
    <AuthFrame
      title="Kiểm tra email"
      description="Thêm một bước để mở không gian làm bài của bạn."
      step={2}
      footer={
        <>
          <Link to="/login">Về đăng nhập</Link>
          <Link to="/register">Tạo tài khoản</Link>
        </>
      }
    >
      <Alert
        tone={feedback === "error" ? "danger" : feedback === "limited" ? "warning" : "success"}
        title={
          feedback === "error"
            ? "Chưa gửi lại được"
            : feedback === "limited"
              ? "Hãy chờ trước khi gửi lại"
              : feedback === "accepted"
                ? "Đã nhận yêu cầu"
                : "Mở hướng dẫn trong hộp thư"
        }
      >
        {message}
      </Alert>
      <ol className={authStyles.instructions}>
        <li>Tìm email xác nhận và mở liên kết trong thư.</li>
        <li>Thiết lập mật khẩu rồi đăng nhập để chọn đề.</li>
      </ol>
      <TextField
        label="Email cần gửi lại"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button disabled={pending || remaining > 0} onClick={() => void resend()}>
        {pending
          ? "Đang gửi…"
          : remaining > 0
            ? `Gửi lại sau ${remaining} giây`
            : "Gửi lại hướng dẫn"}
      </Button>
      <CooldownClock cooldownUntil={cooldownUntil} onTick={setNow} />
    </AuthFrame>
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
  const hintId = useId();
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
    <AuthFrame
      title="Xác nhận email"
      description="Chọn mật khẩu và bấm xác nhận để hoàn tất. Liên kết đã dùng sẽ không thay đổi mật khẩu cũ."
      step={2}
      footer={
        <>
          <Link to="/check-email">Gửi lại email xác nhận</Link>
          <Link to="/login">Về đăng nhập</Link>
        </>
      }
    >
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
    </AuthFrame>
  );
}
