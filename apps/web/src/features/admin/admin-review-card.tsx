import type { ReviewQuestion } from "../../shared/api/dto";
import { AdminBadge } from "./admin-ui";
import styles from "./admin.module.css";

/** Render only review data already authorized by the Admin review capability. */
export function AdminReviewCard({ row }: { row: ReviewQuestion }) {
  return (
    <article className={styles.panel}>
      <div className={styles.actions}>
        <p className={styles.eyebrow}>
          CÂU {row.question.position} · {row.question.points} ĐIỂM
        </p>
        <AdminBadge tone={row.correct ? "success" : "warning"}>
          {row.correct ? "Đúng" : "Chưa đúng"}
        </AdminBadge>
      </div>
      <h2 className={styles.plain}>{row.question.prompt}</h2>
      <ol className={styles.previewOptions}>
        {row.question.options.map((option, index) => {
          const selected = row.selectedOptionIds.includes(option.id);
          const correct = row.correctOptionIds.includes(option.id);
          return (
            <li key={option.id}>
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <div>
                <p className={styles.plain}>{option.text}</p>
                {selected || correct ? (
                  <p className={styles.caption}>
                    {selected ? "Thí sinh đã chọn" : ""}
                    {selected && correct ? " · " : ""}
                    {correct ? "✓ Đáp án của đề" : ""}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <h3>Giải thích</h3>
      <p className={styles.plain}>{row.explanation ?? "Chưa có giải thích."}</p>
    </article>
  );
}
