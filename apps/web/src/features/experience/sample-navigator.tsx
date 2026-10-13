import { Link } from "react-router";

import styles from "./experience.module.css";
import { SAMPLE_QUESTIONS, type SampleAction, type SampleState } from "./sample";

export function SampleNavigator({
  state,
  dispatch,
  embedded,
}: {
  state: SampleState;
  dispatch: (action: SampleAction) => void;
  embedded: boolean;
}) {
  const answered = state.choices.filter((choice) => choice.length).length;
  const Heading = embedded ? "h3" : "h2";
  return (
    <aside className={styles.sidebar} aria-label="Tiến độ làm bài">
      <Heading className={styles.navigatorTitle}>Danh sách câu hỏi mẫu</Heading>
      <nav className={styles.questionNav} aria-label="Chuyển câu hỏi">
        {SAMPLE_QUESTIONS.map((_question, index) => (
          <button
            key={index}
            type="button"
            className={state.choices[index]?.length ? styles.answered : ""}
            aria-current={index === state.current ? "step" : undefined}
            aria-label={`Câu ${index + 1}, ${state.choices[index]?.length ? "đã trả lời" : "chưa trả lời"}${state.marked[index] ? ", đã đánh dấu" : ""}`}
            onClick={() => dispatch({ type: "jump", index })}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {state.marked[index] ? (
              <span className={styles.markDot} aria-hidden="true">
                ⚑
              </span>
            ) : null}
            {state.choices[index]?.length ? (
              <span className={styles.answerDot} aria-hidden="true">
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </nav>
      <p className={styles.legend}>✓ Đã trả lời · ⚑ Đánh dấu</p>
      <div className={styles.sideTitle}>
        <span>Tiến độ của bạn</span>
        <b>{answered} / 3</b>
      </div>
      <progress
        className={styles.progress}
        value={answered}
        max={3}
        aria-label="Số câu đã trả lời"
      />
      <button
        className={styles.secondary}
        type="button"
        onClick={() => dispatch({ type: "review" })}
      >
        Rà soát bài mẫu
      </button>
      <div className={styles.reminder}>
        <p>
          <strong>Cứ bình tĩnh.</strong>
        </p>
        <p>Đây là bài mẫu, không giới hạn thời gian. Bạn có thể quay lại bất kỳ câu nào.</p>
      </div>
      <Link className={styles.backLink} to="/">
        ← Về trang giới thiệu
      </Link>
    </aside>
  );
}
