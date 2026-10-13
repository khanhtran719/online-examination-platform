import type { QuestionType } from "@web/shared/api/dto";

import { questionTypeLabel } from "./admin-ui";
import styles from "./authoring.module.css";

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
      <p className={styles.scope}>{questionTypeLabel[type]}</p>
      <p>{prompt || "Nội dung câu hỏi hiện ở đây."}</p>
      <ul>
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
