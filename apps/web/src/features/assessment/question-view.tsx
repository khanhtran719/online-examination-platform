import type { CandidateQuestion } from "../../shared/api/dto";
import { choiceClass, promptClass } from "../../shared/ui/ui";
import { Button } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";

const typeLabel = {
  SINGLE_CHOICE: "Một lựa chọn",
  MULTIPLE_CHOICE: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng hoặc sai",
} as const;

export function QuestionView({
  question,
  selected,
  marked,
  disabled,
  onSelected,
  onMarked,
  onClear,
}: {
  question: CandidateQuestion;
  selected: readonly string[];
  marked: boolean;
  disabled: boolean;
  onSelected: (selected: readonly string[]) => void;
  onMarked: (marked: boolean) => void;
  onClear: () => void;
}) {
  const multiple = question.type === "MULTIPLE_CHOICE";
  function toggle(optionId: string) {
    if (multiple) {
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      const order = question.options.map((option) => option.id);
      onSelected([...next].sort((left, right) => order.indexOf(left) - order.indexOf(right)));
      return;
    }
    onSelected([optionId]);
  }
  return (
    <article className={styles.stack} aria-labelledby={`prompt-${question.id}`}>
      <p className={styles.muted}>
        Câu {question.position} · {typeLabel[question.type]} · {question.points} điểm
      </p>
      <h2 id={`prompt-${question.id}`} tabIndex={-1} className={promptClass}>
        {question.prompt}
      </h2>
      <div className={styles.choices} role="group" aria-labelledby={`prompt-${question.id}`}>
        {question.options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className={choiceClass(checked)}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`question-${question.id}`}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.id)}
              />
              <span className={styles.prompt}>{option.text}</span>
              {checked ? <span className={styles.muted}>Đã chọn</span> : null}
            </label>
          );
        })}
      </div>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={marked}
          disabled={disabled}
          onChange={(event) => onMarked(event.target.checked)}
        />
        Đánh dấu để xem lại
      </label>
      <Button variant="secondary" disabled={disabled || selected.length === 0} onClick={onClear}>
        Xóa đáp án
      </Button>
    </article>
  );
}
