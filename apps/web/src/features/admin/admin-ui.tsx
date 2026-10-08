import type { ReactNode } from "react";
import type { QuestionType } from "../../shared/api/dto";
import { Button } from "../../shared/ui/ui";
import styles from "./admin.module.css";

export function adminId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export const questionTypeLabel: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Một lựa chọn",
  MULTIPLE_CHOICE: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng / Sai",
};
export function AdminHeading({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className={styles.muted}>{description}</p> : null}
      </div>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </header>
  );
}
export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}
export function PageEnd({
  next,
  loading,
  onMore,
}: {
  next: boolean;
  loading: boolean;
  onMore: () => void;
}) {
  return (
    <div className={styles.pageEnd}>
      <p className={styles.caption}>
        {next ? "Đang hiển thị phần danh sách đã tải." : "Đã hết danh sách đã tải."}
      </p>
      {next ? (
        <Button variant="secondary" disabled={loading} onClick={onMore}>
          {loading ? "Đang tải…" : "Tải thêm"}
        </Button>
      ) : null}
    </div>
  );
}
