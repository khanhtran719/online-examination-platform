import { shortId } from "@web/shared/format";
import styles from "@web/shared/styles/layout.module.css";
import { Button, Dialog, ErrorPanel } from "@web/shared/ui/ui";

import { viewAnswer } from "./autosave";
import roomStyles from "./room.module.css";
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
  const questions = new Map(
    (room.questions.data?.pages ?? [])
      .flatMap((page) => page.items)
      .map((question, index) => [question.id, { ...question, position: index + 1 }]),
  );
  return (
    <>
      {confirmSubmit && room.save.authenticated ? (
        <Dialog title="Nộp bài" onClose={() => onCloseSubmit()}>
          <p>
            Các thay đổi chưa được xác nhận sẽ được lưu trước nếu còn giờ. Sau khi nộp, bạn không
            thể sửa đáp án. Chỉ thông báo xác nhận mới có nghĩa bài đã được nộp.
          </p>
          <p>{progress}</p>
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => onCloseSubmit()}>
              Chưa nộp
            </Button>
            <Button
              disabled={!room.canSubmit}
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
      {room.submit.phase === "save-blocked" && room.save.authenticated ? (
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
      {room.save.phase === "conflict" && room.save.authenticated && !room.recovering ? (
        <Dialog title="Đáp án đã thay đổi ở nơi khác" className={roomStyles.conflictDialog}>
          <p>
            Lựa chọn của bạn được giữ trên trang. So sánh với bản mới nhất trước khi quyết định.
          </p>
          {room.conflictError ? (
            <ErrorPanel error={room.conflictError} onRetry={room.reloadConflict} />
          ) : null}
          {!room.conflictReady && !room.conflictError ? (
            <p>Chưa tải đủ bản mới nhất. Chưa thể chọn cách xử lý.</p>
          ) : null}
          <ul className={roomStyles.comparisons}>
            {room.save.conflictQuestionIds.map((questionId) => {
              const mine = viewAnswer(room.save, questionId);
              const server = room.conflictAnswers.find(
                (answer) => answer.questionId === questionId,
              );
              const question = questions.get(questionId);
              function choices(ids: readonly string[]) {
                return ids.length === 0
                  ? "Chưa chọn đáp án"
                  : ids
                      .map(
                        (id) =>
                          question?.options.find((option) => option.id === id)?.text ??
                          `Lựa chọn ${shortId(id)}`,
                      )
                      .join(" · ");
              }
              return (
                <li key={questionId}>
                  <h3>Câu {question?.position ?? shortId(questionId)}</h3>
                  <dl>
                    <div>
                      <dt>Lựa chọn của bạn</dt>
                      <dd>
                        {choices(mine.selectedOptionIds)} ·{" "}
                        {mine.marked ? "Có đánh dấu" : "Không đánh dấu"}
                      </dd>
                    </div>
                    <div>
                      <dt>Bản máy chủ</dt>
                      <dd>
                        {server
                          ? `${choices(server.selectedOptionIds)} · ${server.marked ? "Có đánh dấu" : "Không đánh dấu"} · Bản ${server.version}`
                          : "Chưa tải đủ"}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
          <div className={styles.row}>
            <Button
              variant="secondary"
              disabled={!room.conflictReady || !room.save.canSave || !room.save.authenticated}
              onClick={room.resolveServer}
            >
              Dùng bản máy chủ
            </Button>
            <Button
              disabled={!room.conflictReady || !room.save.canSave || !room.save.authenticated}
              onClick={room.resolveMine}
            >
              Giữ lựa chọn của tôi
            </Button>
            <Button variant="secondary" onClick={room.reloadConflict}>
              Tải lại bản mới nhất
            </Button>
          </div>
        </Dialog>
      ) : null}
      {leave ? (
        <Dialog title="Rời phòng khi còn thay đổi" onClose={() => onCloseLeave()}>
          <p>
            Thay đổi chưa xác nhận có thể mất khi rời trang. Nếu đang nộp, hãy kiểm tra trạng thái
            trong lịch sử thi trước khi bắt đầu lượt mới.
          </p>
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
