export interface SampleState {
  current: number;
  choices: number[][];
  marked: boolean[];
  stage: "questions" | "review" | "result";
}

// Authored public examples, never sourced from an exam bank or an attempt DTO.
export const SAMPLE_QUESTIONS = [
  {
    type: "Chọn một đáp án",
    prompt: "Dãy số 2, 4, 8, 16 tiếp tục bằng số nào?",
    hint: "Chọn một đáp án bạn cho là đúng.",
    options: ["18", "24", "32", "64"],
    correct: [2],
    explanation: "Mỗi số trong dãy bằng số đứng trước nhân với 2. Đáp án là 32.",
  },
  {
    type: "Chọn nhiều đáp án",
    prompt: "Những số nào sau đây là số chẵn?",
    hint: "Bạn có thể chọn nhiều đáp án.",
    options: ["12", "15", "28", "31"],
    correct: [0, 2],
    explanation: "12 và 28 chia hết cho 2. Với câu nhiều đáp án, cần chọn đủ và đúng các lựa chọn.",
  },
  {
    type: "Đúng / sai",
    prompt: "Một tam giác có ba cạnh. Phát biểu này đúng hay sai?",
    hint: "Chọn đúng hoặc sai.",
    options: ["Đúng", "Sai"],
    correct: [0],
    explanation: "Tam giác là một hình có ba cạnh. Phát biểu này đúng.",
  },
] as const;

export type SampleAction =
  | { type: "select"; option: number; selected: boolean }
  | { type: "jump"; index: number }
  | { type: "mark" | "clear" | "review" | "result" | "retry" };

export function initialSample(): SampleState {
  return { current: 0, choices: [[], [], []], marked: [false, false, false], stage: "questions" };
}

export function sampleReducer(state: SampleState, action: SampleAction): SampleState {
  switch (action.type) {
    case "retry":
      return initialSample();
    case "review":
      return { ...state, stage: "review" };
    case "result":
      return { ...state, stage: "result" };
    case "jump":
      return Number.isInteger(action.index) && SAMPLE_QUESTIONS[action.index]
        ? { ...state, current: action.index, stage: "questions" }
        : state;
    case "mark":
      return {
        ...state,
        marked: state.marked.map((value, index) => (index === state.current ? !value : value)),
      };
    case "clear":
      return {
        ...state,
        choices: state.choices.map((value, index) => (index === state.current ? [] : value)),
      };
    case "select": {
      const question = SAMPLE_QUESTIONS[state.current];
      if (
        !question ||
        !Number.isInteger(action.option) ||
        action.option < 0 ||
        action.option >= question.options.length
      )
        return state;
      const previous = state.choices[state.current] ?? [];
      const chosen =
        question.type !== "Chọn nhiều đáp án"
          ? [action.option]
          : action.selected
            ? [...new Set([...previous, action.option])].sort((a, b) => a - b)
            : previous.filter((option) => option !== action.option);
      return {
        ...state,
        choices: state.choices.map((value, index) => (index === state.current ? chosen : value)),
      };
    }
  }
}

export function sampleIsCorrect(index: number, choices: readonly number[]): boolean {
  const question = SAMPLE_QUESTIONS[index];
  return (
    !!question &&
    choices.length === question.correct.length &&
    question.correct.every((option) => choices.includes(option))
  );
}

export function sampleScore(choices: readonly number[][]): number {
  return SAMPLE_QUESTIONS.reduce(
    (score, _question, index) => score + Number(sampleIsCorrect(index, choices[index] ?? [])),
    0,
  );
}
