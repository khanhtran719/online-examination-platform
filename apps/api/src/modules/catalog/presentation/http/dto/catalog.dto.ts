import { invalidRequest } from "../../../domain/catalog-error";
import {
  ExamDraft,
  ImportCommand,
  QuestionDraft,
  assertImportStructure,
  categories,
  explanationPolicies,
  questionTypes,
  validText,
} from "../../../domain/catalog-policy";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKey = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function resourceId(value: string): string {
  if (!uuid.test(value)) throw invalidRequest();
  return value;
}

export function idempotency(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !idempotencyKey.test(value)) throw invalidRequest();
  return value;
}

function record(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidRequest();
  const keys = Object.keys(value);
  if (keys.length !== fields.length || !fields.every((field) => Object.hasOwn(value, field)))
    throw invalidRequest();
  return value as Record<string, unknown>;
}

function text(value: unknown, min: number, max: number): string {
  if (!validText(value, min, max)) throw invalidRequest();
  return value;
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    throw invalidRequest();
  return value;
}

function instant(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  )
    throw invalidRequest();
  return value;
}

function option(value: unknown): { position: number; text: string } {
  const row = record(value, ["position", "text"]);
  return { position: integer(row.position, 1, 10), text: text(row.text, 1, 2000) };
}

export function questionWrite(value: unknown): QuestionDraft & { expectedRevision: number } {
  const row = record(value, [
    "type",
    "prompt",
    "options",
    "correctOptionPositions",
    "points",
    "explanation",
    "expectedRevision",
  ]);
  if (!questionTypes.includes(row.type as (typeof questionTypes)[number])) throw invalidRequest();
  if (!Array.isArray(row.options) || row.options.length < 2 || row.options.length > 10)
    throw invalidRequest();
  if (
    !Array.isArray(row.correctOptionPositions) ||
    row.correctOptionPositions.length < 1 ||
    row.correctOptionPositions.length > 10
  )
    throw invalidRequest();
  if (row.explanation !== null && typeof row.explanation !== "string") throw invalidRequest();
  return {
    type: row.type as QuestionDraft["type"],
    prompt: text(row.prompt, 1, 8000),
    options: row.options.map(option),
    correctOptionPositions: row.correctOptionPositions.map((item) => integer(item, 1, 10)),
    points: integer(row.points, 1, 1000),
    explanation: row.explanation === null ? "" : text(row.explanation, 0, 8000),
    expectedRevision: integer(row.expectedRevision, 0, 2147483647),
  };
}

export function examWrite(value: unknown): ExamDraft {
  const row = record(value, [
    "title",
    "category",
    "durationSeconds",
    "openAt",
    "closeAt",
    "displayTimezone",
    "attemptLimit",
    "explanationPolicy",
    "leaderboardEnabled",
    "sections",
    "expectedRevision",
  ]);
  if (!categories.includes(row.category as (typeof categories)[number])) throw invalidRequest();
  if (!explanationPolicies.includes(row.explanationPolicy as (typeof explanationPolicies)[number]))
    throw invalidRequest();
  if (typeof row.leaderboardEnabled !== "boolean") throw invalidRequest();
  if (!Array.isArray(row.sections) || row.sections.length > 20) throw invalidRequest();
  return {
    title: text(row.title, 1, 200),
    category: row.category as ExamDraft["category"],
    durationSeconds: integer(row.durationSeconds, 60, 14400),
    openAt: instant(row.openAt),
    closeAt: instant(row.closeAt),
    displayTimezone: text(row.displayTimezone, 1, 64),
    attemptLimit: integer(row.attemptLimit, 1, 10),
    explanationPolicy: row.explanationPolicy as ExamDraft["explanationPolicy"],
    leaderboardEnabled: row.leaderboardEnabled,
    sections: row.sections.map(section),
    expectedRevision: integer(row.expectedRevision, 0, 2147483647),
  };
}

function section(value: unknown): ExamDraft["sections"][number] {
  const row = record(value, ["title", "position", "questions"]);
  if (!Array.isArray(row.questions) || row.questions.length > 500) throw invalidRequest();
  return {
    title: text(row.title, 1, 200),
    position: integer(row.position, 1, 20),
    questions: row.questions.map((item) => {
      const link = record(item, ["bankQuestionId", "position", "points"]);
      return {
        bankQuestionId: text(link.bankQuestionId, 36, 36),
        position: integer(link.position, 1, 500),
        points: integer(link.points, 1, 1000),
      };
    }),
  };
}

export function revisionRequest(value: unknown): number {
  const row = record(value, ["expectedRevision"]);
  return integer(row.expectedRevision, 1, 2147483647);
}

export function importRequest(value: unknown): ImportCommand {
  return assertImportStructure(value);
}

export function listQuery(
  value: unknown,
  category = false,
): { pageSize: number; cursor?: string; category?: string } {
  const query = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const allowed = category ? ["pageSize", "cursor", "category"] : ["pageSize", "cursor"];
  if (Object.keys(query).some((key) => !allowed.includes(key))) throw invalidRequest();
  const row = query as Record<string, unknown>;
  const size =
    row.pageSize === undefined
      ? 20
      : integer(typeof row.pageSize === "string" ? Number(row.pageSize) : row.pageSize, 1, 100);
  if (typeof row.pageSize === "string" && !/^\d+$/.test(row.pageSize)) throw invalidRequest();
  let cursor: string | undefined;
  if (row.cursor !== undefined) {
    if (typeof row.cursor !== "string" || row.cursor.length < 1 || row.cursor.length > 2048)
      throw invalidRequest();
    cursor = row.cursor;
  }
  let selected: string | undefined;
  if (category && row.category !== undefined) {
    if (
      typeof row.category !== "string" ||
      !categories.includes(row.category as (typeof categories)[number])
    )
      throw invalidRequest();
    selected = row.category;
  }
  return { pageSize: size, cursor, category: selected };
}
