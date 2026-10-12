import { useState } from "react";

import { Button, Dialog, ErrorPanel, SkeletonLines, TextField } from "@web/shared/ui/ui";

import { questionTypeLabel } from "./admin-ui";
import styles from "./exam-editor.module.css";
import type { ExamDraft } from "./use-exam-draft";

export function ExamQuestionPicker({
  draft,
  sectionIndex,
  onClose,
}: {
  draft: ExamDraft;
  sectionIndex: number;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const used = new Set(
    draft.sections.flatMap((section) => section.questions.map((slot) => slot.bankQuestionId)),
  );
  const visible = draft.questions.filter(
    (question) =>
      !question.archived &&
      question.prompt.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <Dialog title="Chọn câu từ ngân hàng" onClose={onClose}>
      <p className={styles.caption}>
        Thêm vào phần {sectionIndex + 1}. Chỉ tìm trong các câu đã tải; mỗi câu xuất hiện một lần
        trong đề. Điểm có thể sửa riêng trong đề.
      </p>
      <TextField
        label="Tìm trong câu đã tải"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {draft.bank.isLoading ? <SkeletonLines /> : null}
      {draft.bank.error ? (
        <ErrorPanel
          error={draft.bank.error}
          onRetry={draft.hideBank ? undefined : () => void draft.bank.refetch()}
        />
      ) : null}
      {!draft.bank.isLoading && !draft.bank.error && visible.length === 0 ? (
        <p>Chưa có câu phù hợp trong phần đã tải.</p>
      ) : null}
      <div className={styles.picker}>
        {visible.map((question) => (
          <div className={styles.pickerRow} key={question.id}>
            <div>
              <p>{question.prompt.slice(0, 180)}</p>
              <p className={styles.caption}>
                {questionTypeLabel[question.type]} · {question.points} điểm ngân hàng
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={draft.locked || used.has(question.id) || used.size >= 500}
              aria-label={`${used.has(question.id) ? "Đã có" : "Thêm"}: ${question.prompt.slice(0, 80)}`}
              onClick={() =>
                draft.setSections((current) => {
                  if (
                    current.flatMap((section) => section.questions).length >= 500 ||
                    current.some((section) =>
                      section.questions.some((slot) => slot.bankQuestionId === question.id),
                    )
                  )
                    return current;
                  return current.map((section, index) =>
                    index === sectionIndex
                      ? {
                          ...section,
                          questions: [
                            ...section.questions,
                            { bankQuestionId: question.id, points: question.points },
                          ],
                        }
                      : section,
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
      <div className={styles.actions}>
        <Button onClick={onClose}>Xong</Button>
      </div>
    </Dialog>
  );
}
