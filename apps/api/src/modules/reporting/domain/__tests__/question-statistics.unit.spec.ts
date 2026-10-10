import { statisticCounts, selectedCount } from "../question-statistics";
describe("Question statistic denominator integrity", () => {
  it("derives answered independently from unanswered and permits true zero", () => {
    expect(
      statisticCounts({ completed: "5", correct: "2", incorrect: "1", unanswered: "2" }),
    ).toEqual({ completedAttempts: 5, answered: 3, correct: 2, incorrect: 1, unanswered: 2 });
    expect(
      statisticCounts({ completed: "0", correct: "0", incorrect: "0", unanswered: "0" }).answered,
    ).toBe(0);
  });
  it.each(["-1", "1.5", "NaN", "2147483648", "9007199254740993", "", "1e3"])(
    "fails closed for invalid or out-of-contract count %s",
    (value) => {
      expect(() =>
        statisticCounts({ completed: value, correct: value, incorrect: "0", unanswered: "0" }),
      ).toThrow("STATISTICS_STATE_UNAVAILABLE");
    },
  );
  it("rejects inconsistent partitions instead of clamping them", () => {
    expect(() =>
      statisticCounts({ completed: "1", correct: "1", incorrect: "1", unanswered: "0" }),
    ).toThrow("STATISTICS_STATE_UNAVAILABLE");
  });
  it("bounds an option by answered but permits multiple option counts to sum above it", () => {
    expect(selectedCount("3", 3) + selectedCount("3", 3)).toBe(6);
    expect(() => selectedCount("4", 3)).toThrow("STATISTICS_STATE_UNAVAILABLE");
  });
});
