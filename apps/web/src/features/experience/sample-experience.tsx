import { useEffect, useReducer, useRef } from "react";

import { useTitle } from "@web/app/use-title";

import styles from "./experience.module.css";
import { initialSample, SAMPLE_QUESTIONS, sampleReducer } from "./sample";
import { SampleNavigator } from "./sample-navigator";
import { SampleSummary } from "./sample-summary";

export function SampleExperience() {
  useTitle("Trải nghiệm 3 câu mẫu");
  return <SampleExperiencePanel />;
}

export function SampleExperiencePanel({ embedded = false }: { embedded?: boolean }) {
  const [state, dispatch] = useReducer(sampleReducer, undefined, initialSample);
  const content = useRef<HTMLDivElement>(null);
  const question = SAMPLE_QUESTIONS[state.current] ?? SAMPLE_QUESTIONS[0];
  const marked = state.marked[state.current] ?? false;
  const currentQuestion = state.current;
  const currentStage = state.stage;
  const previous = useRef({ question: currentQuestion, stage: currentStage });
  const Heading = embedded ? "h3" : "h1";
  const QuestionHeading = embedded ? "h3" : "h2";
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
              <QuestionHeading id="sample-question-title" tabIndex={-1}>
                {question.prompt}
              </QuestionHeading>
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
            <SampleNavigator state={state} dispatch={dispatch} embedded={embedded} />
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
