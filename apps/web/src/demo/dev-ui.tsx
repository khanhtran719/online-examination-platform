import { useState } from "react";
import { useTitle } from "../app/use-title";
import { Alert, Button, Dialog, EmptyState, SkeletonLines, TextField } from "../shared/ui/ui";
import styles from "../shared/styles/layout.module.css";

export default function DevUi() {
  useTitle("Thư viện giao diện");
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Thư viện giao diện</h1>
      <p>Trang này chỉ có trong bản demo.</p>
      <div className={styles.row}>
        <Button>Chính</Button>
        <Button variant="secondary">Phụ</Button>
        <Button variant="danger">Nguy hiểm</Button>
        <Button variant="ghost">Nhẹ</Button>
      </div>
      <TextField label="Ô nhập" value="Lan Nguyễn" readOnly />
      <Alert tone="success" title="Đã lưu">Máy chủ đã xác nhận.</Alert>
      <Alert tone="warning" title="Còn thay đổi">Chưa có xác nhận.</Alert>
      <Alert title="Không lưu được">Hãy thử lại.</Alert>
      <EmptyState title="Chưa có dữ liệu" action={<Button>Tạo mới</Button>}>
        Trạng thái rỗng có việc tiếp theo.
      </EmptyState>
      <SkeletonLines />
      <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
      {open ? (
        <Dialog title="Hộp thoại" onClose={() => setOpen(false)}>
          <p>Tiêu điểm nằm trong hộp thoại. Escape đóng hộp thoại.</p>
          <Button onClick={() => setOpen(false)}>Đóng</Button>
        </Dialog>
      ) : null}
    </div>
  );
}
