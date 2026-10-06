import { score, validateSelection } from "../scoring";
describe("Exact-match deterministic scoring", () => {
  const q = {
    id: "q",
    type: "MULTIPLE_CHOICE" as const,
    optionIds: ["a", "b", "c"],
    correctIds: ["a", "b"],
    points: 2,
  };
  it("ignores selected option order but rejects duplicate IDs", () => {
    expect(score([q], [{ questionId: "q", selected: ["b", "a"] }])).toEqual({
      earned: 2,
      possible: 2,
      correct: 1,
      total: 1,
    });
    expect(() => validateSelection(q, ["a", "a"])).toThrow();
  });
  it("gives no partial credit or credit for extra choices", () => {
    expect(score([q], [{ questionId: "q", selected: ["a"] }]).earned).toBe(0);
    expect(score([q], [{ questionId: "q", selected: ["a", "b", "c"] }]).earned).toBe(0);
  });
  it("validates question membership and single-choice cardinality", () => {
    expect(() => validateSelection({ ...q, type: "SINGLE_CHOICE" }, ["a", "b"])).toThrow();
    expect(() => validateSelection(q, ["unknown"])).toThrow();
  });
  it("counts unanswered questions as incorrect", () => {
    expect(score([q], [])).toMatchObject({ earned: 0, possible: 2, total: 1 });
  });
});
describe("Scoring input integrity", () => {
  const q = {
    id: "q",
    type: "TRUE_FALSE" as const,
    optionIds: ["true", "false"],
    correctIds: ["true"],
    points: 1,
  };
  it("rejects multiple choices for true/false", () => {
    expect(() => validateSelection(q, ["true", "false"])).toThrow();
  });
  it("rejects repeated answers for one question", () => {
    expect(() =>
      score(
        [q],
        [
          { questionId: "q", selected: ["true"] },
          { questionId: "q", selected: ["true"] },
        ],
      ),
    ).toThrow();
  });
  it("rejects answers outside the frozen exam", () => {
    expect(() => score([q], [{ questionId: "other", selected: ["true"] }])).toThrow();
  });
  it("rejects invalid scoring definitions", () => {
    expect(() => score([{ ...q, points: NaN }], [])).toThrow();
    expect(() => score([{ ...q, correctIds: ["missing"] }], [])).toThrow();
  });
});
