import { shortId } from "../../shared/format";
import { Button, Dialog, ErrorPanel } from "../../shared/ui/ui";
import styles from "../../shared/styles/layout.module.css";
import { viewAnswer } from "./autosave";
import type { useExamRoom } from "./use-exam-room";

export function RoomDialogs({
  room,
  progress,
  confirmSubmit,
  leave,
  onCloseSubmit,
  onCloseLeave,
  onLeave,
}: {
  room: ReturnType<typeof useExamRoom>;
  progress: string;
  confirmSubmit: boolean;
  leave: boolean;
  onCloseSubmit: () => void;
  onCloseLeave: () => void;
  onLeave: () => void;
}) {
  return (
    <>
      {confirmSubmit ? (
        <Dialog title="Nộp bài" onClose={() => onCloseSubmit()}>
          <p>
            Các thay đổi chưa được xác nhận sẽ được lưu trước nếu còn giờ. Nộp bài không gửi lại nội
            dung đáp án.
          </p>
          <p>{progress}</p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => onCloseSubmit()}>
              Chưa nộp
            </Button>
            <Button
              onClick={() => {
                onCloseSubmit();
                room.requestSubmit();
              }}
            >
              Nộp các đáp án đã lưu
            </Button>
          </div>
        </Dialog>
      ) : null}
      {room.submit.phase === "save-blocked" ? (
        <Dialog title="Chưa lưu được trước khi nộp">
          <p>
            Còn giờ, nhưng một phần thay đổi chưa được máy chủ xác nhận. Có thể thử lại hoặc hủy
            nộp.
          </p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={room.cancelSubmit}>
              Hủy nộp
            </Button>
            <Button onClick={room.retrySubmit}>Thử lưu lại</Button>
          </div>
        </Dialog>
      ) : null}
      {room.save.phase === "conflict" ? (
        <Dialog title="Đáp án đã thay đổi ở nơi khác">
          <p>
            Bản trên trình duyệt được giữ. Hãy chọn một cách xử lý. Ứng dụng không tự lấy bản ghi
            sau cùng.
          </p>
          {room.conflictError ? (
            <ErrorPanel error={room.conflictError} onRetry={room.reloadConflict} />
          ) : null}
          <ul>
            {room.save.conflictQuestionIds.map((questionId) => {
              const mine = viewAnswer(room.save, questionId);
              const server = room.conflictAnswers.find(
                (answer) => answer.questionId === questionId,
              );
              return (
                <li key={questionId}>
                  Câu {shortId(questionId)} · của bạn {mine.selectedOptionIds.length} lựa chọn · máy
                  chủ{" "}
                  {server
                    ? `${server.selectedOptionIds.length} lựa chọn, phiên bản ${server.version}`
                    : "chưa tải"}
                </li>
              );
            })}
          </ul>
          <div className={styles.row}>
            <Button
              variant="secondary"
              disabled={room.conflictAnswers.length === 0}
              onClick={room.resolveServer}
            >
              Dùng bản máy chủ
            </Button>
            <Button disabled={room.conflictAnswers.length === 0} onClick={room.resolveMine}>
              Giữ lựa chọn của tôi
            </Button>
          </div>
        </Dialog>
      ) : null}
      {leave ? (
        <Dialog title="Rời phòng khi còn thay đổi" onClose={() => onCloseLeave()}>
          <p>Thay đổi chưa xác nhận sẽ mất khỏi trình duyệt.</p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => onCloseLeave()}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => onLeave()}>
              Vẫn rời
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
