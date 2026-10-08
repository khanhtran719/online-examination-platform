import { invalidRequest } from "../../../domain/assessment.error";
import { SelectionCommand } from "../../../domain/assessment-policy";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotencyKey = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function resourceId(value: string): string {
  if (!uuid.test(value)) throw invalidRequest();
  return value.toLowerCase();
}

export function idempotency(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !idempotencyKey.test(value)) throw invalidRequest();
  return value;
}

export function pageQuery(value: unknown): { pageSize: number; cursor?: string } {
  const query = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (Object.keys(query).some((key) => key !== "pageSize" && key !== "cursor"))
    throw invalidRequest();
  const row = query as Record<string, unknown>;
  const size =
    row.pageSize === undefined
      ? 20
      : integer(typeof row.pageSize === "string" ? Number(row.pageSize) : row.pageSize, 1, 100);
  if (typeof row.pageSize === "string" && !/^\d+$/.test(row.pageSize)) throw invalidRequest();
  let cursor: string | undefined;
  if (row.cursor !== undefined) {
    if (typeof row.cursor !== "string" || row.cursor.length < 1 || row.cursor.length > 2048) {
      throw invalidRequest();
    }
    cursor = row.cursor;
  }
  return { pageSize: size, cursor };
}

export function saveRequest(value: unknown): SelectionCommand[] {
  const row = record(value, ["answers"]);
  if (!Array.isArray(row.answers) || row.answers.length < 1 || row.answers.length > 20) {
    throw invalidRequest();
  }
  return row.answers.map(answer);
}

export function submitBody(value: unknown): void {
  if (value === undefined || value === null) return;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return;
  throw invalidRequest();
}

function answer(value: unknown): SelectionCommand {
  const row = record(value, ["questionId", "selectedOptionIds", "marked", "expectedVersion"]);
  if (typeof row.marked !== "boolean" || typeof row.questionId !== "string") throw invalidRequest();
  if (!Array.isArray(row.selectedOptionIds) || row.selectedOptionIds.length > 10)
    throw invalidRequest();
  const selectedOptionIds = row.selectedOptionIds.map((optionId) => {
    if (typeof optionId !== "string") throw invalidRequest();
    return resourceId(optionId);
  });
  if (new Set(selectedOptionIds).size !== selectedOptionIds.length) throw invalidRequest();
  return {
    questionId: resourceId(row.questionId),
    selectedOptionIds,
    marked: row.marked,
    expectedVersion: integer(row.expectedVersion, 0, 2_147_483_647),
  };
}

function record(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidRequest();
  const keys = Object.keys(value);
  if (keys.length !== fields.length || !fields.every((field) => Object.hasOwn(value, field))) {
    throw invalidRequest();
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    throw invalidRequest();
  }
  return value;
}
