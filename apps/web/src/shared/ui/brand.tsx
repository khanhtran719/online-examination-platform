import { Link } from "react-router";
import styles from "./brand.module.css";

export function Brand() {
  return (
    <Link className={styles.brand} to="/" aria-label="ExamPlatform — trang chủ">
      <span className={styles.mark} aria-hidden="true">
        e
      </span>
      <span>
        Exam<span className={styles.light}>Platform</span>
      </span>
    </Link>
  );
}
