import type {
  Accepted,
  ActiveCandidate,
  AdminExam,
  AdminQuestion,
  AdminSubmission,
  Answer,
  Attempt,
  AttemptStatus,
  AuditEntry,
  CandidateOption,
  CandidateQuestion,
  Category,
  Csrf,
  Exam,
  ExplanationPolicy,
  HistoryItem,
  ImportIssue,
  ImportReport,
  ImportedQuestion,
  LeaderboardEntry,
  Metrics,
  MutationReceipt,
  Page,
  Profile,
  QuestionOptionInput,
  QuestionStatistic,
  QuestionType,
  Result,
  ReviewQuestion,
  Revoked,
  SaveReceipt,
  SectionInput,
  SectionScore,
  SectionSummary,
  Session,
  SubmitReceipt,
  Verified,
} from "./dto";
import { ApiError } from "./errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function malformed(): ApiError {
  return new ApiError({
    kind: "malformed",
    status: 0,
    errorCode: "Malformed response",
    message: "Phản hồi không đúng định dạng.",
  });
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw malformed();
  return value as Record<string, unknown>;
}

function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const data = record(value);
  const actual = Object.keys(data).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw malformed();
  }
  return data;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw malformed();
  return value;
}

function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw malformed();
  return value;
}

function num(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw malformed();
  return value;
}

function int(value: unknown): number {
  const parsed = num(value);
  if (!Number.isInteger(parsed)) throw malformed();
  return parsed;
}

function uuid(value: unknown): string {
  const parsed = text(value);
  if (!UUID.test(parsed)) throw malformed();
  return parsed;
}

function timestamp(value: unknown): string {
  const parsed = text(value);
  if (!parsed.endsWith("Z")) throw malformed();
  return parsed;
}

function nullable<T>(value: unknown, parse: (item: unknown) => T): T | null {
  if (value === null) return null;
  return parse(value);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T {
  const parsed = text(value);
  if (!allowed.includes(parsed as T)) throw malformed();
  return parsed as T;
}

function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw malformed();
  return value.map((item) => parse(item));
}

function successRecord(payload: unknown, withMetadata: boolean): Record<string, unknown> {
  const keys = withMetadata
    ? ["data", "errorCode", "message", "status", "metadata"]
    : ["data", "errorCode", "message", "status"];
  const data = exact(payload, keys);
  if (data.status !== true || data.errorCode !== null || data.message !== null) throw malformed();
  return data;
}

export function parseData<T>(payload: unknown, parse: (value: unknown) => T): T {
  return parse(successRecord(payload, false).data);
}

export function parsePage<T>(payload: unknown, parse: (value: unknown) => T): Page<T> {
  const data = successRecord(payload, true);
  const metadata = exact(data.metadata, ["next", "pageSize"]);
  const next = metadata.next;
  if (next !== null && typeof next !== "string") throw malformed();
  return {
    items: list(data.data, parse),
    next,
    pageSize: int(metadata.pageSize),
  };
}

export function parseErrorEnvelope(payload: unknown): { errorCode: string; message: string } {
  const data = exact(payload, ["data", "errorCode", "message", "status"]);
  if (data.data !== null || data.status !== false) throw malformed();
  const errorCode = text(data.errorCode);
  const message = text(data.message);
  if (!errorCode || !message) throw malformed();
  return { errorCode, message };
}

export function parseAccepted(value: unknown): Accepted {
  const data = exact(value, ["accepted"]);
  if (data.accepted !== true) throw malformed();
  return { accepted: true };
}

export function parseRevoked(value: unknown): Revoked {
  const data = exact(value, ["revoked"]);
  if (data.revoked !== true) throw malformed();
  return { revoked: true };
}

export function parseVerified(value: unknown): Verified {
  const data = exact(value, ["verified"]);
  if (data.verified !== true) throw malformed();
  return { verified: true };
}

export function parseCsrf(value: unknown): Csrf {
  const data = exact(value, ["csrfToken", "expiresAt"]);
  return { csrfToken: text(data.csrfToken), expiresAt: timestamp(data.expiresAt) };
}

export function parseSession(value: unknown): Session {
  const data = exact(value, ["userId", "accessExpiresAt", "refreshExpiresAt", "absoluteExpiresAt"]);
  return {
    userId: uuid(data.userId),
    accessExpiresAt: timestamp(data.accessExpiresAt),
    refreshExpiresAt: timestamp(data.refreshExpiresAt),
    absoluteExpiresAt: timestamp(data.absoluteExpiresAt),
  };
}

export function parseProfile(value: unknown): Profile {
  const data = exact(value, [
    "id",
    "email",
    "emailVerifiedAt",
    "displayName",
    "leaderboardOptIn",
    "revision",
  ]);
  return {
    id: uuid(data.id),
    email: text(data.email),
    emailVerifiedAt: timestamp(data.emailVerifiedAt),
    displayName: text(data.displayName),
    leaderboardOptIn: bool(data.leaderboardOptIn),
    revision: int(data.revision),
  };
}

export function parseMutationReceipt(value: unknown): MutationReceipt {
  const data = exact(value, ["resourceId", "revision", "acceptedAt"]);
  return {
    resourceId: uuid(data.resourceId),
    revision: int(data.revision),
    acceptedAt: timestamp(data.acceptedAt),
  };
}

function parseSectionSummary(value: unknown): SectionSummary {
  const data = exact(value, ["id", "title", "position", "questionCount", "possible"]);
  return {
    id: uuid(data.id),
    title: text(data.title),
    position: int(data.position),
    questionCount: int(data.questionCount),
    possible: int(data.possible),
  };
}

export function parseExam(value: unknown): Exam {
  const data = exact(value, [
    "id",
    "title",
    "category",
    "publishedVersionId",
    "version",
    "durationSeconds",
    "openAt",
    "closeAt",
    "displayTimezone",
    "attemptLimit",
    "questionCount",
    "scoringPolicy",
    "explanationPolicy",
    "leaderboardEnabled",
    "sections",
  ]);
  const scoring = text(data.scoringPolicy);
  if (scoring !== "EXACT_MATCH_V1") throw malformed();
  return {
    id: uuid(data.id),
    title: text(data.title),
    category: oneOf<Category>(data.category, [
      "TOEIC",
      "IELTS",
      "IT_CERTIFICATION",
      "UNIVERSITY",
      "RECRUITMENT",
      "CORPORATE",
    ]),
    publishedVersionId: uuid(data.publishedVersionId),
    version: int(data.version),
    durationSeconds: int(data.durationSeconds),
    openAt: timestamp(data.openAt),
    closeAt: timestamp(data.closeAt),
    displayTimezone: text(data.displayTimezone),
    attemptLimit: int(data.attemptLimit),
    questionCount: int(data.questionCount),
    scoringPolicy: "EXACT_MATCH_V1",
    explanationPolicy: oneOf<ExplanationPolicy>(data.explanationPolicy, [
      "NEVER",
      "AFTER_COMPLETION",
      "AFTER_EXAM_CLOSE",
    ]),
    leaderboardEnabled: bool(data.leaderboardEnabled),
    sections: list(data.sections, parseSectionSummary),
  };
}

function parseOption(value: unknown): CandidateOption {
  const data = exact(value, ["id", "position", "text"]);
  return { id: uuid(data.id), position: int(data.position), text: text(data.text) };
}

export function parseCandidateQuestion(value: unknown): CandidateQuestion {
  const data = exact(value, ["id", "sectionId", "position", "type", "prompt", "points", "options"]);
  return {
    id: uuid(data.id),
    sectionId: uuid(data.sectionId),
    position: int(data.position),
    type: oneOf<QuestionType>(data.type, ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]),
    prompt: text(data.prompt),
    points: int(data.points),
    options: list(data.options, parseOption),
  };
}

const STATUSES = [
  "CREATED",
  "IN_PROGRESS",
  "SUBMITTED",
  "PROCESSING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
] as const;

export function parseAttempt(value: unknown): Attempt {
  const data = exact(value, [
    "id",
    "examId",
    "publishedVersionId",
    "revision",
    "status",
    "startedAt",
    "deadline",
    "submittedAt",
    "expired",
    "serverNow",
    "canSave",
    "resultAvailable",
    "pollAfterSeconds",
    "replayPending",
  ]);
  return {
    id: uuid(data.id),
    examId: uuid(data.examId),
    publishedVersionId: uuid(data.publishedVersionId),
    revision: int(data.revision),
    status: oneOf<AttemptStatus>(data.status, STATUSES),
    startedAt: timestamp(data.startedAt),
    deadline: timestamp(data.deadline),
    submittedAt: nullable(data.submittedAt, timestamp),
    expired: bool(data.expired),
    serverNow: timestamp(data.serverNow),
    canSave: bool(data.canSave),
    resultAvailable: bool(data.resultAvailable),
    pollAfterSeconds: int(data.pollAfterSeconds),
    replayPending: bool(data.replayPending),
  };
}

export function parseAnswer(value: unknown): Answer {
  const data = exact(value, ["questionId", "selectedOptionIds", "marked", "version", "updatedAt"]);
  return {
    questionId: uuid(data.questionId),
    selectedOptionIds: list(data.selectedOptionIds, uuid),
    marked: bool(data.marked),
    version: int(data.version),
    updatedAt: nullable(data.updatedAt, timestamp),
  };
}

export function parseSaveReceipt(value: unknown): SaveReceipt {
  const data = exact(value, ["attemptId", "acceptedAt", "answers"]);
  return {
    attemptId: uuid(data.attemptId),
    acceptedAt: timestamp(data.acceptedAt),
    answers: list(data.answers, (item) => {
      const row = exact(item, ["questionId", "version"]);
      return { questionId: uuid(row.questionId), version: int(row.version) };
    }),
  };
}

export function parseSubmitReceipt(value: unknown): SubmitReceipt {
  const data = exact(value, [
    "attemptId",
    "submissionId",
    "acceptedAt",
    "acceptanceState",
    "expired",
  ]);
  return {
    attemptId: uuid(data.attemptId),
    submissionId: uuid(data.submissionId),
    acceptedAt: timestamp(data.acceptedAt),
    acceptanceState: oneOf(data.acceptanceState, ["SUBMITTED", "EXPIRED"] as const),
    expired: bool(data.expired),
  };
}

function parseSectionScore(value: unknown): SectionScore {
  const data = exact(value, ["sectionId", "earned", "possible", "correct", "total"]);
  return {
    sectionId: uuid(data.sectionId),
    earned: int(data.earned),
    possible: int(data.possible),
    correct: int(data.correct),
    total: int(data.total),
  };
}

export function parseResult(value: unknown): Result {
  const data = exact(value, [
    "attemptId",
    "publishedVersionId",
    "submissionId",
    "completedAt",
    "earned",
    "possible",
    "correct",
    "total",
    "percentageBasisPoints",
    "expired",
    "scoringPolicy",
    "sections",
    "review",
  ]);
  if (text(data.scoringPolicy) !== "EXACT_MATCH_V1") throw malformed();
  const earned = data.earned;
  if (earned === null) throw malformed();
  return {
    attemptId: uuid(data.attemptId),
    publishedVersionId: uuid(data.publishedVersionId),
    submissionId: uuid(data.submissionId),
    completedAt: timestamp(data.completedAt),
    earned: int(data.earned),
    possible: int(data.possible),
    correct: int(data.correct),
    total: int(data.total),
    percentageBasisPoints: int(data.percentageBasisPoints),
    expired: bool(data.expired),
    scoringPolicy: "EXACT_MATCH_V1",
    sections: list(data.sections, parseSectionScore),
    review: nullable(data.review, (item) => {
      const link = exact(item, ["href"]);
      return { href: text(link.href) };
    }),
  };
}

export function parseReviewQuestion(value: unknown): ReviewQuestion {
  const data = exact(value, [
    "question",
    "selectedOptionIds",
    "correctOptionIds",
    "correct",
    "explanation",
  ]);
  return {
    question: parseCandidateQuestion(data.question),
    selectedOptionIds: list(data.selectedOptionIds, uuid),
    correctOptionIds: list(data.correctOptionIds, uuid),
    correct: bool(data.correct),
    explanation: nullable(data.explanation, text),
  };
}

export function parseLeaderboardEntry(value: unknown): LeaderboardEntry {
  const data = exact(value, ["rank", "pseudonym", "earned", "possible", "completedAt"]);
  return {
    rank: int(data.rank),
    pseudonym: text(data.pseudonym),
    earned: int(data.earned),
    possible: int(data.possible),
    completedAt: timestamp(data.completedAt),
  };
}

export function parseHistoryItem(value: unknown): HistoryItem {
  const data = exact(value, [
    "attemptId",
    "examId",
    "publishedVersionId",
    "startedAt",
    "status",
    "expired",
    "earned",
    "possible",
  ]);
  return {
    attemptId: uuid(data.attemptId),
    examId: uuid(data.examId),
    publishedVersionId: uuid(data.publishedVersionId),
    startedAt: timestamp(data.startedAt),
    status: oneOf<AttemptStatus>(data.status, STATUSES),
    expired: bool(data.expired),
    earned: nullable(data.earned, int),
    possible: nullable(data.possible, int),
  };
}

function parseOptionInput(value: unknown): QuestionOptionInput {
  const data = exact(value, ["position", "text"]);
  return { position: int(data.position), text: text(data.text) };
}

export function parseAdminQuestion(value: unknown): AdminQuestion {
  const data = exact(value, [
    "id",
    "revision",
    "archived",
    "type",
    "prompt",
    "options",
    "correctOptionPositions",
    "points",
    "explanation",
  ]);
  return {
    id: uuid(data.id),
    revision: int(data.revision),
    archived: bool(data.archived),
    type: oneOf<QuestionType>(data.type, ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"]),
    prompt: text(data.prompt),
    options: list(data.options, parseOptionInput),
    correctOptionPositions: list(data.correctOptionPositions, int),
    points: int(data.points),
    explanation: nullable(data.explanation, text),
  };
}

function parseReference(value: unknown): {
  bankQuestionId: string;
  position: number;
  points: number;
} {
  const data = exact(value, ["bankQuestionId", "position", "points"]);
  return {
    bankQuestionId: uuid(data.bankQuestionId),
    position: int(data.position),
    points: int(data.points),
  };
}

function parseSectionInput(value: unknown): SectionInput {
  const data = exact(value, ["title", "position", "questions"]);
  return {
    title: text(data.title),
    position: int(data.position),
    questions: list(data.questions, parseReference),
  };
}

export function parseAdminExam(value: unknown): AdminExam {
  const data = exact(value, [
    "id",
    "revision",
    "published",
    "archived",
    "publishedVersionId",
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
  ]);
  return {
    id: uuid(data.id),
    revision: int(data.revision),
    published: bool(data.published),
    archived: bool(data.archived),
    publishedVersionId: nullable(data.publishedVersionId, uuid),
    title: text(data.title),
    category: oneOf<Category>(data.category, [
      "TOEIC",
      "IELTS",
      "IT_CERTIFICATION",
      "UNIVERSITY",
      "RECRUITMENT",
      "CORPORATE",
    ]),
    durationSeconds: int(data.durationSeconds),
    openAt: timestamp(data.openAt),
    closeAt: timestamp(data.closeAt),
    displayTimezone: text(data.displayTimezone),
    attemptLimit: int(data.attemptLimit),
    explanationPolicy: oneOf<ExplanationPolicy>(data.explanationPolicy, [
      "NEVER",
      "AFTER_COMPLETION",
      "AFTER_EXAM_CLOSE",
    ]),
    leaderboardEnabled: bool(data.leaderboardEnabled),
    sections: list(data.sections, parseSectionInput),
  };
}

export function parseImportReport(value: unknown): ImportReport {
  const data = exact(value, ["id", "valid", "committed", "issues", "questions", "createdAt"]);
  return {
    id: uuid(data.id),
    valid: bool(data.valid),
    committed: bool(data.committed),
    issues: list(data.issues, (item) => {
      const row = exact(item, ["clientRef", "field", "message"]);
      const issue: ImportIssue = {
        clientRef: text(row.clientRef),
        field: text(row.field),
        message: text(row.message),
      };
      return issue;
    }),
    questions: list(data.questions, (item) => {
      const row = exact(item, ["clientRef", "questionId"]);
      const created: ImportedQuestion = {
        clientRef: text(row.clientRef),
        questionId: uuid(row.questionId),
      };
      return created;
    }),
    createdAt: timestamp(data.createdAt),
  };
}

export function parseActiveCandidate(value: unknown): ActiveCandidate {
  const data = exact(value, ["candidateId", "attemptId", "status", "startedAt", "deadline"]);
  return {
    candidateId: uuid(data.candidateId),
    attemptId: uuid(data.attemptId),
    status: oneOf<AttemptStatus>(data.status, STATUSES),
    startedAt: timestamp(data.startedAt),
    deadline: timestamp(data.deadline),
  };
}

export function parseAdminSubmission(value: unknown): AdminSubmission {
  const data = exact(value, [
    "candidateId",
    "attemptId",
    "publishedVersionId",
    "submittedAt",
    "status",
    "expired",
    "earned",
    "possible",
  ]);
  return {
    candidateId: uuid(data.candidateId),
    attemptId: uuid(data.attemptId),
    publishedVersionId: uuid(data.publishedVersionId),
    submittedAt: nullable(data.submittedAt, timestamp),
    status: oneOf<AttemptStatus>(data.status, STATUSES),
    expired: bool(data.expired),
    earned: nullable(data.earned, int),
    possible: nullable(data.possible, int),
  };
}

export function parseQuestionStatistic(value: unknown): QuestionStatistic {
  const data = exact(value, [
    "questionId",
    "completedAttempts",
    "correct",
    "incorrect",
    "unanswered",
    "options",
  ]);
  return {
    questionId: uuid(data.questionId),
    completedAttempts: int(data.completedAttempts),
    correct: int(data.correct),
    incorrect: int(data.incorrect),
    unanswered: int(data.unanswered),
    options: list(data.options, (item) => {
      const row = exact(item, ["optionId", "selectedCount"]);
      return { optionId: uuid(row.optionId), selectedCount: int(row.selectedCount) };
    }),
  };
}

export function parseMetrics(value: unknown): Metrics {
  const data = exact(value, [
    "asOf",
    "activeCandidates",
    "submitted",
    "completed",
    "failed",
    "httpRps",
    "httpP95Ms",
    "queueDepth",
    "oldestJobSeconds",
  ]);
  return {
    asOf: timestamp(data.asOf),
    activeCandidates: int(data.activeCandidates),
    submitted: int(data.submitted),
    completed: int(data.completed),
    failed: int(data.failed),
    httpRps: num(data.httpRps),
    httpP95Ms: num(data.httpP95Ms),
    queueDepth: int(data.queueDepth),
    oldestJobSeconds: num(data.oldestJobSeconds),
  };
}

export function parseAuditEntry(value: unknown): AuditEntry {
  const data = exact(value, [
    "id",
    "occurredAt",
    "actorId",
    "action",
    "resourceType",
    "resourceId",
    "outcome",
    "reason",
    "correlationId",
    "changedFields",
  ]);
  return {
    id: uuid(data.id),
    occurredAt: timestamp(data.occurredAt),
    actorId: nullable(data.actorId, uuid),
    action: text(data.action),
    resourceType: text(data.resourceType),
    resourceId: uuid(data.resourceId),
    outcome: oneOf(data.outcome, ["SUCCESS", "DENIED", "FAILED"] as const),
    reason: nullable(data.reason, text),
    correlationId: uuid(data.correlationId),
    changedFields: list(data.changedFields, text),
  };
}
