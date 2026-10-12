import { Link } from "react-router";

import { Button } from "@web/shared/ui/ui";

import styles from "./exam-editor.module.css";
import type { ExamConfirmation } from "./exam-editor-dialogs";
import type { ExamDraft } from "./use-exam-draft";

export function ExamEditorActions({
  draft,
  step,
  onStep,
  onConfirm,
  canMonitor,
  canStatistics,
}: {
  draft: ExamDraft;
  step: number;
  onStep: (step: number) => void;
  onConfirm: (kind: ExamConfirmation) => void;
  canMonitor: boolean;
  canStatistics: boolean;
}) {
  const { seed } = draft;
  return (
    <>
      <div className={styles.actionBar}>
        <p className={styles.caption}>
          {draft.pending
            ? "Đang chờ máy chủ xác nhận…"
            : draft.unknown
              ? "Có yêu cầu chưa được xác nhận"
              : draft.dirty
                ? "● Có thay đổi chưa lưu"
                : draft.revision
                  ? "Bản đang sửa khớp lần lưu đã xác nhận"
                  : "Bản nháp mới chưa lưu"}
        </p>
        <div className={styles.actions}>
          {step > 0 ? (
            <Button variant="secondary" onClick={() => onStep(step - 1)}>
              Quay lại
            </Button>
          ) : null}
          <Button
            variant="secondary"
            disabled={draft.locked || !draft.validation.body}
            onClick={() => void draft.save(false)}
          >
            Lưu nháp
          </Button>
          {step < 2 ? (
            <Button onClick={() => onStep(step + 1)}>
              Tiếp: {step === 0 ? "Phần & câu hỏi" : "Kiểm tra"} →
            </Button>
          ) : (
            <Button
              disabled={draft.locked || !draft.validation.body}
              onClick={() => onConfirm("publish")}
            >
              Lưu và phát hành
            </Button>
          )}
        </div>
      </div>
      {seed ? (
        <div className={styles.secondaryActions}>
          {!seed.archived ? (
            <>
              <Button
                variant="secondary"
                disabled={draft.locked}
                onClick={() => onConfirm(seed.published ? "unpublish" : "publish-saved")}
              >
                {seed.published ? "Gỡ phát hành" : "Phát hành"}
              </Button>
              <Button variant="danger" disabled={draft.locked} onClick={() => onConfirm("archive")}>
                Lưu trữ
              </Button>
            </>
          ) : null}
          {seed.published && !seed.archived ? (
            <Link to={`/exams/${seed.id}`}>Xem như thí sinh</Link>
          ) : null}
          {canMonitor ? <Link to={`/admin/exams/${seed.id}/monitor`}>Giám sát đề này</Link> : null}
          {canStatistics && seed.publishedVersionId ? (
            <Link to={`/admin/exams/${seed.id}/versions/${seed.publishedVersionId}/statistics`}>
              Thống kê phiên bản đã phát hành
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
