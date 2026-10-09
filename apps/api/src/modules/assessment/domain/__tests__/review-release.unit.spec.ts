import { canReleaseReview } from "../review-release";
describe("Frozen candidate review release", () => {
  it.each([
    ["NEVER", true, 100, 100, false],
    ["AFTER_COMPLETION", false, 100, 200, false],
    ["AFTER_COMPLETION", true, 100, 50, true],
    ["AFTER_EXAM_CLOSE", true, 100, 99, false],
    ["AFTER_EXAM_CLOSE", true, 100, 100, true],
    ["AFTER_EXAM_CLOSE", true, 100, 101, true],
    ["AFTER_EXAM_CLOSE", false, 100, 101, false],
    ["AFTER_EXAM_CLOSE", true, NaN, 101, false],
  ] as const)(
    "policy=%s completed=%s close=%s now=%s",
    (policy, completed, closesAt, serverNow, expected) => {
      expect(canReleaseReview({ policy, completed, closesAt, serverNow })).toBe(expected);
    },
  );
});
