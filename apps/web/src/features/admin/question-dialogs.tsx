import { useEffect, useState } from "react";

import type { AdminQuestion } from "@web/shared/api/dto";
import { Alert, Button, Dialog, ErrorPanel, SkeletonLines } from "@web/shared/ui/ui";

import styles from "./authoring.module.css";
import type { QuestionDraft } from "./use-question-draft";

export function QuestionDialogs({
  draft,
  initial,
  fetching,
  readError,
  onReload,
  archiveConfirm,
  cancelArchive,
}: {
  draft: QuestionDraft;
  initial: AdminQuestion | null;
  fetching?: boolean;
  readError?: unknown;
  onReload?: () => void;
  archiveConfirm: boolean;
  cancelArchive: () => void;
}) {
  const [sent, setSent] = useState(false),
    [compare, setCompare] = useState(false);
  useEffect(() => {
    setCompare(draft.conflict);
  }, [draft.conflict]);
  useEffect(() => {
    if (!archiveConfirm) setSent(false);
  }, [archiveConfirm]);
  useEffect(() => {
    if (sent && draft.archived) cancelArchive();
  }, [sent, draft.archived, cancelArchive]);
  return (
    <>
      {draft.nextType ? (
        <Dialog title="Đổi loại câu hỏi" onClose={() => draft.setNextType(null)}>
          <p>
            {draft.nextType === "TRUE_FALSE"
              ? "Chỉ hai lựa chọn đầu được giữ và chỉ một đáp án đúng. Các lựa chọn còn lại sẽ bị bỏ khỏi bản đang sửa."
              : "Loại mới chỉ giữ một đáp án đúng. Nội dung các lựa chọn được giữ."}{" "}
            Kiểm tra lại sau khi đổi.
          </p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => draft.setNextType(null)}>
              Hủy
            </Button>
            <Button onClick={() => draft.applyType(draft.nextType!)}>Đổi loại</Button>
          </div>
        </Dialog>
      ) : null}
      {archiveConfirm && !draft.conflict ? (
        <Dialog title="Lưu trữ câu hỏi" onClose={draft.pending ? undefined : cancelArchive}>
          <p>
            Câu được lưu trữ sẽ không thể thêm vào đề mới. Các phiên bản đã phát hành và lượt thi cũ
            giữ nội dung đã khóa. Thay đổi chưa lưu không được ghi lại.
          </p>
          {sent && draft.pending ? <p role="status">Đang chờ máy chủ xác nhận…</p> : null}
          {sent && draft.error && !draft.unknown ? <ErrorPanel error={draft.error} /> : null}
          {sent && draft.unknown ? (
            <p>Chưa xác nhận được kết quả. Thử lại giữ nguyên yêu cầu.</p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={draft.pending} onClick={cancelArchive}>
              Hủy
            </Button>
            <Button
              variant="danger"
              disabled={draft.pending || draft.archived}
              onClick={() => {
                setSent(true);
                if (draft.unknown) void draft.retry();
                else draft.archive();
              }}
            >
              {draft.unknown ? "Thử lại yêu cầu" : "Xác nhận"}
            </Button>
          </div>
        </Dialog>
      ) : null}
      {draft.conflict && !compare ? (
        <Alert tone="warning" title="Câu hỏi đã thay đổi ở nơi khác">
          <Button onClick={() => setCompare(true)}>Đối chiếu câu hỏi</Button>
        </Alert>
      ) : null}
      {draft.conflict && compare ? (
        <Dialog
          title="Câu hỏi đã thay đổi ở nơi khác"
          className={styles.compare}
          onClose={() => setCompare(false)}
        >
          <p>Bản đang sửa vẫn được giữ. Không tự gộp hoặc ghi đè thay đổi.</p>
          {fetching ? <SkeletonLines /> : null}
          {readError ? <ErrorPanel error={readError} onRetry={onReload} /> : null}
          <div className={styles.comparison}>
            <section>
              <h3>Bản đã lưu mới nhất</h3>
              {initial && initial.revision > draft.revision && !fetching && !readError ? (
                <>
                  <p>
                    Bản sửa {initial.revision} · {initial.points} điểm
                  </p>
                  <p>{initial.prompt}</p>
                  <ol className={styles.compareList}>
                    {initial.options.map((o) => (
                      <li key={o.position}>
                        {o.text}
                        {initial.correctOptionPositions.includes(o.position)
                          ? " · Đáp án đúng"
                          : ""}
                      </li>
                    ))}
                  </ol>
                  <p>{initial.explanation}</p>
                </>
              ) : (
                <p>Chưa có bản mới để đối chiếu.</p>
              )}
            </section>
            <section>
              <h3>Bản đang sửa</h3>
              <p>
                Bản sửa {draft.revision} · {draft.points} điểm
              </p>
              <p>{draft.prompt}</p>
              <ol className={styles.compareList}>
                {draft.fields.options.map((o) => (
                  <li key={o.id}>
                    {o.text}
                    {draft.fields.correctIds.includes(o.id) ? " · Đáp án đúng" : ""}
                  </li>
                ))}
              </ol>
              <p>{draft.explanation}</p>
            </section>
          </div>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={
                !initial || initial.revision <= draft.revision || fetching || Boolean(readError)
              }
              onClick={() => {
                draft.adoptLatest();
                cancelArchive();
              }}
            >
              Bỏ sửa và dùng bản mới
            </Button>
            <Button onClick={() => setCompare(false)}>Giữ bản đang sửa</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
