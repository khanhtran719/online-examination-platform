import type {
  Accepted,
  AdminExam,
  AdminQuestion,
  Attempt,
  Category,
  Exam,
  ExamWriteRequest,
  ImportReport,
  ImportRequest,
  Metrics,
  MutationReceipt,
  PageQuery,
  Profile,
  ProfileUpdate,
  QuestionWriteRequest,
  ReplayRequest,
  RevisionRequest,
  Revoked,
  SaveAnswersRequest,
  SaveReceipt,
  Session,
  SubmitReceipt,
  Verified,
} from "../shared/api/dto";
import { isApiError } from "../shared/api/errors";
import { requestJson, withMeta } from "../shared/api/http";
import {
  parseAccepted,
  parseActiveCandidate,
  parseAdminExam,
  parseAdminQuestion,
  parseAdminSubmission,
  parseAnswer,
  parseAttempt,
  parseAuditEntry,
  parseCandidateQuestion,
  parseCsrf,
  parseData,
  parseExam,
  parseHistoryItem,
  parseImportReport,
  parseLeaderboardEntry,
  parseMetrics,
  parseMutationReceipt,
  parsePage,
  parseProfile,
  parseQuestionStatistic,
  parseResult,
  parseReviewQuestion,
  parseRevoked,
  parseSaveReceipt,
  parseSession,
  parseSubmitReceipt,
  parseVerified,
} from "../shared/api/parse";
import type { PlatformApi, ResultRead } from "../shared/api/platform";
import type {
  ProbeResult,
  RecoverResult,
  SessionTransport,
} from "../features/auth/session-coordinator";

export interface LiveHandle {
  api: PlatformApi;
  transport: SessionTransport;
  bindRecovery(recover: () => Promise<RecoverResult>): void;
}

function queryString(path: string, query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

let csrfQueue: Promise<void> = Promise.resolve();

function enqueueCsrf<T>(task: () => Promise<T>): Promise<T> {
  const run = csrfQueue.then(task, task);
  csrfQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function exclusiveCsrf<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!locks?.request) return enqueueCsrf(task);
  // DOM types do not flatten a thenable returned from the lock callback. The browser does.
  return locks.request("exam-platform-csrf", () => enqueueCsrf(task)).then((value) => value);
}

export function createHttpApi(fetchImpl: typeof fetch = fetch): LiveHandle {
  let recover: (() => Promise<RecoverResult>) | null = null;

  async function readCsrf(): Promise<string> {
    const raw = await requestJson({ path: "/v1/auth/csrf", method: "GET", fetchImpl });
    return parseData(raw.payload, parseCsrf).csrfToken;
  }

  async function call<T>(input: {
    path: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    unsafe?: boolean;
    idempotencyKey?: string;
    parse: (payload: unknown) => T;
    retryAuth?: boolean;
  }): Promise<{ data: T; meta: Awaited<ReturnType<typeof requestJson>>["meta"] }> {
    const send = async (token: string | null) => {
      const raw = await requestJson({
        path: input.path,
        method: input.method,
        body: input.body,
        csrfToken: token,
        idempotencyKey: input.idempotencyKey,
        fetchImpl,
      });
      return withMeta(input.parse(raw.payload), raw.meta);
    };
    const once = () =>
      input.unsafe ? exclusiveCsrf(async () => send(await readCsrf())) : send(null);
    try {
      return await once();
    } catch (error) {
      if (input.retryAuth && isApiError(error) && error.status === 401 && recover) {
        const outcome = await recover();
        if (outcome.type === "refreshed" || outcome.type === "already-current") return once();
      }
      throw error;
    }
  }

  const api: PlatformApi = {
    getCsrf: () =>
      call({
        path: "/v1/auth/csrf",
        method: "GET",
        parse: (payload) => parseData(payload, parseCsrf),
      }),
    register: (body) =>
      call<Accepted>({
        path: "/v1/auth/register",
        method: "POST",
        body,
        unsafe: true,
        parse: (payload) => parseData(payload, parseAccepted),
      }),
    requestEmailVerification: (body) =>
      call({
        path: "/v1/auth/email-verification/request",
        method: "POST",
        body,
        unsafe: true,
        parse: (payload) => parseData(payload, parseAccepted),
      }),
    confirmEmailVerification: (body) =>
      call<Verified>({
        path: "/v1/auth/email-verification/confirm",
        method: "POST",
        body,
        unsafe: true,
        parse: (payload) => parseData(payload, parseVerified),
      }),
    login: async (body) => {
      const result = await call<Session>({
        path: "/v1/auth/login",
        method: "POST",
        body,
        unsafe: true,
        parse: (payload) => parseData(payload, parseSession),
      });
      return result;
    },
    refresh: async () => {
      const result = await call<Session>({
        path: "/v1/auth/refresh",
        method: "POST",
        unsafe: true,
        parse: (payload) => parseData(payload, parseSession),
      });
      return result;
    },
    logout: () =>
      call<Revoked>({
        path: "/v1/auth/logout",
        method: "POST",
        unsafe: true,
        parse: (payload) => parseData(payload, parseRevoked),
      }),
    getProfile: () =>
      call<Profile>({
        path: "/v1/me",
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseProfile),
      }),
    updateProfile: (key, body: ProfileUpdate) =>
      call<MutationReceipt>({
        path: "/v1/me",
        method: "PUT",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    browseExams: (query) =>
      call({
        path: queryString("/v1/exams", {
          pageSize: query.pageSize,
          cursor: query.cursor,
          category: query.category,
        }),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseExam),
      }),
    getExam: (examId) =>
      call<Exam>({
        path: `/v1/exams/${examId}`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseExam),
      }),
    startAttempt: (examId, key) =>
      call<Attempt>({
        path: `/v1/exams/${examId}/attempts`,
        method: "POST",
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAttempt),
      }),
    resumeAttempt: (attemptId) =>
      call<Attempt>({
        path: `/v1/attempts/${attemptId}`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAttempt),
      }),
    getQuestions: (attemptId, query: PageQuery) =>
      call({
        path: queryString(`/v1/attempts/${attemptId}/questions`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseCandidateQuestion),
      }),
    getAnswers: (attemptId, query: PageQuery) =>
      call({
        path: queryString(`/v1/attempts/${attemptId}/answers`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseAnswer),
      }),
    saveAnswers: (attemptId, key, body: SaveAnswersRequest) =>
      call<SaveReceipt>({
        path: `/v1/attempts/${attemptId}/answers`,
        method: "PUT",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseSaveReceipt),
      }),
    submitAttempt: (attemptId, key) =>
      call<SubmitReceipt>({
        path: `/v1/attempts/${attemptId}/submit`,
        method: "POST",
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseSubmitReceipt),
      }),
    getAttemptStatus: (attemptId) =>
      call<Attempt>({
        path: `/v1/attempts/${attemptId}/status`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAttempt),
      }),
    getResult: async (attemptId) => {
      const raw = await requestJson({
        path: `/v1/attempts/${attemptId}/result`,
        method: "GET",
        fetchImpl,
      });
      if (raw.httpStatus === 202) {
        return withMeta<ResultRead>(
          { pending: true, result: null, attempt: parseData(raw.payload, parseAttempt) },
          raw.meta,
        );
      }
      return withMeta<ResultRead>(
        { pending: false, result: parseData(raw.payload, parseResult), attempt: null },
        raw.meta,
      );
    },
    getReleasedReview: (attemptId, query) =>
      call({
        path: queryString(`/v1/attempts/${attemptId}/review`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseReviewQuestion),
      }),
    getHistory: (query) =>
      call({
        path: queryString("/v1/me/attempts", query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseHistoryItem),
      }),
    getLeaderboard: (examId, versionId, query) =>
      call({
        path: queryString(`/v1/exams/${examId}/versions/${versionId}/leaderboard`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseLeaderboardEntry),
      }),
    listAdminExams: (query) =>
      call({
        path: queryString("/v1/admin/exams", query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseAdminExam),
      }),
    createExam: (key, body: ExamWriteRequest) =>
      call({
        path: "/v1/admin/exams",
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    getAdminExam: (examId) =>
      call<AdminExam>({
        path: `/v1/admin/exams/${examId}`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAdminExam),
      }),
    replaceExamDraft: (examId, key, body) =>
      call({
        path: `/v1/admin/exams/${examId}`,
        method: "PUT",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    archiveExam: (examId, key, body: RevisionRequest) =>
      call({
        path: `/v1/admin/exams/${examId}`,
        method: "DELETE",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    publishExam: (examId, key, body) =>
      call({
        path: `/v1/admin/exams/${examId}/publish`,
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    unpublishExam: (examId, key, body) =>
      call({
        path: `/v1/admin/exams/${examId}/unpublish`,
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    listBankQuestions: (query) =>
      call({
        path: queryString("/v1/admin/questions", query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseAdminQuestion),
      }),
    createBankQuestion: (key, body: QuestionWriteRequest) =>
      call({
        path: "/v1/admin/questions",
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    getBankQuestion: (questionId) =>
      call<AdminQuestion>({
        path: `/v1/admin/questions/${questionId}`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAdminQuestion),
      }),
    replaceBankQuestion: (questionId, key, body) =>
      call({
        path: `/v1/admin/questions/${questionId}`,
        method: "PUT",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    archiveBankQuestion: (questionId, key, body) =>
      call({
        path: `/v1/admin/questions/${questionId}`,
        method: "DELETE",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMutationReceipt),
      }),
    importQuestions: (key, body: ImportRequest) =>
      call<ImportReport>({
        path: "/v1/admin/question-imports",
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseImportReport),
      }),
    getImportReport: (importId) =>
      call({
        path: `/v1/admin/question-imports/${importId}`,
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseImportReport),
      }),
    listActiveCandidates: (examId, query) =>
      call({
        path: queryString(`/v1/admin/exams/${examId}/active-candidates`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseActiveCandidate),
      }),
    listSubmissions: (examId, query) =>
      call({
        path: queryString(`/v1/admin/exams/${examId}/submissions`, {
          pageSize: query.pageSize,
          cursor: query.cursor,
          publishedVersionId: query.publishedVersionId,
        }),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseAdminSubmission),
      }),
    getAdminResult: async (attemptId) => {
      const raw = await requestJson({
        path: `/v1/admin/attempts/${attemptId}/result`,
        method: "GET",
        fetchImpl,
      });
      if (raw.httpStatus === 202)
        return withMeta<ResultRead>(
          { pending: true, result: null, attempt: parseData(raw.payload, parseAttempt) },
          raw.meta,
        );
      return withMeta<ResultRead>(
        { pending: false, result: parseData(raw.payload, parseResult), attempt: null },
        raw.meta,
      );
    },
    getAdminReview: (attemptId, query) =>
      call({
        path: queryString(`/v1/admin/attempts/${attemptId}/review`, query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseReviewQuestion),
      }),
    replayFailedAttempt: (attemptId, key, body: ReplayRequest) =>
      call<Accepted>({
        path: `/v1/admin/attempts/${attemptId}/replay`,
        method: "POST",
        body,
        unsafe: true,
        idempotencyKey: key,
        retryAuth: true,
        parse: (payload) => parseData(payload, parseAccepted),
      }),
    getQuestionStatistics: (examId, versionId, query) =>
      call({
        path: queryString(
          `/v1/admin/exams/${examId}/versions/${versionId}/question-statistics`,
          query,
        ),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseQuestionStatistic),
      }),
    getSystemBusinessMetrics: () =>
      call<Metrics>({
        path: "/v1/admin/metrics",
        method: "GET",
        retryAuth: true,
        parse: (payload) => parseData(payload, parseMetrics),
      }),
    getAudit: (query) =>
      call({
        path: queryString("/v1/admin/audit", query),
        method: "GET",
        retryAuth: true,
        parse: (payload) => parsePage(payload, parseAuditEntry),
      }),
  };

  const transport: SessionTransport = {
    async probe(): Promise<ProbeResult> {
      try {
        await requestJson({ path: "/v1/me", method: "GET", fetchImpl });
        return "authenticated";
      } catch (error) {
        if (isApiError(error) && error.status === 401) return "anonymous";
        return "unknown";
      }
    },
    async refresh() {
      const result = await api.refresh();
      return result.data;
    },
  };

  return {
    api,
    transport,
    bindRecovery(next) {
      recover = next;
    },
  };
}

export type { Category };
