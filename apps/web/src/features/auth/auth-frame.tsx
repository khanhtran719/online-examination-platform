import type { ReactNode } from "react";

import styles from "./auth-frame.module.css";

const steps = ["Tạo tài khoản", "Xác nhận email", "Đăng nhập và chọn đề"];
export function AuthFrame({
  title,
  description,
  step,
  children,
  footer,
  layout = "split",
}: {
  title: string;
  description: string;
  step: 1 | 2 | 3;
  children: ReactNode;
  footer: ReactNode;
  layout?: "split" | "focused";
}) {
  return (
    <div className={styles.frame} data-layout={layout}>
      <section className={styles.body}>
        <header className={styles.heading}>
          {layout === "focused" ? (
            <div className={styles.mark} aria-hidden="true">
              ✉
            </div>
          ) : null}
          <p className={styles.eyebrow}>Bắt đầu cùng ExamPlatform</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div className={styles.content}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </section>
      {layout === "split" ? (
        <aside className={styles.story} aria-label="Các bước bắt đầu">
          <div>
            <p className={styles.eyebrow}>Vào nhịp thi</p>
            <h2>
              Một khởi đầu.
              <br />
              <em>Nhiều bước tiến.</em>
            </h2>
            <p>Chọn đề phù hợp, làm bài và nhìn lại kết quả của mình.</p>
          </div>
          <svg className={styles.art} viewBox="0 0 320 224" aria-hidden="true" focusable="false">
            <rect
              x="70"
              y="30"
              width="182"
              height="164"
              rx="20"
              fill="var(--color-accent-subtle)"
              transform="rotate(8 160 112)"
            />
            <rect
              x="56"
              y="18"
              width="196"
              height="172"
              rx="20"
              fill="var(--color-surface)"
              stroke="var(--color-border)"
            />
            <rect x="80" y="42" width="44" height="44" rx="12" fill="var(--color-primary)" />
            <path
              d="m92 64 7 7 14-16"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M144 52h80M144 70h56M82 112h144M82 132h116M82 152h128"
              stroke="var(--color-primary-subtle)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="253" cy="178" r="30" fill="var(--color-accent)" />
            <path
              d="m241 178 8 8 16-17"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <ol className={styles.steps}>
            {steps.map((label, index) => (
              <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
                <span aria-hidden="true">{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
