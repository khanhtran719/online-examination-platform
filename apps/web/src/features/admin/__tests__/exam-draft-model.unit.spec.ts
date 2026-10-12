import { expect, it } from "vitest";

import { buildExamDraft, newExamFields } from "../exam-draft-model";

function valid() {
  return {
    ...newExamFields(),
    title: "Đề thử",
    openAt: "2026-11-15T08:00",
    closeAt: "2026-11-15T12:00",
    sections: [{ title: "Phần 1", questions: [{ bankQuestionId: "bank", points: 10 }] }],
  };
}
it("validates information, schedule, membership and points independently", () => {
  const fields = valid();
  fields.closeAt = "2026-11-15T07:00";
  fields.sections.push({ title: "Phần 2", questions: [] });
  const result = buildExamDraft(fields, 4);
  expect(result.body).toBeNull();
  expect(result.issues.map((issue) => issue.field)).toEqual(
    expect.arrayContaining(["closeAt", "sections.1"]),
  );
});
it.each([NaN, Infinity, 0, 1001, 1.5])("rejects invalid membership points %s", (points) => {
  const fields = valid();
  fields.sections[0]!.questions[0]!.points = points;
  expect(buildExamDraft(fields, 4).issues.some((issue) => issue.field === "points.0.0")).toBe(true);
});
it("rejects empty section names and duplicate memberships", () => {
  const fields = valid();
  fields.sections.push({ title: " ", questions: [{ bankQuestionId: "bank", points: 10 }] });
  expect(buildExamDraft(fields, 4).issues.map((issue) => issue.field)).toEqual(
    expect.arrayContaining(["sectionTitle.1", "questions"]),
  );
});
it("rejects an impossible date instead of allowing normalization to another day", () => {
  const fields = valid();
  fields.openAt = "2026-02-30T08:00";
  expect(buildExamDraft(fields, 4).issues.some((issue) => issue.field === "openAt")).toBe(true);
});
it("keeps single-second durations through a minute edit model", () => {
  const fields = valid();
  fields.duration = String(61 / 60);
  expect(buildExamDraft(fields, 4).body?.durationSeconds).toBe(61);
});
it("rejects a daylight saving gap without silently shifting the schedule", () => {
  const fields = valid();
  fields.zone = "America/New_York";
  fields.openAt = "2026-03-08T02:30";
  expect(buildExamDraft(fields, 4).issues.some((issue) => issue.field === "openAt")).toBe(true);
});

it("preserves an untouched repeated DST instant and milliseconds when editing the title", async () => {
  const { examFieldsOf } = await import("../exam-draft-model");
  const fields = examFieldsOf({
    id: "exam",
    revision: 4,
    published: false,
    archived: false,
    publishedVersionId: null,
    title: "Original",
    category: "IT_CERTIFICATION",
    durationSeconds: 61,
    displayTimezone: "America/New_York",
    openAt: "2026-11-01T06:30:23.123Z",
    closeAt: "2026-11-01T08:30:23.123Z",
    attemptLimit: 1,
    explanationPolicy: "NEVER",
    leaderboardEnabled: false,
    sections: [
      {
        title: "One",
        position: 1,
        questions: [{ bankQuestionId: "bank", position: 1, points: 1 }],
      },
    ],
  });
  fields.title = "Changed";
  expect(buildExamDraft(fields, 4).body).toMatchObject({
    openAt: "2026-11-01T06:30:23.123Z",
    closeAt: "2026-11-01T08:30:23.123Z",
  });
});
it("changes the display timezone atomically while keeping the original UTC instants", async () => {
  const { rezoneExamFields } = await import("../exam-draft-model");
  const fields = valid();
  const before = buildExamDraft(fields, 4).body!;
  const after = buildExamDraft(rezoneExamFields(fields, "UTC"), 4).body!;
  expect(after.openAt).toBe(before.openAt);
  expect(after.closeAt).toBe(before.closeAt);
  expect(after.displayTimezone).toBe("UTC");
});
