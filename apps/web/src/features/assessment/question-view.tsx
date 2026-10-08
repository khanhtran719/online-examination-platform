import type { CandidateQuestion } from "../../shared/api/dto";
import { Button } from "../../shared/ui/ui";
import styles from "./room.module.css";

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
    <article className={styles.question} aria-labelledby={`prompt-${question.id}`}>
      <p className={styles.questionMeta}>
        Câu {question.position} · {typeLabel[question.type]} · {question.points} điểm
      </p>
      <h2 id={`prompt-${question.id}`} tabIndex={-1} className={styles.prompt}>
        {question.prompt}
      </h2>
      <fieldset className={styles.choices} aria-describedby={`prompt-${question.id}`}>
        <legend>
          {multiple ? "Chọn các đáp án bạn cho là đúng." : "Chọn một đáp án bạn cho là đúng."}
        </legend>
        {question.options.map((option, index) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className={`${styles.choice} ${checked ? styles.selected : ""}`}>
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`question-${question.id}`}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.id)}
              />
              <span className={styles.letter} aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <span className={styles.prompt}>{option.text}</span>
              {checked ? (
                <span className={styles.selectedLabel} aria-hidden="true">
                  ✓ Đã chọn
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      <div className={styles.questionTools}>
        <label className={styles.markToggle}>
          <input
            type="checkbox"
            checked={marked}
            disabled={disabled}
            onChange={(event) => onMarked(event.target.checked)}
          />
          <span aria-hidden="true">⚑</span> Đánh dấu để xem lại
        </label>
        <Button variant="secondary" disabled={disabled || selected.length === 0} onClick={onClear}>
          Xóa đáp án
        </Button>
      </div>
    </article>
  );
}
