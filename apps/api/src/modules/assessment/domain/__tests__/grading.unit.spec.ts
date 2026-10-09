import { grade, GradingQuestion } from "../grading";
import { AssessmentError } from "../assessment.error";

const questions: GradingQuestion[] = [
  {
    id: "one",
    sectionId: "s1",
    type: "SINGLE_CHOICE",
    points: 5,
    optionIds: ["a", "b"],
    correctIds: ["a"],
  },
  {
    id: "many",
    sectionId: "s1",
    type: "MULTIPLE_CHOICE",
    points: 7,
    optionIds: ["x", "y", "z"],
    correctIds: ["x", "z"],
  },
  {
    id: "bool",
    sectionId: "s2",
    type: "TRUE_FALSE",
    points: 3,
    optionIds: ["t", "f"],
    correctIds: ["t"],
  },
];
describe("exact-match grading breakdown", () => {
  it("scores sets independently of order and preserves section/question outcomes", () => {
    const result = grade(questions, [
      { questionId: "many", selected: ["z", "x"] },
      { questionId: "one", selected: ["b"] },
    ]);
    expect(result).toEqual({
      earned: 7,
      possible: 15,
      correct: 1,
      total: 3,
      sections: [
        { sectionId: "s1", earned: 7, possible: 12 },
        { sectionId: "s2", earned: 0, possible: 3 },
      ],
      questions: [
        { questionId: "one", earned: 0, correct: false, answered: true, selected: ["b"] },
        { questionId: "many", earned: 7, correct: true, answered: true, selected: ["x", "z"] },
        { questionId: "bool", earned: 0, correct: false, answered: false, selected: [] },
      ],
    });
  });
  it("treats missing and explicitly empty selections as unanswered", () => {
    const result = grade(questions, [{ questionId: "one", selected: [] }]);
    expect(result.questions.every((q) => !q.answered && !q.correct && q.earned === 0)).toBe(true);
  });
  it.each(
    [
      [{ questionId: "one", selected: ["a", "b"] }],
      [{ questionId: "many", selected: ["x", "x"] }],
      [{ questionId: "many", selected: ["foreign"] }],
      [{ questionId: "unknown", selected: [] }],
      [
        { questionId: "one", selected: [] },
        { questionId: "one", selected: [] },
      ],
    ].map((answers) => [answers]),
  )("rejects invalid persisted selections %j", (answers) => {
    expect(() => grade(questions, answers)).toThrow(AssessmentError);
  });
  it("rejects empty, oversized or corrupt snapshots", () => {
    for (const snapshot of [
      [],
      Array(501).fill(questions[0]),
      [{ ...questions[0]!, points: 1001 }],
      [{ ...questions[0]!, sectionId: "" }],
    ]) {
      expect(() => grade(snapshot, [])).toThrow(AssessmentError);
    }
  });
  it("has no partial credit for multiple choice", () => {
    expect(grade(questions, [{ questionId: "many", selected: ["x"] }]).earned).toBe(0);
  });
  it("handles the 500-question/10-option/integer-total limit without mutating inputs", () => {
    const snapshot = Array.from({ length: 500 }, (_, i) => ({
      id: `q${i}`,
      sectionId: "s",
      type: "MULTIPLE_CHOICE" as const,
      points: 1000,
      optionIds: Array.from({ length: 10 }, (_, j) => `${i}-${j}`),
      correctIds: Array.from({ length: 10 }, (_, j) => `${i}-${j}`),
    }));
    const answers = snapshot.map((q) => ({
      questionId: q.id,
      selected: [...q.correctIds].reverse(),
    }));
    const before = JSON.stringify({ snapshot, answers });
    expect(grade(snapshot, answers)).toMatchObject({
      earned: 500000,
      possible: 500000,
      correct: 500,
      total: 500,
    });
    expect(JSON.stringify({ snapshot, answers })).toBe(before);
  });
});
