import { invalidRequest } from "../../../domain/errors";
export function body(value: unknown, fields: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== fields.length ||
    !fields.every((k) => Object.hasOwn(value, k))
  )
    throw invalidRequest();
  return value as Record<string, unknown>;
}
export function text(value: unknown, min: number, max: number): string {
  if (
    typeof value !== "string" ||
    [...value].length < min ||
    [...value].length > max ||
    /\p{Cc}/u.test(value)
  )
    throw invalidRequest();
  return value;
}
export function email(value: unknown): string {
  if (typeof value !== "string") throw invalidRequest();
  const v = value.trim().toLowerCase();
  if (
    v.length > 254 ||
    v.length < 3 ||
    /[^\x20-\x7e]/.test(v) ||
    !/^\S+@[^\s@]+\.[^\s@]+$/.test(v) ||
    v.split("@").length !== 2
  )
    throw invalidRequest();
  return v;
}
export function password(value: unknown, min = 15): string {
  if (typeof value !== "string" || [...value].length < min || [...value].length > 128)
    throw invalidRequest();
  return value;
}
export function profileInput(value: unknown): {
  displayName: string;
  leaderboardOptIn: boolean;
  expectedRevision: number;
} {
  const v = body(value, ["displayName", "leaderboardOptIn", "expectedRevision"]);
  if (
    typeof v.leaderboardOptIn !== "boolean" ||
    !Number.isSafeInteger(v.expectedRevision) ||
    (v.expectedRevision as number) < 1
  )
    throw invalidRequest();
  return {
    displayName: text(v.displayName, 1, 80),
    leaderboardOptIn: v.leaderboardOptIn,
    expectedRevision: v.expectedRevision as number,
  };
}
