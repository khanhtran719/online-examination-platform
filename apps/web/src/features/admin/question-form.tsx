import { useState } from "react";
import { Link } from "react-router";
import { QUESTION_TYPES, type QuestionType } from "../../shared/api/dto";
import { Button, SelectField, TextArea, TextField } from "../../shared/ui/ui";
import { AdminBadge, AdminHeading, questionTypeLabel } from "./admin-ui";
import { QuestionDialogs } from "./question-dialogs";
import { QuestionPreview } from "./question-preview";
import { useQuestionDraft, type QuestionFormProps } from "./use-question-draft";
import styles from "./admin.module.css";
export function QuestionForm(props: QuestionFormProps) {
  const { initial, onArchive } = props;
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const draft = useQuestionDraft(props);
  const {
    type,
    prompt,
    options,
    correct,
    points,
    explanation,
    nextType,
    error,
    pending,
    revision,
    setPrompt,
    setOptions,
    setCorrect,
    setPoints,
    setExplanation,
    setNextType,
    applyType,
    changeType,
  } = draft;
  return (
    <form className={styles.preview} onSubmit={draft.submit}>
      <AdminHeading
        title={initial ? "Sửa câu" : "Tạo câu"}
        eyebrow="NGÂN HÀNG CÂU HỎI"
        description="Soạn nội dung, lựa chọn và đáp án. Câu đã phát hành vẫn giữ bản đã khóa."
      >
        <AdminBadge tone={initial?.archived ? "neutral" : "success"}>
          {initial?.archived ? "Đã lưu trữ" : `Revision ${revision}`}
        </AdminBadge>
        <Link to="/admin/questions">← Ngân hàng câu</Link>
      </AdminHeading>
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.editorGrid}>
        <div className={styles.preview}>
          <section className={styles.panel}>
            <h2>Nội dung câu hỏi</h2>
            <div className={styles.formGrid}>
              <SelectField
                label="Loại"
                value={type}
                onChange={(event) => changeType(event.target.value as QuestionType)}
              >
                {QUESTION_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {questionTypeLabel[item]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Điểm"
                type="number"
                min={1}
                max={1000}
                value={points}
                onChange={(event) => setPoints(event.target.value)}
              />
            </div>
            <TextArea
              label="Đề bài"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </section>
          <section className={styles.panel}>
            <h2>Lựa chọn và đáp án</h2>
            <p className={styles.caption}>
              Chọn ô bên trái để đặt đáp án đúng. Câu nhiều lựa chọn cho phép chọn nhiều ô.
            </p>
            <fieldset className={styles.keyGroup}>
              <legend>Đáp án đúng</legend>
              {options.map((option, index) => (
                <div key={index} className={styles.optionEditor}>
                  <label className={styles.keyToggle}>
                    <input
                      aria-label={`Đáp án đúng ${index + 1}`}
                      type={type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name="question-keys"
                      checked={correct.includes(index + 1)}
                      onChange={() =>
                        setCorrect((current) =>
                          type === "MULTIPLE_CHOICE"
                            ? current.includes(index + 1)
                              ? current.filter((position) => position !== index + 1)
                              : [...current, index + 1].sort((a, b) => a - b)
                            : [index + 1],
                        )
                      }
                    />
                  </label>
                  <TextField
                    label={`Lựa chọn ${index + 1}`}
                    value={option}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </fieldset>
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                disabled={options.length >= 10 || type === "TRUE_FALSE"}
                onClick={() => setOptions((current) => [...current, ""])}
              >
                Thêm lựa chọn
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={options.length <= 2 || type === "TRUE_FALSE"}
                onClick={() => {
                  setOptions((current) => current.slice(0, -1));
                  setCorrect((current) => current.filter((position) => position < options.length));
                }}
              >
                Bớt lựa chọn
              </Button>
            </div>
          </section>
          <section className={styles.panel}>
            <h2>Giải thích</h2>
            <TextArea
              label="Giải thích"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
            />
          </section>
        </div>
        <aside className={`${styles.panel} ${styles.summary}`}>
          <h2>Xem trước nội dung</h2>
          <p className={styles.caption}>
            Bản xem trước nội dung thí sinh sẽ thấy. Đáp án và giải thích được quản lý ở phần soạn
            câu.
          </p>
          <QuestionPreview prompt={prompt} options={options} type={type} />
        </aside>
      </div>
      <div className={styles.actionBar}>
        <p className={styles.caption}>
          Lưu câu vào ngân hàng. Thay đổi này không sửa phiên bản đề đã phát hành.
        </p>
        <div className={styles.actions}>
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu…" : "Lưu câu"}
          </Button>
          {onArchive ? (
            <Button
              type="button"
              variant="danger"
              disabled={pending || Boolean(initial?.archived)}
              onClick={() => setArchiveConfirm(true)}
            >
              Lưu trữ
            </Button>
          ) : null}
        </div>
      </div>
      <QuestionDialogs
        nextType={nextType}
        cancelType={() => setNextType(null)}
        changeType={() => {
          if (nextType) applyType(nextType);
          setNextType(null);
        }}
        archiveConfirm={archiveConfirm}
        cancelArchive={() => setArchiveConfirm(false)}
        archive={() => {
          setArchiveConfirm(false);
          draft.archive();
        }}
        pending={pending}
      />
    </form>
  );
}
