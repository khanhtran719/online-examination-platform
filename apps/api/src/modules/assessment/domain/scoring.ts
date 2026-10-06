import { AssessmentError } from "./assessment.error";

export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
export interface ScoringQuestion {
  id: string;
  type: QuestionType;
  optionIds: readonly string[];
  correctIds: readonly string[];
  points: number;
}
export interface ScoringAnswer {
  questionId: string;
  selected: readonly string[];
}

export function validateSelection(question: ScoringQuestion, selected: readonly string[]): void {
  const unique = new Set(selected);
  const allowed = new Set(question.optionIds);
  if (
    unique.size !== selected.length ||
    selected.some((id) => !allowed.has(id)) ||
    (question.type !== "MULTIPLE_CHOICE" && selected.length > 1)
  ) {
    throw new AssessmentError("Invalid answer selection");
  }
}

/** Exact match, no partial credit. Integer points keep totals deterministic. */
export function score(
  questions: readonly ScoringQuestion[],
  answers: readonly ScoringAnswer[],
): {
  earned: number;
  possible: number;
  correct: number;
  total: number;
} {
  const byQuestion = new Map<string, ScoringQuestion>();
  let possible = 0;
  for (const question of questions) {
    if (
      byQuestion.has(question.id) ||
      !Number.isSafeInteger(question.points) ||
      question.points <= 0 ||
      !["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type) ||
      question.optionIds.length < 2 ||
      new Set(question.optionIds).size !== question.optionIds.length ||
      (question.type === "TRUE_FALSE" && question.optionIds.length !== 2) ||
      question.correctIds.length === 0
    ) {
      throw new AssessmentError("Invalid scoring definition");
    }
    validateSelection(question, question.correctIds);
    byQuestion.set(question.id, question);
    possible += question.points;
    if (!Number.isSafeInteger(possible)) throw new AssessmentError("Score total is too large");
  }
  const seen = new Set<string>();
  let earned = 0;
  let correct = 0;
  for (const answer of answers) {
    const question = byQuestion.get(answer.questionId);
    if (!question || seen.has(answer.questionId))
      throw new AssessmentError("Invalid scoring answer");
    seen.add(answer.questionId);
    validateSelection(question, answer.selected);
    const selected = new Set(answer.selected);
    if (
      selected.size === question.correctIds.length &&
      question.correctIds.every((id) => selected.has(id))
    ) {
      earned += question.points;
      correct += 1;
    }
  }
  return { earned, possible, correct, total: questions.length };
}
