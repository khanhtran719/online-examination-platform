import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { ActionLink } from "@web/shared/ui/ui";

import { GuidePaper } from "./guide-paper";
import styles from "./public-guides.module.css";

export function NotFoundPage() {
  useTitle("Không có trang");
  return (
    <div className={`${styles.page} ${styles.recovery}`}>
      <section className={styles.recoveryCard} aria-labelledby="missing-title">
        <GuidePaper />
        <p className={styles.recoveryCode}>404</p>
        <h1 id="missing-title">Không có trang này</h1>
        <p>Trang bạn mở không còn ở đây hoặc đường dẫn chưa đúng.</p>
        <div className={styles.actions}>
          <ActionLink to="/">Về trang chủ</ActionLink>
          <ActionLink to="/experience" variant="secondary">
            Thử trải nghiệm
          </ActionLink>
        </div>
        <Link className={styles.textLink} to="/help">
          Trợ giúp
        </Link>
      </section>
    </div>
  );
}
