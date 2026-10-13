import type { AdminQuestion, QuestionType, QuestionWriteRequest } from "@web/shared/api/dto";
import { questionIssues } from "@web/shared/validation";

export interface QuestionFields {
  type: QuestionType;
  prompt: string;
  options: { id: string; text: string }[];
  correctIds: string[];
  points: string;
  explanation: string;
}
export function fieldsOfQuestion(initial: AdminQuestion | null): QuestionFields {
  return {
    type: initial?.type ?? "SINGLE_CHOICE",
    prompt: initial?.prompt ?? "",
    options: (
      initial?.options ?? [
        { position: 1, text: "" },
        { position: 2, text: "" },
      ]
    ).map((o) => ({ id: `option-${o.position}`, text: o.text })),
    correctIds: (initial?.correctOptionPositions ?? [1]).map((p) => `option-${p}`),
    points: String(initial?.points ?? 1),
    explanation: initial?.explanation ?? "",
  };
}
export function questionBody(fields: QuestionFields, revision: number): QuestionWriteRequest {
  return {
    type: fields.type,
    prompt: fields.prompt,
    options: fields.options.map((o, i) => ({ position: i + 1, text: o.text })),
    correctOptionPositions: fields.options.flatMap((o, i) =>
      fields.correctIds.includes(o.id) ? [i + 1] : [],
    ),
    points: Number(fields.points),
    explanation: fields.explanation.trim() ? fields.explanation : null,
    expectedRevision: revision,
  };
}
export function draftQuestionIssues(fields: QuestionFields): string[] {
  return questionIssues(questionBody(fields, 0));
}
export function moveQuestionOption(
  fields: QuestionFields,
  id: string,
  direction: -1 | 1,
): QuestionFields {
  const index = fields.options.findIndex((o) => o.id === id),
    target = index + direction;
  if (index < 0 || target < 0 || target >= fields.options.length) return fields;
  const options = [...fields.options];
  [options[index], options[target]] = [options[target]!, options[index]!];
  return { ...fields, options };
}
export function removeQuestionOption(fields: QuestionFields, id: string): QuestionFields {
  if (fields.options.length <= 2 || fields.type === "TRUE_FALSE") return fields;
  return {
    ...fields,
    options: fields.options.filter((o) => o.id !== id),
    correctIds: fields.correctIds.filter((key) => key !== id),
  };
}
