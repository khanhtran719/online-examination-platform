import {
  IdempotencyKeyExpiredError,
  PublicationIncompleteError,
  ExamClosedError,
  invalidRequest,
} from "./catalog-error";

export const categories = [
  "TOEIC",
  "IELTS",
  "IT_CERTIFICATION",
  "UNIVERSITY",
  "RECRUITMENT",
  "CORPORATE",
] as const;
export const questionTypes = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;
export const explanationPolicies = ["NEVER", "AFTER_COMPLETION", "AFTER_EXAM_CLOSE"] as const;
export type Category = (typeof categories)[number];
export type QuestionType = (typeof questionTypes)[number];
export type ExplanationPolicy = (typeof explanationPolicies)[number];

export interface OptionDraft {
  position: number;
  text: string;
}
export interface QuestionDraft {
  type: QuestionType;
  prompt: string;
  options: OptionDraft[];
  correctOptionPositions: number[];
  points: number;
  explanation: string;
}
export interface QuestionLink {
  bankQuestionId: string;
  position: number;
  points: number;
}
export interface SectionDraft {
  title: string;
  position: number;
  questions: QuestionLink[];
}
export interface ExamDraft {
  title: string;
  category: Category;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionDraft[];
  expectedRevision: number;
}
export interface PublicationShape {
  durationSeconds: number;
  attemptLimit: number;
  opensAt: number;
  closesAt: number;
  displayTimezone: string;
  now: number;
  sections: {
    questions: {
      archived: boolean;
      type: QuestionType;
      optionCount: number;
      keyCount: number;
    }[];
  }[];
}
export interface ImportIssue {
  clientRef: string;
  field: string;
  message: string;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeExplanation(value: string | null | undefined): string {
  return value ?? "";
}

export function validTimeZone(zone: string): boolean {
  if (zone.length < 1 || zone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function integer(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function validText(value: unknown, min: number, max: number): value is string {
  if (typeof value !== "string") return false;
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (++length > max) return false;
    if (value.codePointAt(index)! > 0xffff) index += 1;
  }
  return length >= min;
}

function utcInstant(value: string): number | null {
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!parts) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const canonical = `${parts[1]}.${(parts[2] ?? "").padEnd(3, "0")}Z`;
  return new Date(time).toISOString() === canonical ? time : null;
}

export function validateQuestion(input: QuestionDraft): QuestionDraft {
  if (!questionTypes.includes(input.type)) throw invalidRequest();
  if (!validText(input.prompt, 1, 8000)) throw invalidRequest();
  const explanation = normalizeExplanation(input.explanation);
  if (!validText(explanation, 0, 8000)) throw invalidRequest();
  if (!integer(input.points, 1, 1000)) throw invalidRequest();
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 10)
    throw invalidRequest();
  const positions = new Set<number>();
  for (const option of input.options) {
    if (
      !integer(option.position, 1, 10) ||
      !validText(option.text, 1, 2000) ||
      positions.has(option.position)
    )
      throw invalidRequest();
    positions.add(option.position);
  }
  if (
    !Array.isArray(input.correctOptionPositions) ||
    input.correctOptionPositions.length < 1 ||
    input.correctOptionPositions.length > input.options.length
  )
    throw invalidRequest();
  const keys = [...input.correctOptionPositions];
  if (new Set(keys).size !== keys.length || keys.some((key) => !positions.has(key)))
    throw invalidRequest();
  if (input.type === "SINGLE_CHOICE" && keys.length !== 1) throw invalidRequest();
  if (input.type === "TRUE_FALSE" && (input.options.length !== 2 || keys.length !== 1))
    throw invalidRequest();
  keys.sort((a, b) => a - b);
  const options = [...input.options].sort((a, b) => a.position - b.position);
  return {
    type: input.type,
    prompt: input.prompt,
    options,
    correctOptionPositions: keys,
    points: input.points,
    explanation,
  };
}

export function validateExamDraft(input: ExamDraft): ExamDraft {
  if (!validText(input.title, 1, 200)) throw invalidRequest();
  if (!categories.includes(input.category)) throw invalidRequest();
  if (!integer(input.durationSeconds, 60, 14400) || !integer(input.attemptLimit, 1, 10))
    throw invalidRequest();
  if (!explanationPolicies.includes(input.explanationPolicy)) throw invalidRequest();
  if (typeof input.leaderboardEnabled !== "boolean") throw invalidRequest();
  if (!validTimeZone(input.displayTimezone)) throw invalidRequest();
  const openAt = utcInstant(input.openAt);
  const closeAt = utcInstant(input.closeAt);
  if (openAt === null || closeAt === null || openAt >= closeAt) throw invalidRequest();
  if (!integer(input.expectedRevision, 0, 2147483647)) throw invalidRequest();
  if (!Array.isArray(input.sections) || input.sections.length > 20) throw invalidRequest();
  const sectionPositions = new Set<number>();
  const bankIds = new Set<string>();
  let questionCount = 0;
  const sections = input.sections.map((section) => {
    if (!validText(section.title, 1, 200)) throw invalidRequest();
    if (!integer(section.position, 1, 20) || sectionPositions.has(section.position))
      throw invalidRequest();
    sectionPositions.add(section.position);
    if (!Array.isArray(section.questions) || section.questions.length > 500) throw invalidRequest();
    const questionPositions = new Set<number>();
    const questions = section.questions.map((link) => {
      questionCount += 1;
      if (
        typeof link.bankQuestionId !== "string" ||
        !uuid.test(link.bankQuestionId) ||
        bankIds.has(link.bankQuestionId) ||
        !integer(link.position, 1, 500) ||
        questionPositions.has(link.position) ||
        !integer(link.points, 1, 1000)
      )
        throw invalidRequest();
      bankIds.add(link.bankQuestionId);
      questionPositions.add(link.position);
      return link;
    });
    questions.sort((a, b) => a.position - b.position);
    return { ...section, questions };
  });
  if (questionCount > 500) throw invalidRequest();
  sections.sort((a, b) => a.position - b.position);
  return {
    ...input,
    openAt: new Date(openAt).toISOString(),
    closeAt: new Date(closeAt).toISOString(),
    sections,
  };
}

function keyShape(question: PublicationShape["sections"][number]["questions"][number]): boolean {
  if (question.archived) return false;
  if (question.optionCount < 2 || question.optionCount > 10 || question.keyCount < 1) return false;
  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    if (question.keyCount !== 1) return false;
  }
  if (question.type === "TRUE_FALSE" && question.optionCount !== 2) return false;
  return questionTypes.includes(question.type);
}

export function validatePublication(input: PublicationShape): void {
  const count = input.sections.reduce((sum, section) => sum + section.questions.length, 0);
  if (
    !integer(input.durationSeconds, 60, 14400) ||
    !integer(input.attemptLimit, 1, 10) ||
    !validTimeZone(input.displayTimezone) ||
    !(input.opensAt < input.closesAt) ||
    input.sections.length < 1 ||
    input.sections.length > 20 ||
    count < 1 ||
    count > 500 ||
    input.sections.some(
      (section) => section.questions.length < 1 || section.questions.some((q) => !keyShape(q)),
    )
  )
    throw new PublicationIncompleteError();
  if (input.now >= input.closesAt) throw new ExamClosedError();
}

export function requireFreshKey(key: string, now: number): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key))
    throw invalidRequest();
  const time = Number.parseInt(key.slice(0, 8) + key.slice(9, 13), 16);
  if (time > now + 300000) throw invalidRequest();
  if (time < now - 86400000) throw new IdempotencyKeyExpiredError();
}

export function importIssues(entries: (QuestionDraft & { clientRef: string })[]): ImportIssue[] {
  const seen = new Set<string>();
  const issues: ImportIssue[] = [];
  for (const entry of entries) {
    if (seen.has(entry.clientRef)) {
      issues.push({
        clientRef: entry.clientRef,
        field: "clientRef",
        message: "Client reference is duplicated",
      });
      continue;
    }
    seen.add(entry.clientRef);
    try {
      validateQuestion(entry);
    } catch {
      const positions = new Set(entry.options.map((option) => option.position));
      const field = entry.correctOptionPositions.some((key) => !positions.has(key))
        ? "correctOptionPositions"
        : entry.type === "TRUE_FALSE"
          ? "type"
          : "correctOptionPositions";
      issues.push({
        clientRef: entry.clientRef,
        field,
        message: "Question is not valid",
      });
    }
  }
  return issues;
}

const importFields = [
  "clientRef",
  "type",
  "prompt",
  "options",
  "correctOptionPositions",
  "points",
  "explanation",
] as const;

export interface ImportCommand {
  schemaVersion: 1;
  dryRun: boolean;
  questions: (QuestionDraft & { clientRef: string })[];
}

function plain(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const present = Object.keys(value);
  return present.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function assertImportStructure(value: unknown): ImportCommand {
  const body = plain(value);
  if (!body || !exactKeys(body, ["schemaVersion", "dryRun", "questions"])) throw invalidRequest();
  if (
    body.schemaVersion !== 1 ||
    typeof body.dryRun !== "boolean" ||
    !Array.isArray(body.questions)
  )
    throw invalidRequest();
  if (body.questions.length < 1 || body.questions.length > 100) throw invalidRequest();
  const questions = body.questions.map((entry) => {
    const row = plain(entry);
    if (!row || !exactKeys(row, importFields)) throw invalidRequest();
    if (typeof row.clientRef !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(row.clientRef))
      throw invalidRequest();
    if (!questionTypes.includes(row.type as QuestionType)) throw invalidRequest();
    if (!validText(row.prompt, 1, 8000)) throw invalidRequest();
    if (!Array.isArray(row.options) || row.options.length < 2 || row.options.length > 10)
      throw invalidRequest();
    const options = row.options.map((option) => {
      const item = plain(option);
      if (!item || !exactKeys(item, ["position", "text"])) throw invalidRequest();
      if (!integer(item.position as number, 1, 10)) throw invalidRequest();
      if (!validText(item.text, 1, 2000)) throw invalidRequest();
      return { position: item.position as number, text: item.text };
    });
    if (
      !Array.isArray(row.correctOptionPositions) ||
      row.correctOptionPositions.length < 1 ||
      row.correctOptionPositions.length > 10 ||
      new Set(row.correctOptionPositions).size !== row.correctOptionPositions.length ||
      row.correctOptionPositions.some((key) => !integer(key as number, 1, 10))
    )
      throw invalidRequest();
    if (!integer(row.points as number, 1, 1000)) throw invalidRequest();
    if (row.explanation !== null && typeof row.explanation !== "string") throw invalidRequest();
    const explanation = normalizeExplanation(row.explanation as string | null);
    if (!validText(explanation, 0, 8000)) throw invalidRequest();
    return {
      clientRef: row.clientRef,
      type: row.type as QuestionType,
      prompt: row.prompt,
      options,
      correctOptionPositions: row.correctOptionPositions as number[],
      points: row.points as number,
      explanation,
    };
  });
  return { schemaVersion: 1, dryRun: body.dryRun, questions };
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
