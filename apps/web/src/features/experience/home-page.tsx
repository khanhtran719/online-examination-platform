import { Link } from "react-router";
import { useSession } from "../../app/session";
import { useTitle } from "../../app/use-title";
import { CATEGORIES } from "../../shared/api/dto";
import { categoryLabel } from "../../shared/format";
import { HeroScene } from "./hero-scene";
import { SampleExperiencePanel } from "./sample-experience";
import styles from "./public.module.css";

const faqs = [
  {
    question: "Có thể thử trước khi tạo tài khoản không?",
    answer:
      "Có. Bạn có thể làm ba câu mẫu công khai ngay trên trang này. Trải nghiệm mẫu không tạo lượt thi và không phải kết quả thi chính thức.",
  },
  {
    question: "Khi nào câu trả lời trong bài thật được lưu?",
    answer:
      "Trạng thái đã lưu xuất hiện sau khi máy chủ xác nhận. Nếu mất kết nối, lựa chọn chưa được xác nhận vẫn cần được lưu lại trước khi hết thời gian.",
  },
  {
    question: "Tôi có thể xem đáp án sau khi nộp không?",
    answer:
      "Đáp án và lời giải chỉ xuất hiện khi chính sách của đề thi cho phép. Bạn có thể theo dõi trạng thái xử lý và xem kết quả trong lịch sử.",
  },
];

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

export function HomePage() {
  useTitle("Vào nhịp thi");
  const session = useSession();
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <span aria-hidden="true" /> Nền tảng thi trắc nghiệm trực tuyến
            </p>
            <h1 id="home-title">
              Vào nhịp thi.
              <br />
              <span>Tập trung vào từng câu trả lời.</span>
            </h1>
            <p className={styles.intro}>
              Một phòng thi rõ ràng, từ câu hỏi đầu tiên đến khi nộp bài. Theo dõi tiến độ, đánh dấu
              câu cần xem lại và làm bài theo nhịp của bạn.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.heroPrimary} to="/experience">
                Trải nghiệm 3 câu mẫu <span aria-hidden="true">→</span>
              </Link>
              <Link
                className={styles.heroSecondary}
                to={session.status === "authenticated" ? "/exams" : "/register"}
              >
                {session.status === "authenticated" ? "Đi tới đề thi" : "Tạo tài khoản thí sinh"}
              </Link>
            </div>
            <p className={styles.heroNote}>Thử ngay, không cần tài khoản</p>
            <div className={styles.heroFacts} aria-label="Trải nghiệm phòng thi">
              <div>
                <strong>Chuyển câu rõ ràng</strong>
                <span>Đi theo nhịp của bạn</span>
              </div>
              <div>
                <strong>Đánh dấu để xem lại</strong>
                <span>Quay lại khi cần</span>
              </div>
              <div>
                <strong>Biết trạng thái lưu</strong>
                <span>Xác nhận từ máy chủ</span>
              </div>
            </div>
          </div>
          <HeroScene />
        </div>
      </section>
      <section
        id="trai-nghiem-mau"
        className={styles.sampleSection}
        aria-labelledby="home-sample-title"
      >
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>TRẢI NGHIỆM TRƯỚC KHI BẮT ĐẦU</p>
          <h2 id="home-sample-title">Thử ngay 3 câu mẫu.</h2>
          <p>
            Chọn đáp án, đánh dấu và xem kết quả mẫu. Không tạo lượt thi, không giới hạn thời gian.
          </p>
        </div>
        <SampleExperiencePanel embedded />
      </section>
      <section className={styles.values} aria-labelledby="values-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>ĐƯỢC THIẾT KẾ CHO SỰ TẬP TRUNG</p>
          <h2 id="values-title">Một nhịp thi. Ba điều rõ ràng.</h2>
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
          Đăng nhập để xem đề thi. Điểm bài trắc nghiệm không quy đổi sang điểm kỳ thi hoặc chứng
          nhận chính thức.
        </p>
      </section>
      <section className={styles.faq} aria-labelledby="faq-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>TRƯỚC KHI BẮT ĐẦU</p>
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
      <section className={styles.finalCta} aria-labelledby="try-title">
        <div>
          <p className={styles.eyebrow}>VÀO NHỊP CỦA BẠN</p>
          <h2 id="try-title">Sẵn sàng cho câu đầu tiên?</h2>
          <p>Thử phòng thi mẫu, rồi chọn mục tiêu tiếp theo của bạn.</p>
        </div>
        <Link className={styles.heroPrimary} to="/experience">
          Trải nghiệm 3 câu mẫu <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
