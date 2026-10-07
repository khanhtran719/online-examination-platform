import {
  importIssues,
  assertImportStructure,
  ExamDraft,
  normalizeExplanation,
  requireFreshKey,
  validateExamDraft,
  validatePublication,
  validateQuestion,
} from "../catalog-policy";

const choice = {
  type: "SINGLE_CHOICE" as const,
  prompt: "Choose A.",
  options: [
    { position: 1, text: "A" },
    { position: 2, text: "B" },
  ],
  correctOptionPositions: [1],
  points: 2,
  explanation: "A is correct.",
};

const calendarDraft: ExamDraft = {
  title: "Calendar validation",
  category: "IT_CERTIFICATION",
  durationSeconds: 60,
  openAt: "2028-02-29T10:00:00.000Z",
  closeAt: "2028-03-02T10:00:00.000Z",
  displayTimezone: "UTC",
  attemptLimit: 1,
  explanationPolicy: "NEVER",
  leaderboardEnabled: false,
  sections: [],
  expectedRevision: 0,
};

describe("Catalog question and publication policy", () => {
  it("accepts question text at Unicode code-point limits and rejects one character over", () => {
    const question = {
      ...choice,
      prompt: "😀".repeat(8000),
      explanation: "😀".repeat(8000),
      options: choice.options.map((option) => ({ ...option, text: "😀".repeat(2000) })),
    };
    expect(validateQuestion(question)).toEqual(question);
    for (const field of ["prompt", "explanation"] as const) {
      expect(() => validateQuestion({ ...question, [field]: question[field] + "x" })).toThrow(
        "Invalid request",
      );
    }
    expect(() =>
      validateQuestion({
        ...question,
        options: [{ position: 1, text: "😀".repeat(2001) }, question.options[1]!],
      }),
    ).toThrow("Invalid request");
  });

  it("accepts exam and section titles at Unicode limits and rejects one character over", () => {
    const draft = {
      ...calendarDraft,
      title: "😀".repeat(200),
      sections: [{ title: "😀".repeat(200), position: 1, questions: [] }],
    };
    expect(validateExamDraft(draft)).toEqual(draft);
    expect(() => validateExamDraft({ ...draft, title: draft.title + "x" })).toThrow(
      "Invalid request",
    );
    expect(() =>
      validateExamDraft({
        ...draft,
        sections: [{ ...draft.sections[0]!, title: "😀".repeat(201) }],
      }),
    ).toThrow("Invalid request");
  });

  it("uses the same Unicode limits for imported question structure", () => {
    const question = {
      ...choice,
      clientRef: "unicode",
      prompt: "😀".repeat(8000),
      explanation: "😀".repeat(8000),
      options: choice.options.map((option) => ({ ...option, text: "😀".repeat(2000) })),
    };
    const command = { schemaVersion: 1, dryRun: false, questions: [question] };
    expect(assertImportStructure(command)).toEqual(command);
    expect(() =>
      assertImportStructure({
        ...command,
        questions: [{ ...question, prompt: question.prompt + "x" }],
      }),
    ).toThrow("Invalid request");
  });

  it.each([
    "2027-02-29T10:00:00.000Z",
    "2027-02-30T10:00:00.000Z",
    "2027-04-31T10:00:00.000Z",
    "2027-01-00T10:00:00.000Z",
    "2027-13-01T10:00:00.000Z",
    "2027-03-01T24:00:00.000Z",
    "2027-03-01T10:60:00.000Z",
    "2027-03-01T10:00:60.000Z",
    "2027-03-01T10:00:00.0000Z",
  ])("rejects the invalid UTC calendar instant %s in either schedule field", (instant) => {
    expect(() => validateExamDraft({ ...calendarDraft, openAt: instant })).toThrow(
      "Invalid request",
    );
    expect(() =>
      validateExamDraft({ ...calendarDraft, openAt: "2026-01-01T00:00:00Z", closeAt: instant }),
    ).toThrow("Invalid request");
  });

  it.each([
    "2028-02-29T10:00:00Z",
    "2028-02-29T10:00:00.1Z",
    "2028-02-29T10:00:00.12Z",
    "2028-02-29T10:00:00.123Z",
    "2027-02-28T23:59:59.999Z",
    "2000-02-29T00:00:00Z",
  ])("accepts the valid UTC calendar instant %s at its original instant", (instant) => {
    expect(validateExamDraft({ ...calendarDraft, openAt: instant }).openAt).toBe(
      new Date(instant).toISOString(),
    );
  });

  it("accepts single, multiple and true/false keys and rejects invalid cardinality", () => {
    expect(validateQuestion(choice).points).toBe(2);
    expect(
      validateQuestion({
        ...choice,
        type: "MULTIPLE_CHOICE",
        correctOptionPositions: [2, 1],
      }).correctOptionPositions,
    ).toEqual([1, 2]);
    expect(
      validateQuestion({
        ...choice,
        type: "TRUE_FALSE",
        correctOptionPositions: [2],
      }).type,
    ).toBe("TRUE_FALSE");
    expect(() => validateQuestion({ ...choice, correctOptionPositions: [1, 2] })).toThrow(
      "Invalid request",
    );
    expect(() =>
      validateQuestion({
        ...choice,
        type: "TRUE_FALSE",
        options: [...choice.options, { position: 3, text: "C" }],
      }),
    ).toThrow("Invalid request");
    expect(() =>
      validateQuestion({ ...choice, type: "MULTIPLE_CHOICE", correctOptionPositions: [] }),
    ).toThrow("Invalid request");
    expect(() => validateQuestion({ ...choice, correctOptionPositions: [3] })).toThrow(
      "Invalid request",
    );
    expect(() =>
      validateQuestion({
        ...choice,
        options: [
          { position: 1, text: "A" },
          { position: 1, text: "B" },
        ],
      }),
    ).toThrow("Invalid request");
  });

  it("enforces text, points and explanation limits and keeps imported markup as text", () => {
    const markup = "<script>alert(1)</script>";
    expect(validateQuestion({ ...choice, prompt: markup }).prompt).toBe(markup);
    expect(normalizeExplanation(null)).toBe("");
    expect(() => validateQuestion({ ...choice, prompt: "" })).toThrow("Invalid request");
    expect(() => validateQuestion({ ...choice, prompt: "x".repeat(8001) })).toThrow(
      "Invalid request",
    );
    expect(() => validateQuestion({ ...choice, points: 0 })).toThrow("Invalid request");
    expect(() => validateQuestion({ ...choice, points: 1001 })).toThrow("Invalid request");
    expect(() => validateQuestion({ ...choice, options: [{ position: 1, text: "only" }] })).toThrow(
      "Invalid request",
    );
  });

  it("allows an empty draft and rejects duplicate sections, questions and bad schedules", () => {
    expect(
      validateExamDraft({
        title: "Draft",
        category: "IT_CERTIFICATION",
        durationSeconds: 60,
        openAt: "2026-10-08T00:00:00.000Z",
        closeAt: "2026-10-08T01:00:00.000Z",
        displayTimezone: "Asia/Ho_Chi_Minh",
        attemptLimit: 1,
        explanationPolicy: "NEVER",
        leaderboardEnabled: false,
        sections: [],
        expectedRevision: 0,
      }).sections,
    ).toEqual([]);
    expect(() =>
      validateExamDraft({
        title: "Draft",
        category: "IT_CERTIFICATION",
        durationSeconds: 59,
        openAt: "2026-10-08T00:00:00.000Z",
        closeAt: "2026-10-08T01:00:00.000Z",
        displayTimezone: "Asia/Ho_Chi_Minh",
        attemptLimit: 1,
        explanationPolicy: "NEVER",
        leaderboardEnabled: false,
        sections: [],
        expectedRevision: 0,
      }),
    ).toThrow("Invalid request");
    expect(() =>
      validateExamDraft({
        title: "Draft",
        category: "IT_CERTIFICATION",
        durationSeconds: 60,
        openAt: "2026-10-08T02:00:00.000Z",
        closeAt: "2026-10-08T01:00:00.000Z",
        displayTimezone: "Not/AZone",
        attemptLimit: 1,
        explanationPolicy: "NEVER",
        leaderboardEnabled: false,
        sections: [
          {
            title: "A",
            position: 1,
            questions: [
              { bankQuestionId: "00000000-0000-4000-8000-000000000001", position: 1, points: 1 },
              { bankQuestionId: "00000000-0000-4000-8000-000000000001", position: 2, points: 1 },
            ],
          },
        ],
        expectedRevision: 0,
      }),
    ).toThrow("Invalid request");
  });

  it("requires a complete open publication and ignores future bank edits only at publish time", () => {
    const base = {
      durationSeconds: 90,
      attemptLimit: 2,
      opensAt: Date.parse("2026-10-08T00:00:00.000Z"),
      closesAt: Date.parse("2026-10-08T02:00:00.000Z"),
      displayTimezone: "UTC",
      now: Date.parse("2026-10-08T00:30:00.000Z"),
      sections: [
        {
          questions: [
            { archived: false, type: "SINGLE_CHOICE" as const, optionCount: 2, keyCount: 1 },
          ],
        },
      ],
    };
    expect(() => validatePublication(base)).not.toThrow();
    expect(() => validatePublication({ ...base, sections: [] })).toThrow("Publication incomplete");
    expect(() =>
      validatePublication({
        ...base,
        sections: [{ questions: [] }],
      }),
    ).toThrow("Publication incomplete");
    expect(() => validatePublication({ ...base, now: base.closesAt })).toThrow("Exam is closed");
    expect(() =>
      validatePublication({
        ...base,
        sections: [
          {
            questions: [{ archived: true, type: "SINGLE_CHOICE", optionCount: 2, keyCount: 1 }],
          },
        ],
      }),
    ).toThrow("Publication incomplete");
  });

  it("bounds idempotency keys with database time and reports import cardinality without raw text", () => {
    const now = Date.parse("2026-10-07T00:00:00.000Z");
    const key = (time: number) =>
      `${time.toString(16).padStart(12, "0").slice(0, 8)}-${time.toString(16).padStart(12, "0").slice(8)}-7000-8000-000000000001`;
    expect(() => requireFreshKey(key(now), now)).not.toThrow();
    expect(() => requireFreshKey(key(now - 86_400_001), now)).toThrow("Idempotency key expired");
    expect(() => requireFreshKey(key(now + 300_001), now)).toThrow("Invalid request");
    const issues = importIssues([
      { clientRef: "q1", ...choice, correctOptionPositions: [9] },
      { clientRef: "q1", ...choice },
    ]);
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      "clientRef",
      "correctOptionPositions",
    ]);
    expect(JSON.stringify(issues)).not.toContain("Choose A.");
    expect(JSON.stringify(issues)).not.toContain("A is correct.");
  });
});
