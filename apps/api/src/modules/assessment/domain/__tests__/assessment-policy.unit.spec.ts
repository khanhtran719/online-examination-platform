import {
  assertSelections,
  canonical,
  normalizeSelections,
  fitQuestionPage,
  manualSubmissionEvent,
  QUESTION_PAGE_BYTES,
  requireFreshKey,
} from "../assessment-policy";

const now = Date.parse("2026-10-07T00:00:00.000Z");

function key(time: number): string {
  const hex = time.toString(16).padStart(12, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000001`;
}

describe("assessment policy", () => {
  it("rejects a pruned idempotency key and a future key", () => {
    expect(() => requireFreshKey(key(now - 86_400_001), now)).toThrow("Idempotency key expired");
    expect(() => requireFreshKey(key(now + 300_001), now)).toThrow("Invalid request");
    expect(() => requireFreshKey(key(now), now)).not.toThrow();
  });

  it("rejects duplicate questions, foreign options and extra single selections", () => {
    const choice = {
      questionId: "00000000-0000-4000-8000-000000000010",
      type: "SINGLE_CHOICE" as const,
      optionIds: ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000009"],
    };
    expect(() =>
      assertSelections(
        [
          {
            questionId: choice.questionId,
            selectedOptionIds: [choice.optionIds[0]!, choice.optionIds[1]!],
            marked: false,
            expectedVersion: 0,
          },
        ],
        [choice],
      ),
    ).toThrow("Invalid request");
    expect(() =>
      assertSelections(
        [
          {
            questionId: choice.questionId,
            selectedOptionIds: [],
            marked: true,
            expectedVersion: 1,
          },
        ],
        [choice],
      ),
    ).not.toThrow();
  });

  it("keeps a byte-truncated page cursor on the last returned item", () => {
    const rows = ["aaaa", "bbbb", "cccc"];
    const fitted = fitQuestionPage(rows, (items) =>
      items.length > 1 ? QUESTION_PAGE_BYTES + 1 : 1,
    );
    expect(fitted.kept).toEqual(["aaaa"]);
    expect(fitted.truncated).toBe(true);
  });

  it("canonicalizes only option sets and preserves answer order and input immutability", () => {
    const input = [
      { questionId: "ABC", selectedOptionIds: ["F", "a"], marked: true, expectedVersion: 1 },
      { questionId: "DEF", selectedOptionIds: [], marked: false, expectedVersion: 0 },
    ];
    const normalized = normalizeSelections(input);
    expect(normalized.map((answer) => answer.questionId)).toEqual(["abc", "def"]);
    expect(normalized[0]?.selectedOptionIds).toEqual(["a", "f"]);
    expect(input[0]?.selectedOptionIds).toEqual(["F", "a"]);
    expect(canonical({ b: 2, a: ["second", "first"] })).toEqual({ a: ["second", "first"], b: 2 });
  });

  it("rejects an oversized single item instead of violating the response bound", () => {
    expect(() => fitQuestionPage(["oversized"], () => QUESTION_PAGE_BYTES + 1)).toThrow(
      "Invalid request",
    );
    expect(fitQuestionPage([], () => QUESTION_PAGE_BYTES + 1)).toEqual({
      kept: [],
      truncated: false,
    });
    expect(fitQuestionPage(["a", "b"], () => QUESTION_PAGE_BYTES)).toEqual({
      kept: ["a", "b"],
      truncated: false,
    });
  });

  it("builds a submission event without answer content", () => {
    const event = manualSubmissionEvent({
      eventId: "00000000-0000-4000-8000-000000000006",
      attemptId: "00000000-0000-4000-8000-000000000004",
      examId: "00000000-0000-4000-8000-000000000001",
      publishedVersionId: "00000000-0000-4000-8000-000000000002",
      submissionId: "00000000-0000-4000-8000-000000000005",
      occurredAt: "2026-10-07T00:00:00.000Z",
      deadline: "2026-10-07T00:45:00.000Z",
      expired: false,
      correlationId: "00000000-0000-4000-8000-000000000007",
      causationId: "00000000-0000-4000-8000-000000000008",
    });
    expect(JSON.stringify(event)).not.toContain("selectedOptionIds");
    expect(event.payload.submissionKind).toBe("MANUAL");
  });
});
