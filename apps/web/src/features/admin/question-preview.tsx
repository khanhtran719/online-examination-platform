import type { QuestionType } from "../../shared/api/dto";
import { questionTypeLabel } from "./admin-ui";
import styles from "./admin.module.css";

// The preview accepts only candidate-visible text; keys and explanations cannot be passed here.
export function QuestionPreview({
  prompt,
  options,
  type,
}: {
  prompt: string;
  options: readonly string[];
  type: QuestionType;
}) {
  return (
    <div className={styles.preview}>
      <p className={styles.caption}>{questionTypeLabel[type]}</p>
      <p className={styles.previewPrompt}>{prompt || "Nội dung câu hỏi hiện ở đây."}</p>
      <ul className={styles.previewOptions}>
        {options.map((option, index) => (
          <li key={index}>
            <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <p>{option || `Lựa chọn ${index + 1}`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
