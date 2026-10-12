import { describe, expect, it } from "vitest";

import { formatDuration, rateLabel } from "../format";
import { isReleasedReviewHref } from "../review-href";

describe("display copy", () => {
  it("allowlists only the released review path", () => {
    const attemptId = "00000000-0000-4000-8000-000000000401";
    expect(isReleasedReviewHref(attemptId, `/v1/attempts/${attemptId}/review`)).toBe(true);
    expect(isReleasedReviewHref(attemptId, "https://evil.example/review")).toBe(false);
  });
});

it("does not turn an empty sample into a percentage", () => {
  expect(rateLabel(0, 0)).toBe("Chưa có mẫu");
});

it("does not round an exam duration up or down when it includes seconds", () => {
  expect(formatDuration(90)).toBe("1 phút 30 giây");
  expect(formatDuration(2700)).toBe("45 phút");
});
