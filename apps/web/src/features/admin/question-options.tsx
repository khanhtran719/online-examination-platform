import { Button, TextArea, TextField } from "@web/shared/ui/ui";

import styles from "./authoring.module.css";
import type { QuestionDraft } from "./use-question-draft";

export function QuestionOptions({ draft }: { draft: QuestionDraft }) {
  return (
    <section className={styles.panel}>
      <h2>Lựa chọn và đáp án</h2>
      <p className={styles.scope}>
        {draft.type === "MULTIPLE_CHOICE" ? "Chọn tất cả đáp án đúng." : "Chọn đúng một đáp án."}{" "}
        Đáp án đi cùng nội dung khi sắp xếp lựa chọn.
      </p>
      <fieldset className={styles.optionGroup}>
        <legend>Đáp án đúng</legend>
        {draft.fields.options.map((option, index) => (
          <div key={option.id} className={styles.option}>
            <input
              aria-label={`Đáp án đúng ${index + 1}`}
              type={draft.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
              name="question-keys"
              checked={draft.fields.correctIds.includes(option.id)}
              onChange={() => draft.toggleKey(option.id)}
            />
            <TextField
              label={`Lựa chọn ${index + 1}`}
              value={option.text}
              onChange={(event) => draft.setOption(option.id, event.target.value)}
            />
            <div className={styles.optionActions}>
              <Button
                variant="ghost"
                aria-label={`Lên lựa chọn ${index + 1}`}
                disabled={index === 0}
                onClick={() => draft.moveOption(option.id, -1)}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                aria-label={`Xuống lựa chọn ${index + 1}`}
                disabled={index === draft.options.length - 1}
                onClick={() => draft.moveOption(option.id, 1)}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                aria-label={`Xóa lựa chọn ${index + 1}`}
                disabled={draft.options.length <= 2 || draft.type === "TRUE_FALSE"}
                onClick={() => draft.removeOption(option.id)}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </fieldset>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={draft.options.length >= 10 || draft.type === "TRUE_FALSE"}
          onClick={draft.addOption}
        >
          Thêm lựa chọn
        </Button>
        <Button
          variant="secondary"
          disabled={draft.options.length <= 2 || draft.type === "TRUE_FALSE"}
          onClick={() => draft.removeOption(draft.fields.options.at(-1)!.id)}
        >
          Bớt lựa chọn
        </Button>
      </div>
      <TextArea
        label="Giải thích"
        value={draft.explanation}
        onChange={(event) => draft.setExplanation(event.target.value)}
      />
      <p className={styles.counter}>
        {[...draft.explanation].length}/8000 ký tự · Chỉ dành cho người được phép
      </p>
    </section>
  );
}
