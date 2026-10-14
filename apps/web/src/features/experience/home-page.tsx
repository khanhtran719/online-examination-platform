import { Link } from "react-router";

import { useSession } from "@web/app/session";
import { useTitle } from "@web/app/use-title";

import { HeroScene } from "./hero-scene";
import styles from "./home.module.css";
import { HomeFaq, HomeJourney } from "./home-guidance";
import { HomeBenefits, HomeCategories } from "./home-sections";
import { SampleExperiencePanel } from "./sample-experience";

export function HomePage() {
  useTitle("Vào nhịp thi");
  const session = useSession();
  return (
    <div className={styles.home}>
      <section aria-labelledby="home-title">
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
      <HomeCategories />
      <HomeBenefits />
      <HomeJourney />
      <HomeFaq />
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
