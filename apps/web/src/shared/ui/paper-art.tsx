import styles from "./paper-art.module.css";

/** Decorative examination paper; no questions, credentials or scores. */
export function PaperArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.stage} ${compact ? styles.compact : ""}`} aria-hidden="true">
      <div className={styles.orbit} />
      <div className={styles.shadow} />
      <div className={styles.paper}>
        <span className={styles.corner} />
        <span className={styles.mark}>e</span>
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.short}`} />
        <div className={styles.answers}>
          <span />
          <span className={styles.selected} />
          <span />
        </div>
        <div className={styles.answers}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.answers}>
          <span />
          <span />
          <span />
        </div>
        <span className={styles.stamp}>✓</span>
      </div>
      <div className={styles.pen}>
        <span />
      </div>
      <span className={styles.spark}>✦</span>
    </div>
  );
}
