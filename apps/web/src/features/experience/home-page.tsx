import { Link } from "react-router";
import { useSession } from "../../app/session";
import { useTitle } from "../../app/use-title";
import { CATEGORIES } from "../../shared/api/dto";
import { categoryLabel } from "../../shared/format";
import { HeroScene } from "./hero-scene";
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

export function HomePage() {
  useTitle("Vào nhịp thi");
  const session = useSession();
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>
              <span aria-hidden="true" />
              Nền tảng thi trắc nghiệm trực tuyến
            </p>
            <h1 id="home-title">
              Vào nhịp thi.
              <br />
              <span>Tập trung vào</span>
              <br />
              từng câu trả lời.
            </h1>
            <p className={styles.intro}>
              Một phòng thi rõ ràng, từ câu hỏi đầu tiên đến khi nộp bài. Theo dõi tiến độ, đánh dấu
              câu cần xem lại và làm bài theo nhịp của bạn.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.heroPrimary} to="/experience">
                Trải nghiệm 3 câu mẫu <span aria-hidden="true">→</span>
              </Link>
              <p>Thử ngay, không cần tài khoản</p>
            </div>
            <Link
              className={styles.readyLink}
              to={session.status === "authenticated" ? "/exams" : "/register"}
            >
              {session.status === "authenticated" ? "Đi tới đề thi" : "Đã sẵn sàng? Tạo tài khoản"}
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <HeroScene />
        </div>
        <div className={styles.benefits} aria-label="Trải nghiệm phòng thi">
          <div>
            <span aria-hidden="true">✓</span>
            <div>
              <h2>Thấy rõ tiến độ</h2>
              <p>Biết câu nào đã làm, câu nào còn chờ.</p>
            </div>
          </div>
          <div>
            <span aria-hidden="true">→</span>
            <div>
              <h2>Giữ mạch làm bài</h2>
              <p>Chuyển câu và quay lại khi cần.</p>
            </div>
          </div>
          <div>
            <span aria-hidden="true">↗</span>
            <div>
              <h2>Rõ ràng khi kết thúc</h2>
              <p>Xem lại lựa chọn trước khi nộp.</p>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.how} aria-labelledby="how-title">
        <div className={styles.howIntro}>
          <p className={styles.eyebrow}>Bắt đầu thật nhẹ nhàng</p>
          <h2 id="how-title">
            Ba câu nhỏ.
            <br />
            Một cảm nhận rõ ràng.
          </h2>
          <p>
            Thử chọn đáp án, đánh dấu một câu và xem kết quả mẫu. Cảm nhận cách làm bài trước khi
            bắt đầu.
          </p>
          <Link className={styles.textLink} to="/experience">
            Thử phòng thi mẫu <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ol className={styles.steps}>
          <li>
            <span>1</span>
            <div>
              <h3>Khám phá phòng thi</h3>
              <p>Vào ngay với bộ ba câu minh họa.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Làm theo nhịp của bạn</h3>
              <p>Thử câu một đáp án, nhiều đáp án và đúng / sai.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Sẵn sàng bắt đầu?</h3>
              <p>Tạo tài khoản, xác nhận email, rồi chọn đề và làm bài.</p>
            </div>
          </li>
        </ol>
      </section>
      <section className={styles.categories} aria-labelledby="category-title">
        <p className={styles.eyebrow}>Tìm đúng hướng của bạn</p>
        <h2 id="category-title">Một lối vào cho từng mục tiêu.</h2>
        <div className={styles.categoryLinks}>
          {CATEGORIES.map((category) => (
            <Link key={category} to={`/exams?category=${category}`}>
              {categoryLabel(category)}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
        <p className={styles.categoryNote}>
          Đăng nhập để xem đề thi. Điểm bài trắc nghiệm không quy đổi sang điểm kỳ thi hoặc chứng
          nhận chính thức.
        </p>
      </section>
      <section className={styles.faq} aria-labelledby="faq-title">
        <div>
          <p className={styles.eyebrow}>Trước khi bắt đầu</p>
          <h2 id="faq-title">
            Những điều bạn
            <br />
            có thể muốn biết.
          </h2>
        </div>
        <div>
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
          <p className={styles.heroEyebrow}>Vào nhịp của bạn</p>
          <h2 id="try-title">Bắt đầu với câu đầu tiên.</h2>
        </div>
        <Link className={styles.heroPrimary} to="/experience">
          Trải nghiệm 3 câu mẫu <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
