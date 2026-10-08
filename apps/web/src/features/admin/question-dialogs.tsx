import type { QuestionType } from "../../shared/api/dto";
import { Button, Dialog } from "../../shared/ui/ui";
import styles from "./admin.module.css";

export function QuestionDialogs({
  nextType,
  changeType,
  cancelType,
  archiveConfirm,
  archive,
  cancelArchive,
  pending,
}: {
  nextType: QuestionType | null;
  changeType: () => void;
  cancelType: () => void;
  archiveConfirm: boolean;
  archive: () => void;
  cancelArchive: () => void;
  pending: boolean;
}) {
  return (
    <>
      {nextType ? (
        <Dialog title="Đổi loại câu hỏi" onClose={cancelType}>
          <p>
            Loại mới chỉ giữ một đáp án đúng. Nếu chọn Đúng/Sai, chỉ hai lựa chọn đầu được giữ. Kiểm
            tra lại nội dung sau khi đổi.
          </p>
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={cancelType}>
              Hủy
            </Button>
            <Button type="button" onClick={changeType}>
              Đổi loại
            </Button>
          </div>
        </Dialog>
      ) : null}
      {archiveConfirm ? (
        <Dialog title="Lưu trữ câu hỏi" onClose={cancelArchive}>
          <p>
            Câu được lưu trữ sẽ không thể thêm vào đề mới. Các phiên bản đã phát hành và lượt thi cũ
            giữ nội dung đã khóa.
          </p>
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={cancelArchive}>
              Hủy
            </Button>
            <Button type="button" variant="danger" disabled={pending} onClick={archive}>
              Xác nhận
            </Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
