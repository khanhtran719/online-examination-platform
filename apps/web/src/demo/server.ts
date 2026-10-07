import type {
  Accepted,
  ActiveCandidate,
  AdminExam,
  AdminQuestion,
  AdminSubmission,
  Answer,
  ApiSuccess,
  Attempt,
  AttemptStatus,
  AuditEntry,
  CandidateQuestion,
  Category,
  Exam,
  ExamWriteRequest,
  ExplanationPolicy,
  HistoryItem,
  ImportReport,
  ImportRequest,
  LeaderboardEntry,
  Metrics,
  Page,
  PageQuery,
  Permission,
  Profile,
  ProfileUpdate,
  QuestionStatistic,
  QuestionType,
  QuestionWriteRequest,
  ReplayRequest,
  Result,
  ReviewQuestion,
  SaveAnswersRequest,
  SaveReceipt,
  Session,
  SubmitReceipt,
} from "../shared/api/dto";
import { ApiError } from "../shared/api/errors";
import type { PlatformApi, ResultRead } from "../shared/api/platform";
import { uuidV7 } from "../shared/api/uuid";

export type DemoFault =
  "none" | "delay-ack" | "lose-ack" | "conflict-save" | "save-429" | "save-503" | "refresh-lost";
export type PermissionPreset = "candidate" | "admin" | "reviewer";

export interface MailItem {
  email: string;
  token: string;
  createdAt: string;
}

export interface DemoExtras {
  mailbox(): readonly MailItem[];
  permissions(): readonly Permission[];
  setPermissions(preset: PermissionPreset): void;
  setFault(fault: DemoFault): void;
  fault(): DemoFault;
  reset(): void;
  replayRevision(attemptId: string): number | null;
  loadStressExam(count: number): string;
}

interface FrozenQuestion {
  question: CandidateQuestion;
  correctOptionIds: string[];
  explanation: string | null;
}

interface Publication {
  versionId: string;
  version: number;
  exam: Exam;
  questions: FrozenQuestion[];
}

interface AttemptRecord {
  attempt: Attempt;
  ownerId: string;
  questions: FrozenQuestion[];
  answers: Map<string, Answer>;
  adminRevision: number;
  result: Result | null;
  submission: SubmitReceipt | null;
  scoringDueAt: number | null;
  frozenTitle: string;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  password: string | null;
  emailVerifiedAt: string | null;
  leaderboardOptIn: boolean;
  revision: number;
  disabled: boolean;
  token: string | null;
  tokenConsumed: boolean;
  lastResendAt: number | null;
}

interface IdempotencyRecord {
  hash: string;
  response: unknown;
}

const CANDIDATE_PERMISSIONS: Permission[] = [
  "catalog.read",
  "assessment.take",
  "assessment.result.read",
];
const ADMIN_PERMISSIONS: Permission[] = [
  ...CANDIDATE_PERMISSIONS,
  "catalog.manage",
  "catalog.keys.read",
  "catalog.import",
  "reporting.read",
  "assessment.review.admin",
  "assessment.replay",
  "audit.read",
  "system.metrics.read",
];
const REVIEWER_PERMISSIONS: Permission[] = ["catalog.read", "reporting.read"];

function id(n: number): string {
  return `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function stamp(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

function fail(
  status: number,
  errorCode: string,
  message = errorCode,
  retryAfterSeconds?: number,
): never {
  throw new ApiError({
    kind: "http",
    status,
    errorCode,
    message,
    retryAfterSeconds: retryAfterSeconds ?? null,
    correlationId: id(0x9000 + status),
  });
}

function hash(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const values = new Set(right);
  return left.every((item) => values.has(item));
}

export interface DemoServerOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createDemoServer(options: DemoServerOptions = {}): {
  api: PlatformApi;
  extras: DemoExtras;
} {
  const now = options.now ?? (() => Date.now());
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let users: UserRecord[] = [];
  let exams: AdminExam[] = [];
  let publications: Publication[] = [];
  let questions: AdminQuestion[] = [];
  let attempts: AttemptRecord[] = [];
  let audits: AuditEntry[] = [];
  let imports: ImportReport[] = [];
  let mail: MailItem[] = [];
  let session: { userId: string; csrf: string; accessExpiresAt: number } | null = null;
  let permissions: readonly Permission[] = CANDIDATE_PERMISSIONS;
  let fault: DemoFault = "none";
  let refreshFamilyBroken = false;
  const receipts = new Map<string, IdempotencyRecord>();
  const lostAcks = new Map<string, SaveReceipt>();

  function clock(): number {
    return now();
  }

  function iso(ms = clock()): string {
    return stamp(ms);
  }

  function userByEmail(email: string): UserRecord | undefined {
    return users.find((user) => user.email === email);
  }

  function currentUser(): UserRecord {
    if (!session) fail(401, "Unauthenticated");
    const user = users.find((item) => item.id === session?.userId);
    if (!user || user.disabled || !user.emailVerifiedAt) fail(401, "Unauthenticated");
    if (session.accessExpiresAt <= clock()) fail(401, "Unauthenticated");
    return user;
  }

  function requirePermission(permission: Permission): UserRecord {
    const user = currentUser();
    if (!permissions.includes(permission)) fail(403, "Permission denied");
    return user;
  }

  function audit(
    action: string,
    resourceType: string,
    resourceId: string,
    outcome: AuditEntry["outcome"],
    changed: string[],
  ): void {
    audits.unshift({
      id: uuidV7(clock()),
      occurredAt: iso(),
      actorId: session?.userId ?? null,
      action,
      resourceType,
      resourceId,
      outcome,
      reason: null,
      correlationId: uuidV7(clock() + 1),
      changedFields: changed,
    });
  }

  function ok<T>(data: T, status = 200, replayed = false): ApiSuccess<T> {
    return {
      data: structuredClone(data),
      meta: {
        httpStatus: status,
        correlationId: uuidV7(clock()),
        retryAfterSeconds: null,
        idempotencyReplayed: replayed,
      },
    };
  }

  function remember<T>(key: string, body: unknown, produce: () => T): T {
    const bodyHash = hash(body);
    const existing = receipts.get(key);
    if (existing) {
      if (existing.hash !== bodyHash) fail(400, "Invalid request");
      return existing.response as T;
    }
    const response = produce();
    receipts.set(key, { hash: bodyHash, response });
    return response;
  }

  function pageOf<T>(items: readonly T[], query: PageQuery, filter: string): Page<T> {
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    let offset = 0;
    if (query.cursor) {
      let parsed: { offset: number; filter: string; pageSize: number; expiresAt: number };
      try {
        parsed = JSON.parse(atob(query.cursor.slice("demo.".length))) as {
          offset: number;
          filter: string;
          pageSize: number;
          expiresAt: number;
        };
      } catch {
        fail(400, "Invalid request");
      }
      if (parsed.filter !== filter || parsed.pageSize !== pageSize || parsed.expiresAt <= clock()) {
        fail(400, "Invalid request");
      }
      offset = parsed.offset;
    }
    const slice = items.slice(offset, offset + pageSize);
    const nextOffset = offset + slice.length;
    const next =
      nextOffset < items.length
        ? `demo.${btoa(JSON.stringify({ offset: nextOffset, filter, pageSize, expiresAt: clock() + 15 * 60 * 1000 }))}`
        : null;
    return { items: slice, next, pageSize };
  }

  function publicationFor(versionId: string): Publication | undefined {
    return publications.find((item) => item.versionId === versionId);
  }

  function currentPublication(examId: string): Publication | undefined {
    return publications
      .filter((item) => item.exam.id === examId)
      .sort((left, right) => right.version - left.version)[0];
  }

  function projectAttempt(record: AttemptRecord): Attempt {
    advance(record);
    return { ...record.attempt };
  }

  function advance(record: AttemptRecord): void {
    if (!record.scoringDueAt || clock() < record.scoringDueAt) return;
    if (
      record.attempt.status !== "SUBMITTED" &&
      record.attempt.status !== "EXPIRED" &&
      record.attempt.status !== "FAILED"
    ) {
      return;
    }
    if (record.attempt.status === "FAILED" && !record.attempt.replayPending) return;
    record.result = buildResult(record);
    record.attempt = {
      ...record.attempt,
      status: "COMPLETED",
      resultAvailable: true,
      replayPending: false,
      canSave: false,
      serverNow: iso(),
      pollAfterSeconds: 0,
    };
    record.scoringDueAt = null;
  }

  function buildResult(record: AttemptRecord): Result {
    const sections = new Map<
      string,
      { earned: number; possible: number; correct: number; total: number }
    >();
    let earned = 0;
    let possible = 0;
    let correct = 0;
    for (const frozen of record.questions) {
      const bucket = sections.get(frozen.question.sectionId) ?? {
        earned: 0,
        possible: 0,
        correct: 0,
        total: 0,
      };
      bucket.total += 1;
      bucket.possible += frozen.question.points;
      possible += frozen.question.points;
      const answer = record.answers.get(frozen.question.id);
      const selected = answer?.selectedOptionIds ?? [];
      if (sameSet(selected, frozen.correctOptionIds) && selected.length > 0) {
        bucket.correct += 1;
        bucket.earned += frozen.question.points;
        earned += frozen.question.points;
        correct += 1;
      }
      sections.set(frozen.question.sectionId, bucket);
    }
    const publication = publicationFor(record.attempt.publishedVersionId);
    const reviewAllowed = reviewOpen(publication, record.attempt.status === "COMPLETED" || true);
    return {
      attemptId: record.attempt.id,
      publishedVersionId: record.attempt.publishedVersionId,
      submissionId: record.submission?.submissionId ?? id(0x7700),
      completedAt: iso(),
      earned,
      possible: Math.max(1, possible),
      correct,
      total: Math.max(1, record.questions.length),
      percentageBasisPoints: possible === 0 ? 0 : Math.round((earned / possible) * 10_000),
      expired: record.attempt.expired,
      scoringPolicy: "EXACT_MATCH_V1",
      sections: [...sections.entries()].map(([sectionId, score]) => ({ sectionId, ...score })),
      review: reviewAllowed ? { href: `/v1/attempts/${record.attempt.id}/review` } : null,
    };
  }

  function reviewOpen(publication: Publication | undefined, completed: boolean): boolean {
    if (!publication || !completed) return false;
    if (publication.exam.explanationPolicy === "NEVER") return false;
    if (publication.exam.explanationPolicy === "AFTER_COMPLETION") return true;
    return Date.parse(publication.exam.closeAt) <= clock();
  }

  function makeQuestion(
    index: number,
    sectionId: string,
    position: number,
    type: QuestionType,
    prompt: string,
    choices: string[],
    correct: number[],
    points: number,
    explanation: string | null,
  ): FrozenQuestion {
    const options = choices.map((text, choice) => ({
      id: id(0x8000 + index * 20 + choice + 1),
      position: choice + 1,
      text,
    }));
    return {
      question: {
        id: id(0x7000 + index),
        sectionId,
        position,
        type,
        prompt,
        points,
        options,
      },
      correctOptionIds: correct.map((position) => options[position - 1]?.id ?? id(1)),
      explanation,
    };
  }

  function candidateExam(publication: Publication): Exam {
    return publication.exam;
  }

  function reset(): void {
    users = [];
    exams = [];
    publications = [];
    questions = [];
    attempts = [];
    audits = [];
    imports = [];
    mail = [];
    session = null;
    permissions = CANDIDATE_PERMISSIONS;
    fault = "none";
    refreshFamilyBroken = false;
    receipts.clear();
    lostAcks.clear();
    const origin = clock();
    const candidate: UserRecord = {
      id: id(0xa1),
      email: "candidate@example.test",
      displayName: "Lan Nguyễn",
      password: "fixture-password-ok",
      emailVerifiedAt: iso(origin - 86_400_000),
      leaderboardOptIn: false,
      revision: 1,
      disabled: false,
      token: null,
      tokenConsumed: true,
      lastResendAt: null,
    };
    const pendingToken = "A".repeat(43);
    users.push(
      candidate,
      {
        id: id(0xa2),
        email: "pending@example.test",
        displayName: "Minh Trần",
        password: null,
        emailVerifiedAt: null,
        leaderboardOptIn: false,
        revision: 1,
        disabled: false,
        token: pendingToken,
        tokenConsumed: false,
        lastResendAt: null,
      },
      {
        id: id(0xa3),
        email: "disabled@example.test",
        displayName: "Disabled",
        password: "fixture-password-ok",
        emailVerifiedAt: iso(origin - 86_400_000),
        leaderboardOptIn: false,
        revision: 1,
        disabled: true,
        token: null,
        tokenConsumed: true,
        lastResendAt: null,
      },
    );
    mail.push({
      email: "pending@example.test",
      token: pendingToken,
      createdAt: iso(origin - 60_000),
    });
    const sectionA = id(0x301);
    const sectionB = id(0x302);
    const frozen = [
      makeQuestion(
        1,
        sectionA,
        1,
        "SINGLE_CHOICE",
        "Which layer forwards packets between networks?",
        ["Application", "Network", "Session"],
        [2],
        1,
        "The network layer forwards packets.",
      ),
      makeQuestion(
        2,
        sectionA,
        2,
        "SINGLE_CHOICE",
        "Choose the correct option.",
        ["A", "B", "C"],
        [1],
        1,
        null,
      ),
      makeQuestion(
        3,
        sectionA,
        3,
        "MULTIPLE_CHOICE",
        "Select every private address block.\n<script>alert(1)</script>",
        ["10.0.0.0/8", "192.168.0.0/16", "8.8.8.8/32"],
        [1, 2],
        2,
        "Exact match: both private blocks are required.",
      ),
      makeQuestion(
        4,
        sectionA,
        4,
        "TRUE_FALSE",
        "TCP guarantees in-order delivery.",
        ["Đúng", "Sai"],
        [1],
        1,
        "TCP reorders segments.",
      ),
      makeQuestion(
        5,
        sectionB,
        1,
        "SINGLE_CHOICE",
        "A very long bilingual prompt ".repeat(40).slice(0, 500),
        ["Alpha choice that is intentionally long ".repeat(8), "Beta", "Gamma", "Delta"],
        [2],
        1,
        "Beta is the fixture key.",
      ),
      makeQuestion(
        6,
        sectionB,
        2,
        "SINGLE_CHOICE",
        "Mark this question to review.",
        ["Keep", "Discard"],
        [1],
        1,
        "Keep.",
      ),
    ];
    const networking = publishSeed({
      examId: id(0x101),
      versionId: id(0x201),
      version: 1,
      title: "IT Certification — Networking Fundamentals",
      category: "IT_CERTIFICATION",
      durationSeconds: 45 * 60,
      openAt: iso(origin - 3_600_000),
      closeAt: iso(origin + 7_200_000),
      policy: "NEVER",
      leaderboard: true,
      limit: 3,
      sections: [
        { id: sectionA, title: "Phần A — Network", questions: frozen.slice(0, 4) },
        { id: sectionB, title: "Phần B — Review", questions: frozen.slice(4) },
      ],
    });
    const toeicQuestions = [
      makeQuestion(
        11,
        id(0x311),
        1,
        "SINGLE_CHOICE",
        "Choose the best word.",
        ["accurate", "late", "empty"],
        [1],
        2,
        "accurate",
      ),
      makeQuestion(
        12,
        id(0x311),
        2,
        "TRUE_FALSE",
        "The invoice was paid.",
        ["Đúng", "Sai"],
        [2],
        2,
        "It was not paid.",
      ),
      makeQuestion(
        13,
        id(0x312),
        1,
        "MULTIPLE_CHOICE",
        "Select the nouns.",
        ["meeting", "quickly", "report"],
        [1, 3],
        2,
        null,
      ),
    ];
    publishSeed({
      examId: id(0x102),
      versionId: id(0x202),
      version: 1,
      title: "TOEIC — Reading practice",
      category: "TOEIC",
      durationSeconds: 30 * 60,
      openAt: iso(origin - 3_600_000),
      closeAt: iso(origin + 86_400_000),
      policy: "AFTER_COMPLETION",
      leaderboard: true,
      limit: 2,
      sections: [
        { id: id(0x311), title: "Reading", questions: toeicQuestions.slice(0, 2) },
        { id: id(0x312), title: "Vocabulary", questions: toeicQuestions.slice(2) },
      ],
    });
    publishSeed({
      examId: id(0x103),
      versionId: id(0x203),
      version: 1,
      title: "Đại học — Toán cơ bản dành cho kỳ kiểm tra giữa kỳ với tiêu đề rất dài",
      category: "UNIVERSITY",
      durationSeconds: 45 * 60,
      openAt: iso(origin - 3_600_000),
      closeAt: iso(origin + 15 * 60 * 1000),
      policy: "AFTER_EXAM_CLOSE",
      leaderboard: false,
      limit: 1,
      sections: [
        {
          id: id(0x321),
          title: "Đại số",
          questions: [
            makeQuestion(21, id(0x321), 1, "SINGLE_CHOICE", "2 + 2 = ?", ["3", "4"], [2], 1, "4"),
          ],
        },
      ],
    });
    const oldQuestions = [
      makeQuestion(
        31,
        id(0x331),
        1,
        "SINGLE_CHOICE",
        "Version 1 prompt",
        ["Old A", "Old B"],
        [1],
        1,
        "Old",
      ),
    ];
    publications.push({
      versionId: id(0x211),
      version: 1,
      exam: {
        ...networking,
        publishedVersionId: id(0x211),
        version: 1,
        title: "IT Certification — Networking Fundamentals (version 1)",
        questionCount: 1,
        sections: [
          { id: id(0x331), title: "Phiên bản 1", position: 1, questionCount: 1, possible: 1 },
        ],
      },
      questions: oldQuestions,
    });
    seedAttempt({
      id: id(0x401),
      ownerId: candidate.id,
      examId: id(0x102),
      versionId: id(0x202),
      status: "COMPLETED",
      questions: toeicQuestions,
      startedAgo: 3_600_000,
      result: {
        attemptId: id(0x401),
        publishedVersionId: id(0x202),
        submissionId: id(0x501),
        completedAt: iso(origin - 1_800_000),
        earned: 5,
        possible: 6,
        correct: 2,
        total: 3,
        percentageBasisPoints: 8333,
        expired: false,
        scoringPolicy: "EXACT_MATCH_V1",
        sections: [
          { sectionId: id(0x311), earned: 5, possible: 5, correct: 2, total: 2 },
          { sectionId: id(0x312), earned: 0, possible: 1, correct: 0, total: 1 },
        ],
        review: { href: `/v1/attempts/${id(0x401)}/review` },
      },
    });
    seedAttempt({
      id: id(0x402),
      ownerId: candidate.id,
      examId: networking.id,
      versionId: id(0x211),
      status: "IN_PROGRESS",
      questions: oldQuestions,
      startedAgo: 10 * 60 * 1000,
      result: null,
    });
    seedAttempt({
      id: id(0x403),
      ownerId: candidate.id,
      examId: id(0x101),
      versionId: id(0x201),
      status: "FAILED",
      questions: frozen,
      startedAgo: 50 * 60 * 1000,
      result: null,
      failed: true,
    });
    questions.push(
      bankQuestion(
        id(0xb01),
        "SINGLE_CHOICE",
        "Bank: choose A.",
        ["A", "B"],
        [1],
        1,
        "A is correct.",
      ),
    );
    questions.push(
      bankQuestion(id(0xb02), "TRUE_FALSE", "Bank: true or false.", ["Đúng", "Sai"], [1], 1, null),
    );
    audits.push({
      id: id(0xc01),
      occurredAt: iso(origin - 120_000),
      actorId: candidate.id,
      action: "profile.opt_in",
      resourceType: "profile",
      resourceId: candidate.id,
      outcome: "SUCCESS",
      reason: null,
      correlationId: id(0xc02),
      changedFields: ["leaderboardOptIn"],
    });
  }

  function bankQuestion(
    questionId: string,
    type: QuestionType,
    prompt: string,
    choices: string[],
    correct: number[],
    points: number,
    explanation: string | null,
  ): AdminQuestion {
    return {
      id: questionId,
      revision: 1,
      archived: false,
      type,
      prompt,
      options: choices.map((text, index) => ({ position: index + 1, text })),
      correctOptionPositions: correct,
      points,
      explanation,
    };
  }

  function publishSeed(input: {
    examId: string;
    versionId: string;
    version: number;
    title: string;
    category: Category;
    durationSeconds: number;
    openAt: string;
    closeAt: string;
    policy: ExplanationPolicy;
    leaderboard: boolean;
    limit: number;
    sections: { id: string; title: string; questions: FrozenQuestion[] }[];
  }): Exam {
    const flat = input.sections.flatMap((section) => section.questions);
    const exam: Exam = {
      id: input.examId,
      title: input.title,
      category: input.category,
      publishedVersionId: input.versionId,
      version: input.version,
      durationSeconds: input.durationSeconds,
      openAt: input.openAt,
      closeAt: input.closeAt,
      displayTimezone: "Asia/Ho_Chi_Minh",
      attemptLimit: input.limit,
      questionCount: flat.length,
      scoringPolicy: "EXACT_MATCH_V1",
      explanationPolicy: input.policy,
      leaderboardEnabled: input.leaderboard,
      sections: input.sections.map((section, index) => ({
        id: section.id,
        title: section.title,
        position: index + 1,
        questionCount: section.questions.length,
        possible: section.questions.reduce((sum, question) => sum + question.question.points, 0),
      })),
    };
    publications.push({
      versionId: input.versionId,
      version: input.version,
      exam,
      questions: flat,
    });
    for (const frozen of flat) {
      questions.push({
        id: frozen.question.id,
        revision: 1,
        archived: false,
        type: frozen.question.type,
        prompt: frozen.question.prompt,
        options: frozen.question.options.map((option) => ({
          position: option.position,
          text: option.text,
        })),
        correctOptionPositions: frozen.question.options
          .filter((option) => frozen.correctOptionIds.includes(option.id))
          .map((option) => option.position),
        points: frozen.question.points,
        explanation: frozen.explanation,
      });
    }
    exams.push({
      id: input.examId,
      revision: 1,
      published: true,
      archived: false,
      publishedVersionId: input.versionId,
      title: input.title,
      category: input.category,
      durationSeconds: input.durationSeconds,
      openAt: input.openAt,
      closeAt: input.closeAt,
      displayTimezone: "Asia/Ho_Chi_Minh",
      attemptLimit: input.limit,
      explanationPolicy: input.policy,
      leaderboardEnabled: input.leaderboard,
      sections: input.sections.map((section, index) => ({
        title: section.title,
        position: index + 1,
        questions: section.questions.map((question, questionIndex) => ({
          bankQuestionId: question.question.id,
          position: questionIndex + 1,
          points: question.question.points,
        })),
      })),
    });
    return exam;
  }

  function seedAttempt(input: {
    id: string;
    ownerId: string;
    examId: string;
    versionId: string;
    status: AttemptStatus;
    questions: FrozenQuestion[];
    startedAgo: number;
    result: Result | null;
    failed?: boolean;
  }): void {
    const started = clock() - input.startedAgo;
    const publication = publicationFor(input.versionId);
    const duration = publication?.exam.durationSeconds ?? 2700;
    const deadline = Math.min(
      started + duration * 1000,
      publication ? Date.parse(publication.exam.closeAt) : started + duration * 1000,
    );
    const status = input.failed ? "FAILED" : input.status;
    attempts.push({
      attempt: {
        id: input.id,
        examId: input.examId,
        publishedVersionId: input.versionId,
        revision: 1,
        status,
        startedAt: iso(started),
        deadline: iso(deadline),
        submittedAt: input.result ? input.result.completedAt : null,
        expired: false,
        serverNow: iso(),
        canSave: status === "IN_PROGRESS" || status === "CREATED",
        resultAvailable: Boolean(input.result),
        pollAfterSeconds: status === "FAILED" ? 2 : 0,
        replayPending: false,
      },
      ownerId: input.ownerId,
      questions: input.questions,
      answers: new Map(),
      adminRevision: input.failed ? 3 : 1,
      result: input.result,
      submission: input.result
        ? {
            attemptId: input.id,
            submissionId: input.result.submissionId,
            acceptedAt: input.result.completedAt,
            acceptanceState: "SUBMITTED",
            expired: false,
          }
        : null,
      scoringDueAt: null,
      frozenTitle: publication?.exam.title ?? "Attempt",
    });
  }

  function ownedAttempt(attemptId: string, userId: string): AttemptRecord {
    const record = attempts.find(
      (item) => item.attempt.id === attemptId && item.ownerId === userId,
    );
    if (!record) fail(404, "Not found");
    record.attempt = { ...record.attempt, serverNow: iso() };
    advance(record);
    return record;
  }

  function validateQuestion(body: QuestionWriteRequest): void {
    if (body.prompt.length < 1 || body.prompt.length > 8000) fail(400, "Invalid request");
    if (body.options.length < 2 || body.options.length > 10) fail(400, "Invalid request");
    if (body.type === "TRUE_FALSE" && body.options.length !== 2) fail(400, "Invalid request");
    if (body.type === "SINGLE_CHOICE" && body.correctOptionPositions.length !== 1)
      fail(400, "Invalid request");
    if (body.type === "MULTIPLE_CHOICE" && body.correctOptionPositions.length < 1)
      fail(400, "Invalid request");
    if (body.points < 1 || body.points > 1000) fail(400, "Invalid request");
  }

  reset();

  const api: PlatformApi = {
    async getCsrf() {
      const token = `demo-csrf-${clock().toString(16)}-0123456789abcdef`;
      if (session) session = { ...session, csrf: token };
      return ok({ csrfToken: token, expiresAt: iso(clock() + 30 * 60 * 1000) });
    },
    async register(body) {
      const email = body.email.trim().toLowerCase();
      if (!users.some((user) => user.email === email)) {
        const token = `B${"C".repeat(42)}`;
        users.push({
          id: uuidV7(clock()),
          email,
          displayName: body.displayName,
          password: null,
          emailVerifiedAt: null,
          leaderboardOptIn: false,
          revision: 1,
          disabled: false,
          token,
          tokenConsumed: false,
          lastResendAt: clock(),
        });
        mail.unshift({ email, token, createdAt: iso() });
      }
      return ok({ accepted: true } satisfies Accepted, 202);
    },
    async requestEmailVerification(body) {
      const email = body.email.trim().toLowerCase();
      const user = userByEmail(email);
      if (!user || user.disabled || user.emailVerifiedAt) return ok({ accepted: true }, 202);
      if (user.lastResendAt !== null && clock() - user.lastResendAt < 60_000) {
        fail(429, "Rate limit exceeded", "Rate limit exceeded", 60);
      }
      user.lastResendAt = clock();
      if (!user.token || user.tokenConsumed) user.token = `D${"E".repeat(42)}`;
      user.tokenConsumed = false;
      mail.unshift({ email, token: user.token, createdAt: iso() });
      return ok({ accepted: true }, 202);
    },
    async confirmEmailVerification(body) {
      if (session) fail(403, "Permission denied");
      const user = users.find((item) => item.token === body.token);
      if (!user || body.token.length !== 43) fail(400, "Invalid request");
      if (!user.tokenConsumed) {
        user.password = body.password;
        user.emailVerifiedAt = iso();
        user.tokenConsumed = true;
      }
      return ok({ verified: true });
    },
    async login(body) {
      const email = body.email.trim().toLowerCase();
      const user = userByEmail(email);
      if (!user || user.disabled || !user.emailVerifiedAt || user.password !== body.password) {
        fail(401, "Unauthenticated");
      }
      refreshFamilyBroken = false;
      session = { userId: user.id, csrf: "login", accessExpiresAt: clock() + 15 * 60 * 1000 };
      return ok({
        userId: user.id,
        accessExpiresAt: iso(session.accessExpiresAt),
        refreshExpiresAt: iso(clock() + 12 * 60 * 60 * 1000),
        absoluteExpiresAt: iso(clock() + 24 * 60 * 60 * 1000),
      } satisfies Session);
    },
    async refresh() {
      if (fault === "refresh-lost") {
        refreshFamilyBroken = true;
        session = null;
        fault = "none";
        throw new ApiError({
          kind: "network",
          status: 0,
          errorCode: "Network",
          message: "timeout",
        });
      }
      if (refreshFamilyBroken || !session) fail(401, "Unauthenticated");
      session = { ...session, accessExpiresAt: clock() + 15 * 60 * 1000 };
      return ok({
        userId: session.userId,
        accessExpiresAt: iso(session.accessExpiresAt),
        refreshExpiresAt: iso(clock() + 12 * 60 * 60 * 1000),
        absoluteExpiresAt: iso(clock() + 24 * 60 * 60 * 1000),
      });
    },
    async logout() {
      session = null;
      return ok({ revoked: true });
    },
    async getProfile() {
      const user = currentUser();
      const profile: Profile = {
        id: user.id,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt ?? iso(),
        displayName: user.displayName,
        leaderboardOptIn: user.leaderboardOptIn,
        revision: user.revision,
      };
      return ok(profile);
    },
    async updateProfile(key, body: ProfileUpdate) {
      return remember(key, body, () => {
        const user = currentUser();
        if (body.expectedRevision !== user.revision) fail(409, "Version conflict");
        user.displayName = body.displayName;
        user.leaderboardOptIn = body.leaderboardOptIn;
        user.revision += 1;
        audit("profile.update", "profile", user.id, "SUCCESS", ["displayName", "leaderboardOptIn"]);
        return ok({ resourceId: user.id, revision: user.revision, acceptedAt: iso() });
      });
    },
    async browseExams(query) {
      requirePermission("catalog.read");
      const published = publications
        .filter((item) =>
          exams.find(
            (exam) =>
              exam.id === item.exam.id &&
              exam.published &&
              !exam.archived &&
              item.versionId === exam.publishedVersionId,
          ),
        )
        .map((item) => item.exam)
        .filter((exam) => !query.category || exam.category === query.category);
      return ok(pageOf(published, query, `exams:${query.category ?? "*"}`));
    },
    async getExam(examId) {
      requirePermission("catalog.read");
      const exam = exams.find((item) => item.id === examId && item.published && !item.archived);
      const publication = exam?.publishedVersionId
        ? publicationFor(exam.publishedVersionId)
        : undefined;
      if (!publication) fail(404, "Not found");
      return ok(candidateExam(publication));
    },
    async startAttempt(examId, key) {
      return remember(key, { examId }, () => {
        const user = requirePermission("assessment.take");
        const exam = exams.find((item) => item.id === examId && item.published && !item.archived);
        const publication = exam?.publishedVersionId
          ? publicationFor(exam.publishedVersionId)
          : undefined;
        if (!exam || !publication) fail(404, "Not found");
        if (
          Date.parse(publication.exam.closeAt) <= clock() ||
          Date.parse(publication.exam.openAt) > clock()
        ) {
          fail(422, "Attempt is closed");
        }
        const existing = attempts.find(
          (item) =>
            item.ownerId === user.id &&
            item.attempt.examId === examId &&
            (item.attempt.status === "IN_PROGRESS" || item.attempt.status === "CREATED"),
        );
        if (existing) return ok(projectAttempt(existing), 201);
        const owned = attempts.filter(
          (item) => item.ownerId === user.id && item.attempt.examId === examId,
        );
        if (owned.length >= publication.exam.attemptLimit) fail(422, "Attempt is closed");
        const started = clock();
        const deadline = Math.min(
          started + publication.exam.durationSeconds * 1000,
          Date.parse(publication.exam.closeAt),
        );
        const record: AttemptRecord = {
          attempt: {
            id: uuidV7(clock()),
            examId,
            publishedVersionId: publication.versionId,
            revision: 1,
            status: "IN_PROGRESS",
            startedAt: iso(started),
            deadline: iso(deadline),
            submittedAt: null,
            expired: false,
            serverNow: iso(started),
            canSave: true,
            resultAvailable: false,
            pollAfterSeconds: 0,
            replayPending: false,
          },
          ownerId: user.id,
          questions: publication.questions.map((question) => structuredClone(question)),
          answers: new Map(),
          adminRevision: 1,
          result: null,
          submission: null,
          scoringDueAt: null,
          frozenTitle: publication.exam.title,
        };
        attempts.unshift(record);
        return ok(record.attempt, 201);
      });
    },
    async resumeAttempt(attemptId) {
      const user = requirePermission("assessment.take");
      return ok(projectAttempt(ownedAttempt(attemptId, user.id)));
    },
    async getQuestions(attemptId, query) {
      const user = requirePermission("assessment.take");
      const record = ownedAttempt(attemptId, user.id);
      return ok(
        pageOf(
          record.questions.map((item) => item.question),
          query,
          `questions:${attemptId}`,
        ),
      );
    },
    async getAnswers(attemptId, query) {
      const user = requirePermission("assessment.take");
      const record = ownedAttempt(attemptId, user.id);
      const rows = record.questions.map((item) => {
        return (
          record.answers.get(item.question.id) ?? {
            questionId: item.question.id,
            selectedOptionIds: [],
            marked: false,
            version: 0,
            updatedAt: null,
          }
        );
      });
      return ok(pageOf(rows, query, `answers:${attemptId}`));
    },
    async saveAnswers(attemptId, key, body: SaveAnswersRequest) {
      const existingLost = lostAcks.get(key);
      if (existingLost) return ok(existingLost);
      const stored = receipts.get(key);
      if (stored && stored.hash === hash(body))
        return ok(stored.response as SaveReceipt, 200, true);
      const user = requirePermission("assessment.take");
      const record = ownedAttempt(attemptId, user.id);
      if (!record.attempt.canSave || clock() > Date.parse(record.attempt.deadline)) {
        record.attempt = { ...record.attempt, canSave: false };
        fail(422, "Attempt is closed");
      }
      const activeFault = fault;
      if (
        activeFault === "delay-ack" ||
        activeFault === "lose-ack" ||
        activeFault === "save-429" ||
        activeFault === "save-503"
      ) {
        fault = "none";
      }
      if (activeFault === "save-429") fail(429, "Rate limit exceeded", "Rate limit exceeded", 2);
      if (activeFault === "save-503") fail(503, "Service unavailable", "Service unavailable", 2);
      if (activeFault === "delay-ack") await sleep(5_000);
      if (body.answers.length < 1 || body.answers.length > 20) fail(400, "Invalid request");
      const seen = new Set<string>();
      for (const change of body.answers) {
        if (seen.has(change.questionId)) fail(400, "Invalid request");
        seen.add(change.questionId);
        const current = record.answers.get(change.questionId);
        const version = current?.version ?? 0;
        if (!record.questions.some((item) => item.question.id === change.questionId))
          fail(404, "Not found");
        if (change.expectedVersion !== version) fail(409, "Version conflict");
      }
      const acceptedAt = iso();
      const versions = body.answers.map((change) => {
        const next = (record.answers.get(change.questionId)?.version ?? 0) + 1;
        record.answers.set(change.questionId, {
          questionId: change.questionId,
          selectedOptionIds: [...change.selectedOptionIds],
          marked: change.marked,
          version: next,
          updatedAt: acceptedAt,
        });
        return { questionId: change.questionId, version: next };
      });
      const receipt: SaveReceipt = { attemptId, acceptedAt, answers: versions };
      receipts.set(key, { hash: hash(body), response: receipt });
      if (activeFault === "lose-ack") {
        lostAcks.set(key, receipt);
        throw new ApiError({
          kind: "network",
          status: 0,
          errorCode: "Network",
          message: "timeout",
        });
      }
      return ok(receipt);
    },
    async submitAttempt(attemptId, key) {
      return remember(key, { attemptId, submit: true }, () => {
        const user = requirePermission("assessment.take");
        const record = ownedAttempt(attemptId, user.id);
        if (record.submission) return ok(record.submission, 202, true);
        if (record.attempt.status !== "IN_PROGRESS" && record.attempt.status !== "CREATED")
          fail(422, "Attempt is closed");
        const expired = clock() >= Date.parse(record.attempt.deadline);
        const receipt: SubmitReceipt = {
          attemptId,
          submissionId: uuidV7(clock()),
          acceptedAt: iso(),
          acceptanceState: expired ? "EXPIRED" : "SUBMITTED",
          expired,
        };
        record.submission = receipt;
        record.scoringDueAt = clock() + 1_200;
        record.attempt = {
          ...record.attempt,
          status: expired ? "EXPIRED" : "SUBMITTED",
          submittedAt: receipt.acceptedAt,
          expired,
          canSave: false,
          serverNow: iso(),
          pollAfterSeconds: 2,
          resultAvailable: false,
        };
        return ok(receipt, 202);
      });
    },
    async getAttemptStatus(attemptId) {
      const user = requirePermission("assessment.take");
      return ok(projectAttempt(ownedAttempt(attemptId, user.id)));
    },
    async getResult(attemptId) {
      const user = requirePermission("assessment.result.read");
      const record = ownedAttempt(attemptId, user.id);
      if (!record.result) {
        const pending: ResultRead = {
          pending: true,
          result: null,
          attempt: projectAttempt(record),
        };
        return ok(pending, 202);
      }
      return ok({ pending: false, result: record.result, attempt: null } satisfies ResultRead);
    },
    async getReleasedReview(attemptId, query) {
      const user = requirePermission("assessment.result.read");
      const record = ownedAttempt(attemptId, user.id);
      const publication = publicationFor(record.attempt.publishedVersionId);
      if (!record.result?.review || !reviewOpen(publication, true)) fail(403, "Permission denied");
      const rows: ReviewQuestion[] = record.questions.map((frozen) => ({
        question: frozen.question,
        selectedOptionIds: record.answers.get(frozen.question.id)?.selectedOptionIds ?? [],
        correctOptionIds: frozen.correctOptionIds,
        correct: sameSet(
          record.answers.get(frozen.question.id)?.selectedOptionIds ?? [],
          frozen.correctOptionIds,
        ),
        explanation: frozen.explanation,
      }));
      return ok(pageOf(rows, query, `review:${attemptId}`));
    },
    async getHistory(query) {
      const user = requirePermission("assessment.take");
      const rows: HistoryItem[] = attempts
        .filter((item) => item.ownerId === user.id)
        .map((item) => ({
          attemptId: item.attempt.id,
          examId: item.attempt.examId,
          publishedVersionId: item.attempt.publishedVersionId,
          startedAt: item.attempt.startedAt,
          status: projectAttempt(item).status,
          expired: item.attempt.expired,
          earned: item.result?.earned ?? null,
          possible: item.result?.possible ?? null,
        }));
      return ok(pageOf(rows, query, `history:${user.id}`));
    },
    async getLeaderboard(examId, versionId, query) {
      requirePermission("catalog.read");
      const publication = publicationFor(versionId);
      if (!publication || publication.exam.id !== examId) fail(404, "Not found");
      if (!publication.exam.leaderboardEnabled) fail(403, "Permission denied");
      const ranked = new Map<string, LeaderboardEntry>();
      for (const record of attempts) {
        if (record.attempt.publishedVersionId !== versionId || !record.result) continue;
        const owner = users.find((item) => item.id === record.ownerId);
        if (!owner?.leaderboardOptIn) continue;
        const pseudonym = `candidate-${owner.id.slice(-8)}`;
        const current = ranked.get(owner.id);
        if (!current || record.result.earned > current.earned) {
          ranked.set(owner.id, {
            rank: 0,
            pseudonym,
            earned: record.result.earned,
            possible: record.result.possible,
            completedAt: record.result.completedAt,
          });
        }
      }
      ranked.set("seed-1", {
        rank: 0,
        pseudonym: "candidate-8b473ec4",
        earned: 5,
        possible: 6,
        completedAt: iso(clock() - 60_000),
      });
      ranked.set("seed-2", {
        rank: 0,
        pseudonym: "candidate-19aa04c0",
        earned: 4,
        possible: 6,
        completedAt: iso(clock() - 120_000),
      });
      const rows = [...ranked.values()]
        .sort(
          (left, right) =>
            right.earned - left.earned || left.completedAt.localeCompare(right.completedAt),
        )
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      return ok(pageOf(rows, query, `board:${versionId}`));
    },
    async listAdminExams(query) {
      requirePermission("catalog.manage");
      return ok(pageOf(exams, query, "admin-exams"));
    },
    async createExam(key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.manage");
        if (body.expectedRevision !== 0) fail(400, "Invalid request");
        validateExam(body);
        const created: AdminExam = {
          id: uuidV7(clock()),
          revision: 1,
          published: false,
          archived: false,
          publishedVersionId: null,
          title: body.title,
          category: body.category,
          durationSeconds: body.durationSeconds,
          openAt: body.openAt,
          closeAt: body.closeAt,
          displayTimezone: body.displayTimezone,
          attemptLimit: body.attemptLimit,
          explanationPolicy: body.explanationPolicy,
          leaderboardEnabled: body.leaderboardEnabled,
          sections: body.sections,
        };
        exams.unshift(created);
        audit("exam.create", "exam", created.id, "SUCCESS", ["title"]);
        return ok({ resourceId: created.id, revision: 1, acceptedAt: iso() }, 201);
      });
    },
    async getAdminExam(examId) {
      requirePermission("catalog.manage");
      const exam = exams.find((item) => item.id === examId);
      if (!exam) fail(404, "Not found");
      return ok(exam);
    },
    async replaceExamDraft(examId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.manage");
        const exam = exams.find((item) => item.id === examId);
        if (!exam || exam.archived) fail(404, "Not found");
        if (body.expectedRevision !== exam.revision) fail(409, "Version conflict");
        validateExam(body);
        exam.title = body.title;
        exam.category = body.category;
        exam.durationSeconds = body.durationSeconds;
        exam.openAt = body.openAt;
        exam.closeAt = body.closeAt;
        exam.displayTimezone = body.displayTimezone;
        exam.attemptLimit = body.attemptLimit;
        exam.explanationPolicy = body.explanationPolicy;
        exam.leaderboardEnabled = body.leaderboardEnabled;
        exam.sections = body.sections;
        exam.revision += 1;
        audit("exam.replace", "exam", exam.id, "SUCCESS", ["title", "sections"]);
        return ok({ resourceId: exam.id, revision: exam.revision, acceptedAt: iso() });
      });
    },
    async archiveExam(examId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.manage");
        const exam = exams.find((item) => item.id === examId);
        if (!exam) fail(404, "Not found");
        if (body.expectedRevision !== exam.revision) fail(409, "Version conflict");
        exam.archived = true;
        exam.published = false;
        exam.revision += 1;
        audit("exam.archive", "exam", exam.id, "SUCCESS", ["archived"]);
        return ok({ resourceId: exam.id, revision: exam.revision, acceptedAt: iso() });
      });
    },
    async publishExam(examId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.manage");
        const exam = exams.find((item) => item.id === examId && !item.archived);
        if (!exam) fail(404, "Not found");
        if (body.expectedRevision !== exam.revision) fail(409, "Version conflict");
        if (
          exam.sections.length < 1 ||
          exam.sections.some((section) => section.questions.length < 1)
        ) {
          fail(422, "Attempt is closed");
        }
        const version = (currentPublication(exam.id)?.version ?? 0) + 1;
        const versionId = uuidV7(clock());
        const frozen = freezeDraft(exam, versionId, version);
        publications.push(frozen);
        exam.published = true;
        exam.publishedVersionId = versionId;
        exam.revision += 1;
        audit("exam.publish", "exam", exam.id, "SUCCESS", ["publishedVersionId"]);
        return ok({ resourceId: exam.id, revision: exam.revision, acceptedAt: iso() });
      });
    },
    async unpublishExam(examId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.manage");
        const exam = exams.find((item) => item.id === examId);
        if (!exam) fail(404, "Not found");
        if (body.expectedRevision !== exam.revision) fail(409, "Version conflict");
        exam.published = false;
        exam.revision += 1;
        audit("exam.unpublish", "exam", exam.id, "SUCCESS", ["published"]);
        return ok({ resourceId: exam.id, revision: exam.revision, acceptedAt: iso() });
      });
    },
    async listBankQuestions(query) {
      requirePermission("catalog.keys.read");
      return ok(pageOf(questions, query, "bank"));
    },
    async createBankQuestion(key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.keys.read");
        if (body.expectedRevision !== 0) fail(400, "Invalid request");
        validateQuestion(body);
        const created: AdminQuestion = {
          ...body,
          id: uuidV7(clock()),
          revision: 1,
          archived: false,
        };
        questions.unshift(created);
        audit("question.create", "question", created.id, "SUCCESS", ["prompt"]);
        return ok({ resourceId: created.id, revision: 1, acceptedAt: iso() }, 201);
      });
    },
    async getBankQuestion(questionId) {
      requirePermission("catalog.keys.read");
      const question = questions.find((item) => item.id === questionId);
      if (!question) fail(404, "Not found");
      return ok(question);
    },
    async replaceBankQuestion(questionId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.keys.read");
        const question = questions.find((item) => item.id === questionId && !item.archived);
        if (!question) fail(404, "Not found");
        if (body.expectedRevision !== question.revision) fail(409, "Version conflict");
        validateQuestion(body);
        question.type = body.type;
        question.prompt = body.prompt;
        question.options = body.options;
        question.correctOptionPositions = body.correctOptionPositions;
        question.points = body.points;
        question.explanation = body.explanation;
        question.revision += 1;
        audit("question.replace", "question", question.id, "SUCCESS", ["prompt"]);
        return ok({ resourceId: question.id, revision: question.revision, acceptedAt: iso() });
      });
    },
    async archiveBankQuestion(questionId, key, body) {
      return remember(key, body, () => {
        requirePermission("catalog.keys.read");
        const question = questions.find((item) => item.id === questionId);
        if (!question) fail(404, "Not found");
        if (body.expectedRevision !== question.revision) fail(409, "Version conflict");
        question.archived = true;
        question.revision += 1;
        return ok({ resourceId: question.id, revision: question.revision, acceptedAt: iso() });
      });
    },
    async importQuestions(key, body: ImportRequest) {
      return remember(key, body, () => {
        requirePermission("catalog.import");
        const report = buildImport(body);
        imports.unshift(report);
        if (report.committed)
          audit("question.import", "import", report.id, "SUCCESS", ["questions"]);
        return ok(report, 202);
      });
    },
    async getImportReport(importId) {
      requirePermission("catalog.import");
      const report = imports.find((item) => item.id === importId);
      if (!report) fail(404, "Not found");
      return ok(report);
    },
    async listActiveCandidates(examId, query) {
      requirePermission("reporting.read");
      if (!exams.some((exam) => exam.id === examId)) fail(404, "Not found");
      const rows: ActiveCandidate[] = attempts
        .filter(
          (item) =>
            item.attempt.examId === examId &&
            (item.attempt.status === "IN_PROGRESS" || item.attempt.status === "CREATED"),
        )
        .map((item) => ({
          candidateId: item.ownerId,
          attemptId: item.attempt.id,
          status: item.attempt.status,
          startedAt: item.attempt.startedAt,
          deadline: item.attempt.deadline,
        }));
      return ok(pageOf(rows, query, `active:${examId}`));
    },
    async listSubmissions(examId, query) {
      requirePermission("reporting.read");
      const rows: AdminSubmission[] = attempts
        .filter((item) => item.attempt.examId === examId)
        .filter(
          (item) =>
            !query.publishedVersionId ||
            item.attempt.publishedVersionId === query.publishedVersionId,
        )
        .map((item) => ({
          candidateId: item.ownerId,
          attemptId: item.attempt.id,
          publishedVersionId: item.attempt.publishedVersionId,
          submittedAt: item.attempt.submittedAt,
          status: projectAttempt(item).status,
          expired: item.attempt.expired,
          earned: item.result?.earned ?? null,
          possible: item.result?.possible ?? null,
        }));
      return ok(pageOf(rows, query, `submissions:${examId}:${query.publishedVersionId ?? "*"}`));
    },
    async getAdminResult(attemptId) {
      requirePermission("reporting.read");
      const record = attempts.find((item) => item.attempt.id === attemptId);
      if (!record) fail(404, "Not found");
      advance(record);
      if (!record.result)
        return ok(
          { pending: true, result: null, attempt: projectAttempt(record) } satisfies ResultRead,
          202,
        );
      return ok({ pending: false, result: record.result, attempt: null });
    },
    async getAdminReview(attemptId, query) {
      requirePermission("assessment.review.admin");
      const record = attempts.find((item) => item.attempt.id === attemptId);
      if (!record) fail(404, "Not found");
      audit("attempt.review", "attempt", attemptId, "SUCCESS", []);
      const rows: ReviewQuestion[] = record.questions.map((frozen) => ({
        question: frozen.question,
        selectedOptionIds: record.answers.get(frozen.question.id)?.selectedOptionIds ?? [],
        correctOptionIds: frozen.correctOptionIds,
        correct: sameSet(
          record.answers.get(frozen.question.id)?.selectedOptionIds ?? [],
          frozen.correctOptionIds,
        ),
        explanation: frozen.explanation,
      }));
      return ok(pageOf(rows, query, `admin-review:${attemptId}`));
    },
    async replayFailedAttempt(attemptId, key, body: ReplayRequest) {
      return remember(key, body, () => {
        requirePermission("assessment.replay");
        const record = attempts.find((item) => item.attempt.id === attemptId);
        if (!record || record.attempt.status !== "FAILED") fail(422, "Attempt is closed");
        if (body.expectedRevision !== record.adminRevision) fail(409, "Version conflict");
        if (!body.reason.trim()) fail(400, "Invalid request");
        record.adminRevision += 1;
        record.attempt = {
          ...record.attempt,
          replayPending: true,
          pollAfterSeconds: 2,
          serverNow: iso(),
        };
        record.scoringDueAt = clock() + 1_200;
        audit("attempt.replay", "attempt", attemptId, "SUCCESS", ["replayPending"]);
        return ok({ accepted: true } satisfies Accepted, 202);
      });
    },
    async getQuestionStatistics(examId, versionId, query) {
      requirePermission("reporting.read");
      const publication = publicationFor(versionId);
      if (!publication || publication.exam.id !== examId) fail(404, "Not found");
      const completed = attempts.filter(
        (item) => item.attempt.publishedVersionId === versionId && item.result,
      );
      const rows: QuestionStatistic[] = publication.questions.map((frozen) => {
        let correct = 0;
        let incorrect = 0;
        let unanswered = 0;
        const optionCounts = new Map(frozen.question.options.map((option) => [option.id, 0]));
        for (const record of completed) {
          const answer = record.answers.get(frozen.question.id);
          const selected = answer?.selectedOptionIds ?? [];
          if (selected.length === 0) unanswered += 1;
          else if (sameSet(selected, frozen.correctOptionIds)) correct += 1;
          else incorrect += 1;
          for (const optionId of selected)
            optionCounts.set(optionId, (optionCounts.get(optionId) ?? 0) + 1);
        }
        return {
          questionId: frozen.question.id,
          completedAttempts: completed.length,
          correct,
          incorrect,
          unanswered,
          options: [...optionCounts.entries()].map(([optionId, selectedCount]) => ({
            optionId,
            selectedCount,
          })),
        };
      });
      return ok(pageOf(rows, query, `stats:${versionId}`));
    },
    async getSystemBusinessMetrics() {
      requirePermission("system.metrics.read");
      const metrics: Metrics = {
        asOf: iso(),
        activeCandidates: attempts.filter((item) => item.attempt.status === "IN_PROGRESS").length,
        submitted: attempts.filter(
          (item) => item.attempt.status === "SUBMITTED" || item.attempt.status === "EXPIRED",
        ).length,
        completed: attempts.filter((item) => item.attempt.status === "COMPLETED" || item.result)
          .length,
        failed: attempts.filter((item) => item.attempt.status === "FAILED").length,
        httpRps: 0,
        httpP95Ms: 0,
        queueDepth: attempts.filter((item) => item.scoringDueAt !== null).length,
        oldestJobSeconds: 0,
      };
      return ok(metrics);
    },
    async getAudit(query) {
      requirePermission("audit.read");
      return ok(pageOf(audits, query, "audit"));
    },
  };

  function validateExam(body: ExamWriteRequest): void {
    if (body.sections.length > 20) fail(400, "Invalid request");
    const ids = body.sections.flatMap((section) =>
      section.questions.map((question) => question.bankQuestionId),
    );
    if (new Set(ids).size !== ids.length || ids.length > 500) fail(400, "Invalid request");
    if (body.durationSeconds < 60 || body.durationSeconds > 14_400) fail(400, "Invalid request");
    if (Date.parse(body.openAt) >= Date.parse(body.closeAt)) fail(400, "Invalid request");
  }

  function freezeDraft(exam: AdminExam, versionId: string, version: number): Publication {
    const sections = exam.sections.map((section) => ({
      ...section,
      questions: section.questions.map((reference) => {
        const bank = questions.find((item) => item.id === reference.bankQuestionId);
        if (!bank) fail(422, "Attempt is closed");
        return bank;
      }),
    }));
    let index = 1000 + publications.length * 100;
    const frozenSections = sections.map((section, sectionIndex) => {
      const sectionId = uuidV7(clock() + sectionIndex);
      const built = section.questions.map((bank, questionIndex) => {
        index += 1;
        return makeQuestion(
          index,
          sectionId,
          questionIndex + 1,
          bank.type,
          bank.prompt,
          bank.options.map((option) => option.text),
          bank.correctOptionPositions,
          section.questions[questionIndex]?.points ?? bank.points,
          bank.explanation,
        );
      });
      return { sectionId, title: section.title, position: section.position, built };
    });
    const flat = frozenSections.flatMap((section) => section.built);
    return {
      versionId,
      version,
      questions: flat,
      exam: {
        id: exam.id,
        title: exam.title,
        category: exam.category,
        publishedVersionId: versionId,
        version,
        durationSeconds: exam.durationSeconds,
        openAt: exam.openAt,
        closeAt: exam.closeAt,
        displayTimezone: exam.displayTimezone,
        attemptLimit: exam.attemptLimit,
        questionCount: flat.length,
        scoringPolicy: "EXACT_MATCH_V1",
        explanationPolicy: exam.explanationPolicy,
        leaderboardEnabled: exam.leaderboardEnabled,
        sections: frozenSections.map((section) => ({
          id: section.sectionId,
          title: section.title,
          position: section.position,
          questionCount: section.built.length,
          possible: section.built.reduce((sum, question) => sum + question.question.points, 0),
        })),
      },
    };
  }

  function buildImport(body: ImportRequest): ImportReport {
    const issues: ImportReport["issues"] = [];
    const seen = new Set<string>();
    if (body.schemaVersion !== 1 || body.questions.length < 1 || body.questions.length > 100) {
      issues.push({ clientRef: "import", field: "questions", message: "Số câu phải từ 1 đến 100" });
    }
    for (const entry of body.questions) {
      if (seen.has(entry.clientRef))
        issues.push({
          clientRef: entry.clientRef,
          field: "clientRef",
          message: "clientRef bị trùng",
        });
      seen.add(entry.clientRef);
      if (entry.type === "TRUE_FALSE" && entry.options.length !== 2) {
        issues.push({
          clientRef: entry.clientRef,
          field: "options",
          message: "Đúng/Sai cần đúng hai lựa chọn",
        });
      }
      if (entry.type === "SINGLE_CHOICE" && entry.correctOptionPositions.length !== 1) {
        issues.push({
          clientRef: entry.clientRef,
          field: "correctOptionPositions",
          message: "Chọn một đáp án đúng",
        });
      }
      if (entry.options.length < 2)
        issues.push({
          clientRef: entry.clientRef,
          field: "options",
          message: "Cần ít nhất hai lựa chọn",
        });
    }
    const valid = issues.length === 0;
    const created: ImportReport["questions"] = [];
    if (valid && !body.dryRun) {
      for (const entry of body.questions) {
        const question = bankQuestion(
          uuidV7(clock()),
          entry.type,
          entry.prompt,
          entry.options.map((option) => option.text),
          entry.correctOptionPositions,
          entry.points,
          entry.explanation,
        );
        questions.unshift(question);
        created.push({ clientRef: entry.clientRef, questionId: question.id });
      }
    }
    return {
      id: uuidV7(clock()),
      valid,
      committed: valid && !body.dryRun,
      issues,
      questions: created,
      createdAt: iso(),
    };
  }

  const extras: DemoExtras = {
    mailbox: () => mail,
    permissions: () => permissions,
    setPermissions(preset) {
      permissions =
        preset === "admin"
          ? ADMIN_PERMISSIONS
          : preset === "reviewer"
            ? REVIEWER_PERMISSIONS
            : CANDIDATE_PERMISSIONS;
    },
    setFault(next) {
      fault = next;
      if (next === "conflict-save") {
        const active = attempts.find((item) => item.attempt.status === "IN_PROGRESS");
        if (!active) return;
        for (const [questionId, answer] of active.answers) {
          active.answers.set(questionId, { ...answer, version: answer.version + 1 });
        }
        if (active.answers.size === 0 && active.questions[0]) {
          const questionId = active.questions[0].question.id;
          active.answers.set(questionId, {
            questionId,
            selectedOptionIds: [],
            marked: false,
            version: 1,
            updatedAt: iso(),
          });
        }
      }
    },
    fault: () => fault,
    reset,
    replayRevision(attemptId) {
      return attempts.find((item) => item.attempt.id === attemptId)?.adminRevision ?? null;
    },
    loadStressExam(count) {
      const sectionCount = Math.min(20, Math.max(1, Math.ceil(count / 25)));
      const sections: { id: string; title: string; questions: FrozenQuestion[] }[] = [];
      let created = 0;
      for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
        const sectionId = id(0xd00 + sectionIndex);
        const questionsInSection: FrozenQuestion[] = [];
        const take = Math.min(25, count - created);
        for (let position = 0; position < take; position += 1) {
          created += 1;
          const type: QuestionType =
            created % 5 === 0
              ? "TRUE_FALSE"
              : created % 3 === 0
                ? "MULTIPLE_CHOICE"
                : "SINGLE_CHOICE";
          const choices = type === "TRUE_FALSE" ? ["Đúng", "Sai"] : ["Một", "Hai", "Ba", "Bốn"];
          questionsInSection.push(
            makeQuestion(
              2_000 + created,
              sectionId,
              position + 1,
              type,
              `Stress prompt ${created}`,
              choices,
              type === "MULTIPLE_CHOICE" ? [1, 2] : [1],
              1,
              null,
            ),
          );
        }
        sections.push({
          id: sectionId,
          title: `Phần ${sectionIndex + 1}`,
          questions: questionsInSection,
        });
      }
      const examId = uuidV7(clock());
      const versionId = uuidV7(clock() + 1);
      publishSeed({
        examId,
        versionId,
        version: 1,
        title: `Stress ${count} — Recruitment — Logical reasoning`,
        category: "RECRUITMENT",
        durationSeconds: 45 * 60,
        openAt: iso(clock() - 60_000),
        closeAt: iso(clock() + 86_400_000),
        policy: "NEVER",
        leaderboard: false,
        limit: 1,
        sections,
      });
      return examId;
    },
  };

  return { api, extras };
}

export function candidateQuestionsHideKeys(question: CandidateQuestion): boolean {
  return !("correctOptionIds" in question) && !("explanation" in question);
}
