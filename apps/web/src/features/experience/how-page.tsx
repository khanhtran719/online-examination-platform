import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { ActionLink } from "@web/shared/ui/ui";

import { GuidePaper } from "./guide-paper";
import styles from "./public-guides.module.css";

const steps = [
  {
    title: "Tạo tài khoản",
    phase: "Khởi tạo",
    copy: "Nhập email, tên hiển thị và mật khẩu. Đăng ký chỉ gửi yêu cầu, không tự đăng nhập.",
    to: "/register",
    link: "Tạo tài khoản",
  },
  {
    title: "Xác thực email, đăng nhập",
    phase: "Kích hoạt",
    copy: "Mở liên kết trong email, chọn mật khẩu cuối rồi bấm xác nhận. Sau khi xác thực, đăng nhập bằng email và mật khẩu; mở liên kết không tự kích hoạt tài khoản.",
    to: "/login",
    link: "Đăng nhập",
  },
  {
    title: "Chọn đề, đọc hướng dẫn",
    phase: "Chuẩn bị",
    copy: "Kiểm tra thời lượng, thời gian mở và đóng, số lượt cho phép, các phần thi và chính sách lời giải. Đề thi thật cần đăng nhập.",
    to: "/exams",
    link: "Khám phá đề thi",
  },
  {
    title: "Làm bài, đánh dấu, rà soát",
    phase: "Trong phòng thi",
    copy: "Chọn câu trả lời, chuyển câu và đánh dấu câu cần xem lại. Quan sát trạng thái lưu; chỉ xem là đã lưu khi máy chủ xác nhận.",
    to: "/help",
    link: "Hướng dẫn trong phòng thi",
  },
  {
    title: "Nộp bài, theo dõi kết quả",
    phase: "Hoàn tất",
    copy: "Rà soát trước khi xác nhận nộp. Theo dõi xử lý cho đến khi có kết quả; lời giải và bảng xếp hạng chỉ xuất hiện khi chính sách của đề cho phép. Lịch sử thi cần đăng nhập.",
    to: "/history",
    link: "Xem lịch sử thi",
  },
];
const reminders = [
  {
    title: "Chờ xác nhận lưu",
    copy: "“Đang lưu…” chưa phải “Đã lưu lúc …”. Tải lại hoặc đóng tab có thể làm mất thay đổi chưa lưu.",
  },
  {
    title: "Thời gian vẫn tiếp tục",
    copy: "Đổi tab, rời phòng thi hoặc mất mạng không dừng thời hạn mà máy chủ đã đặt.",
  },
  {
    title: "Chọn đủ đáp án",
    copy: "Câu nhiều lựa chọn cần đúng toàn bộ tập đáp án. Chọn thiếu hoặc thừa không có điểm một phần.",
  },
];

export function HowPage() {
  useTitle("Cách hoạt động");
  return (
    <div className={styles.page}>
      <section className={styles.guideHero} aria-labelledby="guide-title">
        <div>
          <p className={styles.eyebrow}>Cách hoạt động</p>
          <h1 id="guide-title">
            Bắt đầu rõ ràng.
            <br />
            <span>Làm bài tự tin.</span>
          </h1>
          <p>
            Biết điều cần chuẩn bị, cách lưu câu trả lời và nơi theo dõi kết quả trước khi bắt đầu.
          </p>
          <div className={styles.actions}>
            <ActionLink to="/experience">Thử 3 câu mẫu</ActionLink>
            <ActionLink to="/register" variant="secondary">
              Tạo tài khoản
            </ActionLink>
          </div>
        </div>
        <figure className={styles.heroPaper}>
          <GuidePaper />
          <figcaption>Minh họa giao diện</figcaption>
        </figure>
      </section>
      <section className={styles.guideSection} aria-labelledby="guide-steps">
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Từng bước một</p>
            <h2 id="guide-steps">Hành trình 5 bước</h2>
          </div>
          <p>Từ tài khoản đến kết quả, mỗi bước đều có thông tin để bạn kiểm tra.</p>
        </header>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className={styles.stepTop}>
                <span className={styles.ordinal} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.phase}>{step.phase}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <Link to={step.to}>
                {step.link}
                <span aria-hidden="true"> →</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.reminders} aria-labelledby="guide-reminders">
        <h2 id="guide-reminders">Ba điều cần nhớ trước giờ thi</h2>
        <ul>
          {reminders.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.closing} aria-labelledby="guide-next">
        <div>
          <h2 id="guide-next">Làm quen trước khi bắt đầu</h2>
          <p>
            Ba câu mẫu không cần tài khoản và không tạo lượt thi thật. Lựa chọn mẫu chỉ ở trong bộ
            nhớ của trang.
          </p>
        </div>
        <div className={styles.actions}>
          <ActionLink to="/help" variant="secondary">
            Đọc câu hỏi thường gặp
          </ActionLink>
          <ActionLink to="/experience">Thử 3 câu mẫu</ActionLink>
        </div>
      </section>
    </div>
  );
}
