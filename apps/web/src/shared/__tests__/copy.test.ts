import { describe, expect, it } from "vitest";
import { progressCopy, rateLabel } from "../../features/assessment/progress";
import { isReleasedReviewHref } from "../review-href";

describe("display copy", () => {
  it("does not invent an attempt total", () => {
    expect(progressCopy({ loaded: 2, answered: 1, versionTotal: null })).toContain("Chưa có tổng số câu");
    expect(progressCopy({ loaded: 2, answered: 1, versionTotal: 6 })).toContain("có 6 câu");
  });

  it("does not turn an empty sample into a percentage", () => {
    expect(rateLabel(0, 0)).toBe("Chưa có mẫu");
  });

  it("allowlists only the released review path", () => {
    const attemptId = "00000000-0000-4000-8000-000000000401";
    expect(isReleasedReviewHref(attemptId, `/v1/attempts/${attemptId}/review`)).toBe(true);
    expect(isReleasedReviewHref(attemptId, "https://evil.example/review")).toBe(false);
  });
});
