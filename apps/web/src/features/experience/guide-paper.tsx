import styles from "./public-guides.module.css";

export function GuidePaper() {
  return (
    <svg className={styles.paper} viewBox="0 0 240 200" aria-hidden="true" focusable="false">
      <ellipse cx="120" cy="181" rx="74" ry="8" className={styles.paperShadow} />
      <rect
        x="39"
        y="58"
        width="154"
        height="105"
        rx="34"
        transform="rotate(-14 116 110)"
        className={styles.paperAccent}
      />
      <path
        d="M78 24h69l35 35v101a12 12 0 0 1-12 12H78a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12Z"
        className={styles.paperSheet}
      />
      <path d="M147 24v23a12 12 0 0 0 12 12h23" className={styles.paperFold} />
      <path d="M86 81h60M86 99h43" className={styles.paperLines} />
      <circle cx="142" cy="139" r="23" className={styles.paperFold} />
      <path d="m132 139 7 7 13-14" className={styles.paperCheck} />
    </svg>
  );
}
