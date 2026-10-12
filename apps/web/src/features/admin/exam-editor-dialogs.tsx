import { useEffect, useState } from "react";

import { Alert, Button, Dialog, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import { examFieldsOf } from "./exam-draft-model";
import styles from "./exam-editor.module.css";
import { ConflictDraftSummary } from "./exam-preflight";
import type { ExamDraft } from "./use-exam-draft";

export type ExamConfirmation = "publish" | "publish-saved" | "unpublish" | "archive";
const titles: Record<ExamConfirmation, string> = {
  publish: "Phát hành phiên bản",
  "publish-saved": "Phát hành phiên bản",
  unpublish: "Gỡ phát hành đề",
  archive: "Lưu trữ đề",
};
const descriptions: Record<ExamConfirmation, string> = {
  publish:
    "Bản nháp được lưu trước khi phát hành thành phiên bản cố định. Thí sinh mới sẽ nhận phiên bản này.",
  "publish-saved":
    "Phát hành bản nháp đã lưu trên máy chủ. Các chỉnh sửa chưa lưu trong màn hình này sẽ không được phát hành.",
  unpublish:
    "Ngừng mở lượt thi mới sau khi máy chủ xác nhận. Các lượt đã bắt đầu và kết quả được giữ nguyên. Thay đổi chưa lưu không được ghi lại.",
  archive:
    "Lưu trữ chỉ ngăn mở lượt mới. Các lượt đã làm không bị xóa. Thay đổi chưa lưu không được ghi lại.",
};
export function ExamConfirmDialog({
  kind,
  draft,
  onClose,
}: {
  kind: ExamConfirmation;
  draft: ExamDraft;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const waiting = sent && draft.pending;
  useEffect(() => {
    if (sent && !draft.pending && !draft.error && draft.notice) onClose();
  }, [sent, draft.pending, draft.error, draft.notice, onClose]);
  return (
    <Dialog title={titles[kind]} onClose={waiting ? undefined : onClose}>
      <p>
        <strong>{kind === "publish" ? draft.title : draft.seed?.title}</strong>
      </p>
      <p>{descriptions[kind]}</p>
      {sent && draft.notice ? (
        <Alert tone={draft.error || draft.unknown ? "warning" : "success"} title={draft.notice} />
      ) : null}
      {sent && draft.error && !draft.unknown ? <ErrorPanel error={draft.error} /> : null}
      {waiting ? <p role="status">Đang chờ máy chủ xác nhận. Vui lòng giữ màn hình này.</p> : null}
      {sent && draft.unknown ? (
        <p>
          Chưa biết kết quả lần gửi. Thử lại giữ nguyên yêu cầu; các thao tác khác đang được khóa.
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={waiting} onClick={onClose}>
          {sent ? "Đóng" : "Hủy"}
        </Button>
        {!sent ? (
          <Button
            variant={kind === "archive" ? "danger" : "primary"}
            disabled={draft.locked}
            onClick={() => {
              setSent(true);
              if (kind === "publish") void draft.save(true);
              else void draft.mutate(kind === "publish-saved" ? "publish" : kind);
            }}
          >
            Xác nhận
          </Button>
        ) : draft.unknown ? (
          <Button disabled={draft.pending} onClick={() => void draft.retry()}>
            Thử lại yêu cầu
          </Button>
        ) : null}
      </div>
    </Dialog>
  );
}
export function ExamConflictDialog({ draft }: { draft: ExamDraft }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(draft.conflict);
  }, [draft.conflict]);
  if (!draft.conflict) return null;
  if (!show)
    return (
      <Alert tone="warning" title="Bản nháp đã thay đổi ở nơi khác">
        <p>Bản bạn đang sửa vẫn được giữ. Đối chiếu trước khi tiếp tục.</p>
        <Button variant="secondary" onClick={() => setShow(true)}>
          Đối chiếu bản nháp
        </Button>
      </Alert>
    );
  const fresh = !draft.existing.isError && !draft.existing.isFetching ? draft.seed : undefined;
  return (
    <Dialog
      title="Bản nháp đã thay đổi ở nơi khác"
      className={styles.compare}
      onClose={() => setShow(false)}
    >
      <p>
        Bản bạn đang sửa vẫn được giữ. Đối chiếu trước khi tiếp tục; không tự gộp hoặc ghi đè thay
        đổi.
      </p>
      {draft.existing.isFetching ? <SkeletonLines /> : null}
      {draft.existing.isError ? (
        <ErrorPanel error={draft.existing.error} onRetry={() => void draft.existing.refetch()} />
      ) : null}
      <div className={styles.comparison}>
        {fresh ? (
          <ConflictDraftSummary
            title="Bản đã lưu mới nhất"
            fields={examFieldsOf(fresh)}
            revision={fresh.revision}
          />
        ) : null}
        <ConflictDraftSummary
          title="Bản đang sửa"
          fields={draft.fields}
          revision={draft.revision}
        />
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={!fresh || draft.pending}
          onClick={() => {
            draft.useLatest();
            setShow(false);
          }}
        >
          Bỏ sửa và dùng bản mới
        </Button>
        <Button onClick={() => setShow(false)}>Quay lại đối chiếu</Button>
      </div>
    </Dialog>
  );
}
