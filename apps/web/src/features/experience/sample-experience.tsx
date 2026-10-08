import { useEffect, useReducer, useRef } from "react";
import { Link } from "react-router";
import { useTitle } from "../../app/use-title";
import { initialSample, SAMPLE_QUESTIONS, sampleReducer } from "./sample";
import { SampleSummary } from "./sample-summary";
import styles from "./experience.module.css";

export function SampleExperience() {
  useTitle("Trải nghiệm 3 câu mẫu");
  return <SampleExperiencePanel />;
}

export function SampleExperiencePanel({ embedded = false }: { embedded?: boolean }) {
  const [state, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  const content = useRef<HTMLDivElement>(null);
  const question = SAMPLE_QUESTIONS[state.current] ?? SAMPLE_QUESTIONS[0];
  const answered = state.choices.filter((choice) => choice.length).length;
  const marked = state.marked[state.current] ?? false;
  const currentQuestion = state.current;
  const currentStage = state.stage;
  const previous = useRef({ question: currentQuestion, stage: currentStage });
  const Heading = embedded ? "h3" : "h1";
  useEffect(() => {
    if (previous.current.question === currentQuestion && previous.current.stage === currentStage)
      return;
    previous.current = { question: currentQuestion, stage: currentStage };
    content.current?.querySelector<HTMLElement>("[tabindex='-1']")?.focus({ preventScroll: true });
  }, [currentQuestion, currentStage]);
  return (
    <div className={`${styles.workspace} ${embedded ? styles.embedded : ""}`} ref={content}>
      {state.stage !== "questions" ? (
        <SampleSummary state={state} dispatch={dispatch} embedded={embedded} />
      ) : (
        <>
          <div className={styles.roomTop}>
            <div>
              <p className={styles.eyebrow}>Phòng thi mẫu</p>
              <Heading>Vào nhịp với 3 câu hỏi</Heading>
            </div>
            <span className={styles.sampleLabel}>Trải nghiệm minh họa</span>
          </div>
          <div className={styles.roomGrid}>
            <aside className={styles.sidebar} aria-label="Tiến độ làm bài">
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
                        •
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>
              <p className={styles.legend}>✓ Đã trả lời · ● Đánh dấu</p>
              <div className={styles.reminder}>
                <span aria-hidden="true">◷</span>
                <h3>Cứ bình tĩnh.</h3>
                <p>Đây là bài mẫu, không giới hạn thời gian. Bạn có thể quay lại bất kỳ câu nào.</p>
              </div>
              <Link className={styles.backLink} to="/">
                ← Về trang giới thiệu
              </Link>
            </aside>
            <section className={styles.questionPanel} aria-labelledby="sample-question-title">
              <div className={styles.questionTop}>
                <span>{question.type}</span>
                <button
                  type="button"
                  className={styles.markButton}
                  aria-pressed={marked}
                  onClick={() => dispatch({ type: "mark" })}
                >
                  <span aria-hidden="true">{marked ? "⚑" : "⚐"}</span>
                  {marked ? "Đã đánh dấu" : "Đánh dấu"}
                </button>
              </div>
              <p className={styles.questionNumber}>
                Câu {String(state.current + 1).padStart(2, "0")} / 03
              </p>
              <h2 id="sample-question-title" tabIndex={-1}>
                {question.prompt}
              </h2>
              <p className={styles.hint}>{question.hint}</p>
              <fieldset className={styles.answers} key={state.current}>
                <legend className={styles.visuallyHidden}>{question.hint}</legend>
                {question.options.map((option, index) => (
                  <label className={styles.answer} key={option}>
                    <input
                      type={question.type === "Chọn nhiều đáp án" ? "checkbox" : "radio"}
                      name="sample-answer"
                      checked={state.choices[state.current]?.includes(index) ?? false}
                      onChange={(event) =>
                        dispatch({ type: "select", option: index, selected: event.target.checked })
                      }
                    />
                    <span className={styles.answerLetter}>{String.fromCharCode(65 + index)}</span>{" "}
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
              <p className={styles.answerStatus} role="status">
                {state.choices[state.current]?.length
                  ? `${state.choices[state.current]?.length} lựa chọn được giữ trong trải nghiệm mẫu`
                  : "Chưa chọn đáp án"}
              </p>
              <div className={styles.questionBottom}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={state.current === 0}
                  onClick={() => dispatch({ type: "jump", index: state.current - 1 })}
                >
                  <span aria-hidden="true">←</span>Câu trước
                </button>
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => dispatch({ type: "clear" })}
                >
                  Xóa lựa chọn
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() =>
                    dispatch(
                      state.current === 2
                        ? { type: "review" }
                        : { type: "jump", index: state.current + 1 },
                    )
                  }
                >
                  {state.current === 2 ? "Xem lại lựa chọn" : "Câu tiếp theo"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          </div>
        </>
      )}
      <p className={styles.localNote}>
        Lựa chọn chỉ giữ trong trải nghiệm này. Tải lại trang sẽ bắt đầu lại. Không phải bài thi
        hoặc kết quả chính thức.
      </p>
    </div>
  );
}
