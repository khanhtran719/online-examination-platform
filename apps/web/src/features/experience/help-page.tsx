import { useState } from "react";
import { Link } from "react-router";

import { useTitle } from "@web/app/use-title";
import { ActionLink } from "@web/shared/ui/ui";

import { HELP_TOPICS } from "./help-content";
import styles from "./public-guides.module.css";

export function HelpPage() {
  useTitle("Trợ giúp");
  const [topicId, setTopicId] = useState("room");
  const topic = HELP_TOPICS.find((item) => item.id === topicId)!;
  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <p className={styles.eyebrow}>Trợ giúp thí sinh</p>
        <h1>Bạn cần hướng dẫn gì?</h1>
        <p>Chọn chủ đề để tìm cách xử lý những tình huống thường gặp.</p>
      </header>
      <div className={styles.helpLayout}>
        <aside className={styles.topicPanel} aria-label="Chủ đề trợ giúp">
          <h2>Chủ đề</h2>
          <div className={styles.topics}>
            {HELP_TOPICS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${item.label} ${item.questions.length} câu`}
                aria-pressed={topicId === item.id}
                aria-controls="help-questions"
                onClick={() => setTopicId(item.id)}
              >
                <span>{item.label}</span>
                <span className={styles.count}>{item.questions.length} câu</span>
              </button>
            ))}
          </div>
          <p className={styles.topicNote}>
            Trạng thái trong phòng thi là nơi kiểm tra việc lưu và nộp bài.
          </p>
        </aside>
        <section
          id="help-questions"
          className={styles.questions}
          aria-labelledby="help-topic-title"
        >
          <header className={styles.topicHeading}>
            <div>
              <p className={styles.eyebrow}>Câu hỏi thường gặp</p>
              <h2 id="help-topic-title">{topic.label}</h2>
              <p>{topic.summary}</p>
            </div>
            <span className={styles.count} role="status">
              {topic.questions.length} câu hỏi
            </span>
          </header>
          {topic.questions.map((item, index) => (
            <details key={`${topic.id}-${index}`} open={index === 0} className={styles.question}>
              <summary>
                <span className={styles.ordinal} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item.question}</span>
                <span className={styles.chevron} aria-hidden="true">
                  ⌄
                </span>
              </summary>
              <div className={styles.answer}>
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
          <div className={styles.resources}>
            <h2>Đi tới phần bạn cần</h2>
            <div className={styles.resourceGrid}>
              <Link to="/login">
                <strong>Đăng nhập</strong>
                <span>Email và mật khẩu đã xác thực.</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/exams">
                <strong>Khám phá đề thi</strong>
                <span>Cần đăng nhập để xem đề thi thật.</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/history">
                <strong>Lịch sử thi</strong>
                <span>Cần đăng nhập để xem các lượt của bạn.</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <section className={styles.closing} aria-labelledby="help-more">
            <div>
              <h2 id="help-more">Vẫn cần hướng dẫn thêm?</h2>
              <p>
                Chưa có kênh hỗ trợ vận hành trên nền tảng. Bạn có thể đọc quy trình hoặc thử ba câu
                mẫu trước.
              </p>
            </div>
            <div className={styles.actions}>
              <ActionLink to="/how-it-works" variant="secondary">
                Cách bắt đầu
              </ActionLink>
              <ActionLink to="/experience">Thử 3 câu mẫu</ActionLink>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
