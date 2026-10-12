import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Link, type LinkProps } from "react-router";

import { isApiError } from "../api/errors";

import styles from "./ui.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  const variantClass =
    variant === "secondary"
      ? styles.buttonSecondary
      : variant === "danger"
        ? styles.buttonDanger
        : variant === "ghost"
          ? styles.buttonGhost
          : styles.button;
  return (
    <button
      type={type}
      className={[variantClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function ActionLink({
  variant = "primary",
  className,
  ...props
}: LinkProps & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={[
        variant === "primary" ? styles.button : styles.buttonSecondary,
        styles.actionLink,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function TextField({
  label,
  error,
  id: suppliedId,
  "aria-describedby": describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined
        }
        {...props}
      />
      {error ? <small id={errorId}>{error}</small> : null}
    </div>
  );
}

export function PasswordField({
  label,
  error,
  id: suppliedId,
  "aria-describedby": describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.password}>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined
          }
          {...props}
          type={visible ? "text" : "password"}
        />
        <Button
          variant="secondary"
          disabled={props.disabled}
          aria-pressed={visible}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Ẩn" : "Hiện"}
        </Button>
      </div>
      {error ? <small id={errorId}>{error}</small> : null}
    </div>
  );
}

export function TextArea({
  label,
  error,
  id: suppliedId,
  "aria-describedby": describedBy,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const errorId = `${id}-error`;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined
        }
        {...props}
      />
      {error ? <small id={errorId}>{error}</small> : null}
    </div>
  );
}

export function SelectField({
  label,
  children,
  id: suppliedId,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <select id={id} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Alert({
  tone = "danger",
  title,
  children,
}: {
  tone?: "danger" | "success" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const className =
    tone === "success" ? styles.success : tone === "warning" ? styles.warning : styles.alert;
  return (
    <div className={className} role={tone === "danger" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "neutral" | "success" | "warning";
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function SkeletonLines() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}

export function Dialog({
  title,
  children,
  onClose,
  labelledBy,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  labelledBy?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previously =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;
    function isUpperDialog() {
      const dialogs = document.querySelectorAll("[role='dialog']");
      return dialogs[dialogs.length - 1] === node;
    }
    function items() {
      return [
        ...(node?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex='0']",
        ) ?? []),
      ].filter(
        (item) =>
          !item.matches(":disabled, [hidden], input[type='hidden']") && !item.closest("[hidden]"),
      );
    }
    function containFocus() {
      if (isUpperDialog() && node && !node.contains(document.activeElement))
        (items()[0] ?? node).focus();
    }
    if (isUpperDialog()) (items()[0] ?? node)?.focus();
    function onKey(event: KeyboardEvent) {
      if (!isUpperDialog() || event.defaultPrevented) return;
      if (event.key === "Escape" && closeRef.current) {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab" || !node) return;
      const controls = items();
      const first = controls[0],
        last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        node.focus();
        return;
      }
      if (!node.contains(document.activeElement) || document.activeElement === node) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("focusin", containFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", containFocus);
      previously?.focus();
    };
  }, []);
  return (
    <div
      className={[styles.dialogBackdrop, className].filter(Boolean).join(" ")}
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        ref={ref}
        className={styles.dialog}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        {onClose ? (
          <Button
            className={styles.dialogClose}
            variant="ghost"
            aria-label="Đóng hộp thoại"
            onClick={onClose}
          >
            ×
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function errorCopy(error: unknown): {
  title: string;
  detail: string;
  retryAfter: number | null;
  correlationId: string | null;
  status: number | null;
} {
  if (isApiError(error)) {
    if (error.status === 401)
      return {
        title: "Phiên làm việc đã hết",
        detail: "Đăng nhập lại để tiếp tục. Thời gian bài thi không được đặt lại.",
        retryAfter: error.retryAfterSeconds,
        correlationId: error.correlationId,
        status: 401,
      };
    if (error.status === 403)
      return {
        title: "Bạn không có quyền thực hiện việc này",
        detail: error.message,
        retryAfter: null,
        correlationId: error.correlationId,
        status: 403,
      };
    if (error.status === 404)
      return {
        title: "Không tìm thấy nội dung",
        detail: "Nội dung không tồn tại hoặc capability này chưa được backend triển khai.",
        retryAfter: null,
        correlationId: error.correlationId,
        status: 404,
      };
    if (error.status === 409)
      return {
        title: "Dữ liệu đã thay đổi",
        detail: "Bản trên máy chủ mới hơn. Đối chiếu trước khi lưu lại.",
        retryAfter: null,
        correlationId: error.correlationId,
        status: 409,
      };
    if (error.status === 422)
      return {
        title: "Không thể tiếp tục",
        detail: error.message,
        retryAfter: null,
        correlationId: error.correlationId,
        status: 422,
      };
    if (error.status === 429)
      return {
        title: "Thao tác đang bị giới hạn",
        detail: `Máy chủ yêu cầu chờ ${error.retryAfterSeconds ?? "một lúc"} giây.`,
        retryAfter: error.retryAfterSeconds,
        correlationId: error.correlationId,
        status: 429,
      };
    if (error.kind === "network" || error.status === 503)
      return {
        title: "Chưa kết nối được máy chủ",
        detail: "Thử lại. Thao tác chưa được xác nhận là đã lưu.",
        retryAfter: error.retryAfterSeconds,
        correlationId: error.correlationId,
        status: error.status,
      };
    return {
      title: "Không thực hiện được",
      detail: error.message,
      retryAfter: error.retryAfterSeconds,
      correlationId: error.correlationId,
      status: error.status,
    };
  }
  return {
    title: "Không thực hiện được",
    detail: "Đã có lỗi. Thử lại.",
    retryAfter: null,
    correlationId: null,
    status: null,
  };
}

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const copy = errorCopy(error);
  return (
    <Alert title={copy.title}>
      <p>{copy.detail}</p>
      {copy.correlationId ? <p>Mã đối chiếu: {copy.correlationId}</p> : null}
      {onRetry ? <Button onClick={onRetry}>Thử lại</Button> : null}
    </Alert>
  );
}

export function choiceClass(selected: boolean): string {
  return selected ? `${styles.choice ?? ""} ${styles.choiceSelected ?? ""}` : (styles.choice ?? "");
}

export const promptClass = styles.prompt;
export const actionsClass = styles.actions;
export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.tableWrap} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
export const tableClass = styles.table;
export const sheetClass = styles.sheet;
