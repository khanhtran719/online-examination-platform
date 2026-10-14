import { Link } from "react-router";

import styles from "./home.module.css";

const faqs = [
  {
    question: "Có thể thử trước khi tạo tài khoản không?",
    answer:
      "Có. Bạn có thể làm ba câu mẫu công khai ngay trên trang này. Trải nghiệm mẫu không tạo lượt thi và không phải kết quả thi chính thức. Tải lại hoặc rời trang sẽ bắt đầu lại.",
  },
  {
    question: "Khi nào câu trả lời trong bài thật được lưu?",
    answer:
      "Câu trả lời chỉ được xem là đã lưu khi máy chủ xác nhận. “Đang lưu…” chưa phải xác nhận đã lưu. Thay đổi chưa được xác nhận có thể mất khi tải lại, đóng tab hoặc rời phòng thi.",
  },
  {
    question: "Rời phòng thi có dừng đồng hồ không?",
    answer:
      "Không. Thời hạn do máy chủ đặt vẫn tiếp tục khi đổi tab, mất mạng hoặc rời phòng thi. Quay lại không đặt lại thời gian; những thay đổi chưa lưu không tự trở thành đáp án đã ghi nhận.",
  },
  {
    question: "Vì sao chưa có kết quả ngay sau khi nộp?",
    answer:
      "Sau khi máy chủ xác nhận nộp, bài cần được xử lý để chấm điểm. Chưa có điểm không phải điểm bằng không. Theo dõi trạng thái bài hoặc lịch sử; đáp án và lời giải chỉ xuất hiện khi chính sách của đề cho phép.",
  },
];

export function HomeJourney() {
  return (
    <section className={styles.journey} aria-labelledby="home-journey-title">
      <div className={styles.journeyInner}>
        <div>
          <p className={styles.eyebrow}>HƯỚNG DẪN TRƯỚC GIỜ THI</p>
          <h2 id="home-journey-title">Biết từng bước trước khi bắt đầu.</h2>
          <p>
            Từ tạo tài khoản và xác thực email đến chọn đề, làm bài và theo dõi kết quả. Đọc hướng
            dẫn chi tiết trước khi bắt đầu lượt thi thật.
          </p>
        </div>
        <div className={styles.journeyActions}>
          <Link className={styles.heroPrimary} to="/how-it-works">
            Xem hướng dẫn 5 bước <span aria-hidden="true">→</span>
          </Link>
          <Link className={styles.textLink} to="/help">
            Mở trang trợ giúp <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section className={styles.faq} aria-labelledby="faq-title">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>MINH BẠCH VÀ RÕ RÀNG</p>
        <h2 id="faq-title">Những điều bạn có thể muốn biết.</h2>
      </div>
      <div className={styles.faqItems}>
        {faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
