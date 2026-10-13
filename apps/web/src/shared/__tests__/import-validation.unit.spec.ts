import { expect, it } from "vitest";

import { IMPORT_TEMPLATE, inspectImportText } from "../validation";

it.each([
  [
    "numeric option text",
    (q: Record<string, unknown>) => {
      q.options = [
        { position: 1, text: 7 },
        { position: 2, text: "B" },
      ];
    },
  ],
  [
    "string option position",
    (q: Record<string, unknown>) => {
      q.options = [
        { position: "1", text: "A" },
        { position: 2, text: "B" },
      ];
    },
  ],
  [
    "non-integer points",
    (q: Record<string, unknown>) => {
      q.points = 1.5;
    },
  ],
  [
    "unknown key position",
    (q: Record<string, unknown>) => {
      q.correctOptionPositions = [9];
    },
  ],
  [
    "discarded key type",
    (q: Record<string, unknown>) => {
      q.correctOptionPositions = [1, "2"];
    },
  ],
  [
    "true/false without key",
    (q: Record<string, unknown>) => {
      q.type = "TRUE_FALSE";
      q.correctOptionPositions = [];
    },
  ],
  [
    "oversized explanation",
    (q: Record<string, unknown>) => {
      q.explanation = "x".repeat(8001);
    },
  ],
  [
    "non-text clientRef",
    (q: Record<string, unknown>) => {
      q.clientRef = 42;
    },
  ],
  [
    "non-text explanation",
    (q: Record<string, unknown>) => {
      q.explanation = 42;
    },
  ],
  [
    "unknown entry field",
    (q: Record<string, unknown>) => {
      q.extra = "discarded";
    },
  ],
] as const)("rejects %s without silently coercing source JSON", (_name, mutate) => {
  const source = JSON.parse(IMPORT_TEMPLATE) as { questions: Record<string, unknown>[] };
  mutate(source.questions[0]!);
  const checked = inspectImportText(JSON.stringify(source));
  expect(checked.issues.length).toBeGreaterThan(0);
});
it("accepts Unicode code-point limits consistently with the Catalog contract", () => {
  const source = JSON.parse(IMPORT_TEMPLATE);
  source.questions[0].prompt = "🙂".repeat(8000);
  source.questions[0].options[0].text = "🙂".repeat(2000);
  source.questions[0].explanation = "🙂".repeat(8000);
  expect(inspectImportText(JSON.stringify(source)).issues).toEqual([]);
});
