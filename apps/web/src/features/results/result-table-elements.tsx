import type { HistoryItem } from "@web/shared/api/dto";
import { formatClock, statusLabel } from "@web/shared/format";

import styles from "./result-tables.module.css";

const date = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function TableTime({ value, seconds = false }: { value: string; seconds?: boolean }) {
  const clock = formatClock(value);
  return (
    <time dateTime={value} className={styles.time}>
      <span>{seconds ? clock : clock.slice(0, 5)}</span>
      <small>{date.format(new Date(value))}</small>
    </time>
  );
}

export function TableScore({
  earned,
  possible,
}: {
  earned: number | null;
  possible: number | null;
}) {
  return earned === null || possible === null ? (
    <span className={styles.noScore}>Chưa có điểm</span>
  ) : (
    <span className={styles.score}>
      {earned}
      <small> / {possible}</small>
    </span>
  );
}

export function AttemptBadge({ item }: { item: HistoryItem }) {
  const processing = item.status === "PROCESSING" || item.status === "SUBMITTED";
  const symbol =
    item.status === "COMPLETED" ? "✓" : item.status === "FAILED" ? "!" : processing ? "↻" : "◷";
  return (
    <div className={styles.statusStack}>
      <span className={styles.badge} data-state={item.status}>
        <span aria-hidden="true">{symbol}</span>
        {statusLabel(item.status)}
      </span>
      {item.expired ? <span className={styles.expired}>Đã hết giờ</span> : null}
    </div>
  );
}
