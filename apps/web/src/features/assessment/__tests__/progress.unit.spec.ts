import { describe, expect, it } from "vitest";

import { progressCopy } from "../progress";

describe("assessment progress copy", () => {
  it("does not invent an attempt total", () => {
    expect(progressCopy({ loaded: 2, answered: 1, versionTotal: null })).toContain(
      "Chưa có tổng số câu",
    );
    expect(progressCopy({ loaded: 2, answered: 1, versionTotal: 6 })).toContain("có 6 câu");
  });
});
