import { useState } from "react";
import { useTitle } from "../app/use-title";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  PasswordField,
  SelectField,
  SkeletonLines,
  TableScroll,
  TextArea,
  TextField,
  tableClass,
} from "../shared/ui/ui";
import styles from "../shared/styles/layout.module.css";

export default function DevUi() {
  useTitle("Thư viện giao diện");
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Thư viện giao diện</h1>
      <p>Trang này chỉ có trong bản demo.</p>
      <h2>Hành động</h2>
      <div className={styles.row}>
        <Button>Chính</Button>
        <Button variant="secondary">Phụ</Button>
        <Button variant="danger">Nguy hiểm</Button>
        <Button variant="ghost">Nhẹ</Button>
        <Button disabled>Đang lưu…</Button>
      </div>
      <h2>Nhập liệu</h2>
      <TextField label="Ô nhập" value="Lan Nguyễn" readOnly />
      <PasswordField label="Mật khẩu mẫu" defaultValue="fixture-password-ok" />
      <SelectField label="Danh mục mẫu" defaultValue="IT_CERTIFICATION">
        <option value="IT_CERTIFICATION">IT Certification</option>
        <option value="TOEIC">TOEIC</option>
      </SelectField>
      <TextArea label="Nội dung mẫu" defaultValue="Chọn đáp án đúng cho từng câu hỏi." />
      <TextField label="Ô nhập có lỗi" defaultValue="" error="Nhập tên hiển thị để tiếp tục." />
      <TextField label="Ô nhập bị khóa" value="Chỉ đọc trong trạng thái này" disabled />
      <h2>Trạng thái</h2>
      <div className={styles.row}>
        <Badge>Đang làm bài</Badge>
        <Badge>Phiên bản 1</Badge>
      </div>
      <Alert tone="success" title="Đã lưu">
        Máy chủ đã xác nhận.
      </Alert>
      <Alert tone="warning" title="Còn thay đổi">
        Chưa có xác nhận.
      </Alert>
      <Alert title="Không lưu được">Hãy thử lại.</Alert>
      <EmptyState title="Chưa có dữ liệu" action={<Button>Tạo mới</Button>}>
        Trạng thái rỗng có việc tiếp theo.
      </EmptyState>
      <SkeletonLines />
      <h2>Bảng dữ liệu</h2>
      <p className={styles.muted}>
        Dữ liệu minh họa. Trên màn nhỏ, dùng phím mũi tên để cuộn bảng.
      </p>
      <TableScroll label="Bảng đề thi minh họa">
        <table className={tableClass}>
          <thead>
            <tr>
              <th scope="col">Đề thi</th>
              <th scope="col">Danh mục</th>
              <th scope="col">Thời lượng</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Networking Fundamentals</td>
              <td>IT Certification</td>
              <td>45 phút</td>
              <td>Đã phát hành</td>
            </tr>
            <tr>
              <td>Reading practice</td>
              <td>TOEIC</td>
              <td>30 phút</td>
              <td>Bản nháp</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <h2>Hộp thoại</h2>
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
