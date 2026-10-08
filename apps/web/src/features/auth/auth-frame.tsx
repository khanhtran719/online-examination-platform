import type { ReactNode } from "react";
import { PaperArt } from "../../shared/ui/paper-art";
import styles from "./auth-frame.module.css";

const steps = ["Tạo tài khoản", "Xác nhận email", "Đăng nhập và chọn đề"];
export function AuthFrame({
  title,
  description,
  step,
  children,
  footer,
}: {
  title: string;
  description: string;
  step: 1 | 2 | 3;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={styles.frame}>
      <section className={styles.body}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>KHÔNG GIAN CỦA BẠN</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div className={styles.content}>{children}</div>
        <div className={styles.footer}>{footer}</div>
      </section>
      <aside className={styles.story} aria-label="Các bước bắt đầu">
        <div>
          <p className={styles.eyebrow}>VÀO NHỊP THI</p>
          <h2>
            Một khởi đầu.
            <br />
            <em>Nhiều bước tiến.</em>
          </h2>
          <p>
            Từ chọn đề đến xem kết quả,
            <br />
            mỗi bước đều có lối đi rõ ràng.
          </p>
        </div>
        <div className={styles.art}>
          <PaperArt />
        </div>
        <ol className={styles.steps}>
          {steps.map((label, index) => (
            <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
              <span aria-hidden="true">{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
