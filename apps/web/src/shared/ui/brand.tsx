import { Link } from "react-router";
import styles from "./brand.module.css";

export function Brand() {
  return (
    <Link className={styles.brand} to="/" aria-label="ExamPlatform — trang chủ">
      <span className={styles.mark} aria-hidden="true">
        <ExamGlyph />
      </span>
      <span>
        Exam<span className={styles.light}>Platform</span>
      </span>
    </Link>
  );
}

export function ExamGlyph() {
  return (
    <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
      <rect x="3" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 6h8M11 10h4M11 14h4M11 18h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7" cy="10" r="1" fill="currentColor" />
      <circle cx="7" cy="14" r="1" fill="currentColor" />
      <circle cx="7" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
