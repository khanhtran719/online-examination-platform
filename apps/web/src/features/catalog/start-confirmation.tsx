import type { Exam } from "@web/shared/api/dto";
import { formatDateTime, formatDuration } from "@web/shared/format";
import { actionsClass, Alert, Button, Dialog, ErrorPanel } from "@web/shared/ui/ui";

import styles from "./catalog-port.module.css";
import type { useExamStart } from "./use-exam-start";

export function StartConfirmation({
  exam,
  start,
}: {
  exam: Exam;
  start: ReturnType<typeof useExamStart>;
}) {
  return (
    <Dialog title="Xác nhận bắt đầu" onClose={start.canClose ? start.close : undefined}>
      <div className={styles.confirmSummary}>
        <p className={styles.badge}>Phiên bản đang xem {exam.version}</p>
        <h3>{exam.title}</h3>
        <p>
          {formatDuration(exam.durationSeconds)} · {exam.questionCount} câu · Giới hạn{" "}
          {exam.attemptLimit} lượt
        </p>
        <p>
          Đóng lúc {formatDateTime(exam.closeAt, exam.displayTimezone)} · {exam.displayTimezone}
        </p>
      </div>
      <ul className={styles.instructions}>
        <li>Vào gần giờ đóng có thể ít thời gian hơn thời lượng đầy đủ.</li>
        <li>Câu nhiều lựa chọn cần chọn đúng toàn bộ đáp án để có điểm.</li>
        <li>
          Lượt mới được tính sau khi hệ thống ghi nhận bắt đầu; nếu có lượt đang làm, bạn sẽ tiếp
          tục lượt đó.
        </li>
        <li>Khi hết giờ, hệ thống tự nộp các đáp án đã lưu đúng hạn.</li>
      </ul>
      {start.phase === "unknown" ? (
        <Alert tone="warning" title="Chưa nhận được xác nhận">
          Yêu cầu có thể đã được nhận. Thử lại cùng yêu cầu để xác minh và vào đúng lượt thi; đóng
          trang không hủy lượt đã tạo.
        </Alert>
      ) : null}
      {start.error ? <ErrorPanel error={start.error} /> : null}
      <div className={actionsClass}>
        <Button variant="secondary" disabled={!start.canClose} onClick={start.close}>
          Chưa bắt đầu
        </Button>
        <Button
          disabled={start.pending || start.phase === "accepted"}
          onClick={() => void start.send()}
        >
          {start.pending
            ? "Đang bắt đầu…"
            : start.phase === "unknown"
              ? "Thử lại cùng yêu cầu"
              : "Bắt đầu"}
        </Button>
      </div>
    </Dialog>
  );
}
