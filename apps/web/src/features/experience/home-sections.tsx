import { Link } from "react-router";

import { CATEGORIES } from "@web/shared/api/dto";
import { categoryLabel } from "@web/shared/format";

import styles from "./home.module.css";

const categories = {
  TOEIC: "Luyện tập trắc nghiệm tiếng Anh theo mục tiêu của bạn.",
  IELTS: "Khám phá các đề trắc nghiệm kiến thức tiếng Anh.",
  IT_CERTIFICATION: "Củng cố nền tảng và kiến thức công nghệ thông tin.",
  UNIVERSITY: "Ôn tập kiến thức và làm quen với nhịp thi đại học.",
  RECRUITMENT: "Thực hành tư duy và kiến thức cho tuyển dụng.",
  CORPORATE: "Đánh giá kiến thức trong chương trình nội bộ.",
};
const benefits = [
  {
    icon: "≡",
    title: "Thấy rõ tiến độ",
    copy: "Biết câu nào đã làm, câu nào còn chờ. Phiếu câu hỏi giúp bạn nhìn toàn cảnh và quay lại đúng chỗ.",
    note: "Phiếu câu hỏi rõ ràng",
  },
  {
    icon: "↔",
    title: "Giữ mạch làm bài",
    copy: "Chuyển câu linh hoạt, đánh dấu điều cần xem lại. Từng lựa chọn và trạng thái lưu luôn có thông báo riêng.",
    note: "Chọn · Đánh dấu · Xem lại",
  },
  {
    icon: "✓",
    title: "Rõ ràng khi kết thúc",
    copy: "Kiểm tra lựa chọn trước khi nộp, theo dõi xử lý và xem kết quả theo chính sách của đề thi.",
    note: "Nộp bài và theo dõi kết quả",
  },
];

export function HomeCategories() {
  return (
    <section className={styles.categories} aria-labelledby="category-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>TÌM ĐÚNG HƯỚNG CỦA BẠN</p>
          <h2 id="category-title">Danh mục đề thi</h2>
        </div>
        <Link className={styles.textLink} to="/exams">
          Khám phá đề thi <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className={styles.categoryLinks}>
        {CATEGORIES.map((category, index) => (
          <Link key={category} to={`/exams?category=${category}`}>
            <span className={styles.categoryIcon} aria-hidden="true">
              {["Aa", "Ab", "</>", "∑", "↗", "≡"][index]}
            </span>
            <h3>{categoryLabel(category)}</h3>
            <p>{categories[category]}</p>
            <span className={styles.categoryAction}>
              Xem danh mục <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
      <p className={styles.categoryNote}>
        Đăng nhập để xem đề thi. Điểm bài trắc nghiệm không quy đổi sang điểm kỳ thi hoặc chứng nhận
        chính thức.
      </p>
    </section>
  );
}

export function HomeBenefits() {
  return (
    <section className={styles.values} aria-labelledby="values-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>ĐƯỢC THIẾT KẾ CHO SỰ TẬP TRUNG</p>
          <h2 id="values-title">Một nhịp thi. Ba điều rõ ràng.</h2>
        </div>
      </div>
      <div className={styles.benefits}>
        {benefits.map((benefit) => (
          <article key={benefit.title}>
            <span className={styles.benefitIcon} aria-hidden="true">
              {benefit.icon}
            </span>
            <h3>{benefit.title}</h3>
            <p>{benefit.copy}</p>
            <span className={styles.benefitNote}>{benefit.note}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
