import { useState } from "react";
import { Button, Dialog, ErrorPanel, SkeletonLines, TextField } from "../../shared/ui/ui";
import type { ExamDraft } from "./use-exam-draft";
import { questionTypeLabel } from "./admin-ui";
import styles from "./admin.module.css";

export function ExamStructure({ draft }: { draft: ExamDraft }) {
  const [picker, setPicker] = useState<number | null>(null);
  const used = new Set(
    draft.sections.flatMap((section) =>
      section.questions.map((question) => question.bankQuestionId),
    ),
  );
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
    <div className={styles.picker}>
      {draft.sections.map((section, index) => (
        <fieldset key={index} className={styles.section}>
          <legend>Phần {index + 1}</legend>
          <TextField
            label="Tên phần"
            value={section.title}
            onChange={(event) =>
              draft.setSections((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, title: event.target.value } : item,
                ),
              )
            }
          />
          {section.questions.length === 0 ? (
            <p className={styles.caption}>
              Phần này chưa có câu. Chọn câu từ ngân hàng trước khi lưu.
            </p>
          ) : null}
          {section.questions.map((slot, slotIndex) => {
            const question = draft.questions.find((item) => item.id === slot.bankQuestionId);
            return (
              <div key={slot.bankQuestionId} className={styles.membership}>
                <div>
                  <p className={styles.caption}>
                    Câu {slotIndex + 1}
                    {question ? ` · ${questionTypeLabel[question.type]}` : ""}
                  </p>
                  <p>{question?.prompt.slice(0, 180) ?? `Câu …${slot.bankQuestionId.slice(-6)}`}</p>
                </div>
                <TextField
                  label={`Điểm câu ${slotIndex + 1}`}
                  type="number"
                  min={1}
                  max={1000}
                  value={String(slot.points)}
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
        disabled={draft.sections.length >= 20}
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
        <Dialog title="Chọn câu từ ngân hàng" onClose={() => setPicker(null)}>
          <p className={styles.caption}>
            Thêm vào phần {picker + 1}. Chỉ các câu đã tải; mỗi câu xuất hiện một lần trong đề.
          </p>
          {draft.bank.isLoading ? <SkeletonLines /> : null}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setPicker(null)}>
              Đóng bộ chọn
            </Button>
          </div>
          {draft.bank.error ? (
            <ErrorPanel
              error={draft.bank.error}
              onRetry={draft.hideBank ? undefined : () => void draft.bank.refetch()}
            />
          ) : null}
          <div className={styles.picker}>
            {draft.questions
              .filter((question) => !question.archived)
              .map((question) => (
                <div key={question.id} className={styles.pickerRow}>
                  <div>
                    <p>{question.prompt.slice(0, 180)}</p>
                    <p className={styles.caption}>
                      {questionTypeLabel[question.type]} · {question.points} điểm ngân hàng
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={used.has(question.id) || used.size >= 500}
                    aria-label={`${used.has(question.id) ? "Đã có" : "Thêm"}: ${question.prompt.slice(0, 80)}`}
                    onClick={() =>
                      draft.setSections((current) => {
                        if (
                          current.some((section) =>
                            section.questions.some((slot) => slot.bankQuestionId === question.id),
                          )
                        )
                          return current;
                        return current.map((item, index) =>
                          index === picker
                            ? {
                                ...item,
                                questions: [
                                  ...item.questions,
                                  { bankQuestionId: question.id, points: question.points },
                                ],
                              }
                            : item,
                        );
                      })
                    }
                  >
                    {used.has(question.id) ? "✓ Đã có trong đề" : "+ Thêm câu"}
                  </Button>
                </div>
              ))}
          </div>
          {draft.bank.hasNextPage && !draft.hideBank ? (
            <Button
              variant="secondary"
              disabled={draft.bank.isFetchingNextPage}
              onClick={() => void draft.bank.fetchNextPage()}
            >
              Tải thêm câu trong ngân hàng
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setPicker(null)}>
            Xong
          </Button>
        </Dialog>
      ) : null}
    </div>
  );
}
