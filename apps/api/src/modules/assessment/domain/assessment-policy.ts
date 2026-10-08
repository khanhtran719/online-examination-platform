import { IdempotencyKeyExpiredError, invalidRequest } from "./assessment.error";

export const QUESTION_PAGE_BYTES = 262_144;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type ChoiceType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";

export interface SelectionCommand {
  questionId: string;
  selectedOptionIds: readonly string[];
  marked: boolean;
  expectedVersion: number;
}

export interface ChoiceSet {
  questionId: string;
  type: ChoiceType;
  optionIds: readonly string[];
}

export interface SubmittedEvent {
  eventId: string;
  eventType: "attempt.submitted.v1";
  aggregateId: string;
  occurredAt: string;
  correlationId: string;
  causationId: string;
  source: "online-examination-platform.assessment";
  version: 1;
  payload: {
    attemptId: string;
    examId: string;
    publishedVersionId: string;
    submissionId: string;
    deadline: string;
    expired: boolean;
    submissionKind: SubmissionKind;
  };
}

export type SubmissionKind = "MANUAL" | "DEADLINE";

export function requireFreshKey(key: string, now: number): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)) {
    throw invalidRequest();
  }
  const time = Number.parseInt(key.slice(0, 8) + key.slice(9, 13), 16);
  if (time > now + 300_000) throw invalidRequest();
  if (time < now - 86_400_000) throw new IdempotencyKeyExpiredError();
}

export function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

/** UUID casing and selected option order do not change an answer's meaning. */
export function normalizeSelections(commands: readonly SelectionCommand[]): SelectionCommand[] {
  return commands.map((command) => ({
    ...command,
    questionId: command.questionId.toLowerCase(),
    selectedOptionIds: command.selectedOptionIds.map((id) => id.toLowerCase()).sort(),
  }));
}

export function assertSelections(
  commands: readonly SelectionCommand[],
  choices: readonly ChoiceSet[],
): void {
  if (commands.length < 1 || commands.length > 20 || choices.length !== commands.length) {
    throw invalidRequest();
  }
  const ids = commands.map((command) => command.questionId);
  if (new Set(ids).size !== ids.length) throw invalidRequest();
  const byId = new Map(choices.map((choice) => [choice.questionId, choice]));
  if (byId.size !== choices.length) throw invalidRequest();
  for (const command of commands) {
    const choice = byId.get(command.questionId);
    if (!choice) throw invalidRequest();
    const selected = command.selectedOptionIds;
    if (selected.length > 10 || new Set(selected).size !== selected.length) throw invalidRequest();
    const allowed = new Set(choice.optionIds);
    if (selected.some((optionId) => !allowed.has(optionId))) throw invalidRequest();
    if (choice.type !== "MULTIPLE_CHOICE" && selected.length > 1) throw invalidRequest();
  }
}

/** Find the largest encoded prefix; continuation stays on the last returned item. */
export function fitQuestionPage<T>(
  rows: readonly T[],
  bytes: (items: readonly T[]) => number,
): { kept: T[]; truncated: boolean } {
  if (!rows.length) return { kept: [], truncated: false };
  if (bytes(rows.slice(0, 1)) > QUESTION_PAGE_BYTES) throw invalidRequest();
  let low = 1;
  let high = rows.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (bytes(rows.slice(0, middle)) <= QUESTION_PAGE_BYTES) low = middle;
    else high = middle - 1;
  }
  return { kept: rows.slice(0, low), truncated: low < rows.length };
}

export function manualSubmissionEvent(
  input: Omit<SubmissionEventInput, "submissionKind">,
): SubmittedEvent {
  return submissionEvent({ ...input, submissionKind: "MANUAL" });
}

export interface SubmissionEventInput {
  eventId: string;
  attemptId: string;
  examId: string;
  publishedVersionId: string;
  submissionId: string;
  occurredAt: string;
  deadline: string;
  expired: boolean;
  submissionKind: SubmissionKind;
  correlationId: string;
  causationId: string;
}

/** Shared MANUAL and DEADLINE intent. The JSON schema is unchanged. */
export function submissionEvent(input: SubmissionEventInput): SubmittedEvent {
  const event: SubmittedEvent = {
    eventId: input.eventId,
    eventType: "attempt.submitted.v1",
    aggregateId: input.attemptId,
    occurredAt: input.occurredAt,
    correlationId: input.correlationId,
    causationId: input.causationId,
    source: "online-examination-platform.assessment",
    version: 1,
    payload: {
      attemptId: input.attemptId,
      examId: input.examId,
      publishedVersionId: input.publishedVersionId,
      submissionId: input.submissionId,
      deadline: input.deadline,
      expired: input.expired,
      submissionKind: input.submissionKind,
    },
  };
  assertSubmittedEvent(event);
  return event;
}

function assertSubmittedEvent(event: SubmittedEvent): void {
  const keys = Object.keys(event).sort();
  if (
    keys.join() !==
    "aggregateId,causationId,correlationId,eventId,eventType,occurredAt,payload,source,version"
  ) {
    throw invalidRequest();
  }
  const payloadKeys = Object.keys(event.payload).sort();
  if (
    payloadKeys.join() !==
    "attemptId,deadline,examId,expired,publishedVersionId,submissionId,submissionKind"
  ) {
    throw invalidRequest();
  }
  if (
    event.eventType !== "attempt.submitted.v1" ||
    event.source !== "online-examination-platform.assessment" ||
    event.version !== 1 ||
    (event.payload.submissionKind !== "MANUAL" && event.payload.submissionKind !== "DEADLINE") ||
    (event.payload.submissionKind === "DEADLINE" && event.payload.expired !== true) ||
    event.aggregateId !== event.payload.attemptId ||
    typeof event.payload.expired !== "boolean" ||
    !instant.test(event.occurredAt) ||
    !instant.test(event.payload.deadline) ||
    [
      event.eventId,
      event.aggregateId,
      event.correlationId,
      event.causationId,
      event.payload.examId,
      event.payload.publishedVersionId,
      event.payload.submissionId,
    ].some((value) => !uuid.test(value))
  ) {
    throw invalidRequest();
  }
}
