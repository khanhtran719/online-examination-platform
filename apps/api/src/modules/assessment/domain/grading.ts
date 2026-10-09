import { ScoringAnswer, ScoringQuestion, score } from "./scoring";
import { AssessmentError } from "./assessment.error";

export interface GradingQuestion extends ScoringQuestion {
  sectionId: string;
}
export interface Grade {
  earned: number;
  possible: number;
  correct: number;
  total: number;
  sections: { sectionId: string; earned: number; possible: number }[];
  questions: {
    questionId: string;
    earned: number;
    correct: boolean;
    answered: boolean;
    selected: string[];
  }[];
}

/** O(questions + selections); bounded to the frozen publication contract. */
export function grade(
  questions: readonly GradingQuestion[],
  answers: readonly ScoringAnswer[],
): Grade {
  if (
    questions.length < 1 ||
    questions.length > 500 ||
    questions.some((q) => !q.sectionId || q.points > 1000 || q.optionIds.length > 10)
  ) {
    throw new AssessmentError("Invalid grading snapshot");
  }
  const totals = score(questions, answers);
  const selections = new Map(answers.map((answer) => [answer.questionId, answer.selected]));
  const sections = new Map<string, Grade["sections"][number]>();
  const outcomes = questions.map((question) => {
    const selected = [...(selections.get(question.id) ?? [])].sort();
    const set = new Set(selected);
    const correct =
      set.size === question.correctIds.length && question.correctIds.every((id) => set.has(id));
    const earned = correct ? question.points : 0;
    const section = sections.get(question.sectionId) ?? {
      sectionId: question.sectionId,
      earned: 0,
      possible: 0,
    };
    section.earned += earned;
    section.possible += question.points;
    sections.set(question.sectionId, section);
    return { questionId: question.id, earned, correct, answered: selected.length > 0, selected };
  });
  return { ...totals, sections: [...sections.values()], questions: outcomes };
}
