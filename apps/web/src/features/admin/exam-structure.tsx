import { useState } from "react";

import { Button, Dialog, TextField } from "@web/shared/ui/ui";

import { questionTypeLabel } from "./admin-ui";
import { draftTotals } from "./exam-draft-model";
import styles from "./exam-editor.module.css";
import { ExamQuestionPicker } from "./exam-question-picker";
import type { ExamDraft } from "./use-exam-draft";

export function ExamStructure({ draft }: { draft: ExamDraft }) {
  const [picker, setPicker] = useState<number | null>(null);
  const [remove, setRemove] = useState<number | null>(null);
  const questionMap = new Map(draft.questions.map((question) => [question.id, question]));
  const removed = remove === null ? null : draft.sections[remove];
  const after = draftTotals(draft.sections.filter((_, index) => index !== remove));
  function move(sectionIndex: number, slotIndex: number, offset: number) {
    draft.setSections((current) =>
      current.map((section, index) => {
        if (index !== sectionIndex) return section;
        const next = [...section.questions],
          target = slotIndex + offset;
        const slot = next[slotIndex],
          other = next[target];
        if (!slot || !other) return section;
        next[slotIndex] = other;
        next[target] = slot;
        return { ...section, questions: next };
      }),
    );
  }
  return (
    <div className={styles.structure}>
      <div className={styles.sectionHeader}>
        <h2>Cấu trúc đề thi</h2>
        <span className={styles.caption}>Tối đa 20 phần · 500 câu</span>
      </div>
      {draft.sections.map((section, index) => (
        <fieldset
          key={index}
          className={`${styles.panel} ${styles.section}`}
          disabled={draft.locked}
        >
          <legend>Phần {index + 1}</legend>
          <div className={styles.sectionHeader}>
            <TextField
              label="Tên phần"
              id={`exam-sectionTitle.${index}`}
              value={section.title}
              error={
                draft.validation.issues.find((issue) => issue.field === `sectionTitle.${index}`)
                  ?.message
              }
              onChange={(event) =>
                draft.setSections((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, title: event.target.value } : item,
                  ),
                )
              }
            />
            <Button
              variant="ghost"
              disabled={draft.sections.length <= 1}
              aria-label={`Bỏ phần ${index + 1}`}
              onClick={() => setRemove(index)}
            >
              Bỏ phần
            </Button>
          </div>
          {section.questions.length === 0 ? (
            <div className={styles.empty}>
              <strong>Phần này chưa có câu hỏi</strong>
              <p>Chọn câu từ ngân hàng để xây dựng nội dung đề.</p>
            </div>
          ) : null}
          {section.questions.map((slot, slotIndex) => {
            const question = questionMap.get(slot.bankQuestionId);
            return (
              <div className={styles.membership} key={slot.bankQuestionId}>
                <div>
                  <p className={styles.caption}>
                    Câu {slotIndex + 1}
                    {question ? ` · ${questionTypeLabel[question.type]}` : ""}
                  </p>
                  <p>{question?.prompt.slice(0, 180) ?? `Câu …${slot.bankQuestionId.slice(-6)}`}</p>
                </div>
                <TextField
                  label={`Điểm câu ${slotIndex + 1}`}
                  id={`exam-points.${index}.${slotIndex}`}
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={Number.isFinite(slot.points) ? String(slot.points) : ""}
                  error={
                    draft.validation.issues.find(
                      (issue) => issue.field === `points.${index}.${slotIndex}`,
                    )?.message
                  }
                  onChange={(event) =>
                    draft.setSections((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              questions: item.questions.map((question, questionIndex) =>
                                questionIndex === slotIndex
                                  ? { ...question, points: Number(event.target.value) }
                                  : question,
                              ),
                            }
                          : item,
                      ),
                    )
                  }
                />
                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    disabled={slotIndex === 0}
                    onClick={() => move(index, slotIndex, -1)}
                  >
                    Lên
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={slotIndex === section.questions.length - 1}
                    onClick={() => move(index, slotIndex, 1)}
                  >
                    Xuống
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      draft.setSections((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                questions: item.questions.filter(
                                  (question) => question.bankQuestionId !== slot.bankQuestionId,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    Bỏ khỏi phần
                  </Button>
                </div>
              </div>
            );
          })}
          <Button variant="secondary" onClick={() => setPicker(index)}>
            Chọn câu cho phần {index + 1}
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        disabled={draft.locked || draft.sections.length >= 20}
        onClick={() =>
          draft.setSections((current) => [
            ...current,
            { title: `Phần ${current.length + 1}`, questions: [] },
          ])
        }
      >
        Thêm phần
      </Button>
      {picker !== null ? (
        <ExamQuestionPicker draft={draft} sectionIndex={picker} onClose={() => setPicker(null)} />
      ) : null}
      {removed ? (
        <Dialog title="Bỏ phần thi" onClose={() => setRemove(null)}>
          <p>
            Bỏ “{removed.title}” khỏi bản đang sửa? Câu hỏi gốc trong ngân hàng và nội dung các lượt
            thi đã bắt đầu được giữ nguyên.
          </p>
          <div className={styles.notice}>
            Sau khi bỏ: {after.sections} phần · {after.questions} câu · {after.points} điểm. Cần lưu
            nháp để ghi lại thay đổi.
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setRemove(null)}>
              Giữ phần
            </Button>
            <Button
              variant="danger"
              disabled={draft.locked}
              onClick={() => {
                draft.setSections((current) => current.filter((_, index) => index !== remove));
                setRemove(null);
              }}
            >
              Bỏ phần
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
