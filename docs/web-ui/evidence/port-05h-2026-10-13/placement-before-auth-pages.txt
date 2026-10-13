import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import styles from "@web/shared/styles/layout.module.css";

export { CheckEmailPage } from "./check-email-page";
export { LoginForm } from "./login-form";
export { LoginPage } from "./login-page";
export { RegisterForm } from "./register-form";
export { RegisterPage } from "./register-page";
export { VerifyForm } from "./verify-form";
export { VerifyPage } from "./verify-page";

export function HowPage() {
  useTitle("Cách hoạt động");
  return (
    <div className={`${styles.wrap} ${styles.reading}`}>
      <h1 className={styles.title}>Cách hoạt động</h1>
      <ol className={styles.stack}>
        <li>Tạo tài khoản. Hệ thống chỉ báo đã nhận yêu cầu, không đăng nhập ngay.</li>
        <li>
          Mở liên kết xác nhận, chọn mật khẩu cuối và bấm xác nhận. Mở liên kết không tự kích hoạt
          tài khoản.
        </li>
        <li>Đăng nhập bằng email và mật khẩu. Phiên nằm trong cookie của trình duyệt.</li>
        <li>Bắt đầu lượt thi. Câu trả lời được lưu theo lô sau khi máy chủ xác nhận.</li>
        <li>Nộp bài. Điểm xuất hiện khi máy chủ xử lý xong, không được tính trong trình duyệt.</li>
      </ol>
    </div>
  );
}

export function HelpPage() {
  useTitle("Trợ giúp");
  return (
    <div className={`${styles.wrap} ${styles.reading}`}>
      <h1 className={styles.title}>Trợ giúp</h1>
      <div className={styles.card}>
        <h2>Lưu câu trả lời</h2>
        <p>
          “Đã lưu” chỉ xuất hiện sau khi máy chủ xác nhận. Mất kết nối nghĩa là thay đổi vẫn nằm
          trên trình duyệt.
        </p>
      </div>
      <div className={styles.card}>
        <h2>Xung đột</h2>
        <p>
          Nếu cùng một câu đổi ở nơi khác, bạn chọn giữ lựa chọn của mình hoặc dùng bản máy chủ. Ứng
          dụng không tự ghi đè.
        </p>
      </div>
      <div className={styles.card}>
        <h2>Hết giờ</h2>
        <p>
          Đồng hồ dựa trên giờ máy chủ. Hết giờ thì không lưu thêm; những câu chưa được xác nhận
          được thông báo riêng.
        </p>
      </div>
      <p className={styles.muted}>Chưa có kênh hỗ trợ vận hành.</p>
    </div>
  );
}

export function NotFoundPage() {
  useTitle("Không có trang");
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Không có trang này</h1>
      <Link className={styles.chip} to="/">
        Về trang chủ
      </Link>
    </div>
  );
}
