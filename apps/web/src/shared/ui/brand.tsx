import { Link } from "react-router";

import styles from "./brand.module.css";

export function Brand({ variant = "full" }: { variant?: "full" | "mark" | "wordmark" }) {
  return (
    <Link className={styles.brand} to="/" aria-label="ExamPlatform — trang chủ">
      {variant !== "wordmark" ? (
        <span className={styles.mark} aria-hidden="true">
          <ExamGlyph />
        </span>
      ) : null}
      {variant !== "mark" ? (
        <span>
          Exam<span className={styles.light}>Platform</span>
        </span>
      ) : null}
    </Link>
  );
}

export function ExamGlyph() {
  return (
    <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
      <rect x="3" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 6h8M7 10h4M7 14h2M11 17l2 2 5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
