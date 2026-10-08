import { Link } from "react-router";
import {
  SAMPLE_QUESTIONS,
  sampleIsCorrect,
  sampleScore,
  type SampleAction,
  type SampleState,
} from "./sample";
import styles from "./experience.module.css";

export function SampleSummary({
  state,
  dispatch,
  embedded = false,
}: {
  state: SampleState;
  dispatch: (action: SampleAction) => void;
  embedded?: boolean;
}) {
  const result = state.stage === "result";
  const Heading = embedded ? "h3" : "h1";
  return (
    <section className={styles.summary} aria-labelledby="sample-summary-title">
      <div className={styles.summaryIntro}>
        <span className={styles.summarySymbol} aria-hidden="true">
          {result ? "✓" : "≡"}
        </span>
        <p className={styles.eyebrow}>
          {result ? "Bạn đã trải nghiệm xong" : "Trước khi xem kết quả"}
        </p>
        <Heading id="sample-summary-title" tabIndex={-1}>
          {result ? (
            <>
              Một bước nhỏ.
              <br />
              Sẵn sàng cho bước tiếp theo?
            </>
          ) : (
            "Xem lại trước khi kết thúc"
          )}
        </Heading>
        <p>
          {result
            ? "Đây là kết quả từ ba câu hỏi minh họa bạn vừa làm."
            : "Bạn có thể quay lại bất kỳ câu nào để đổi lựa chọn."}
        </p>
      </div>
      {result ? (
        <div className={styles.score} aria-label="Kết quả mẫu">
          <strong>{sampleScore(state.choices)} / 3</strong>
          <div>
            <b>Câu trả lời đúng</b>
            <p>Kết quả mẫu · Không phải điểm thi chính thức</p>
          </div>
        </div>
      ) : null}
      <div className={styles.reviewList}>
        {SAMPLE_QUESTIONS.map((question, index) => {
          const chosen = state.choices[index] ?? [];
          const correct = sampleIsCorrect(index, chosen);
          return (
            <section className={styles.reviewRow} key={question.prompt}>
              <div className={styles.reviewHeading}>
                <h2>
                  Câu {index + 1} · {question.type}
                </h2>
                {result ? (
                  <span className={correct ? styles.correct : styles.incorrect}>
                    {correct ? "Đúng" : chosen.length ? "Chưa đúng" : "Chưa trả lời"}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => dispatch({ type: "jump", index })}
                  >
                    Sửa câu {index + 1}
                  </button>
                )}
              </div>
              <p>
                Bạn chọn:{" "}
                {chosen.length
                  ? chosen.map((option) => question.options[option]).join(", ")
                  : "Chưa chọn"}
                {state.marked[index] ? " · Đã đánh dấu" : ""}.
              </p>
              {result ? <p>{question.explanation}</p> : null}
            </section>
          );
        })}
      </div>
      <div className={styles.summaryActions}>
        {result ? (
          <>
            <Link className={styles.primary} to="/register">
              Tạo tài khoản <span aria-hidden="true">↗</span>
            </Link>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => dispatch({ type: "retry" })}
            >
              Thử lại 3 câu
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => dispatch({ type: "jump", index: state.current })}
            >
              Quay lại làm bài mẫu
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={() => dispatch({ type: "result" })}
            >
              Xem kết quả mẫu <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </div>
      <Link className={styles.backLink} to="/">
        ← Về trang giới thiệu
      </Link>
    </section>
  );
}
