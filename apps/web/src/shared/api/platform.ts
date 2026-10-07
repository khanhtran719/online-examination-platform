import type {
  Accepted,
  ActiveCandidate,
  AdminExam,
  AdminQuestion,
  AdminSubmission,
  Answer,
  ApiSuccess,
  Attempt,
  AuditEntry,
  CandidateQuestion,
  Category,
  Csrf,
  Exam,
  ExamWriteRequest,
  HistoryItem,
  ImportReport,
  ImportRequest,
  LeaderboardEntry,
  Metrics,
  MutationReceipt,
  Page,
  PageQuery,
  Profile,
  ProfileUpdate,
  QuestionStatistic,
  QuestionWriteRequest,
  ReplayRequest,
  Result,
  ReviewQuestion,
  RevisionRequest,
  Revoked,
  SaveAnswersRequest,
  SaveReceipt,
  Session,
  SubmitReceipt,
  Verified,
} from "./dto";

export interface ResultRead {
  pending: boolean;
  result: Result | null;
  attempt: Attempt | null;
}

export interface PlatformApi {
  getCsrf(): Promise<ApiSuccess<Csrf>>;
  register(body: { email: string; displayName: string; password: string }): Promise<ApiSuccess<Accepted>>;
  requestEmailVerification(body: { email: string }): Promise<ApiSuccess<Accepted>>;
  confirmEmailVerification(body: { token: string; password: string }): Promise<ApiSuccess<Verified>>;
  login(body: { email: string; password: string }): Promise<ApiSuccess<Session>>;
  refresh(): Promise<ApiSuccess<Session>>;
  logout(): Promise<ApiSuccess<Revoked>>;
  getProfile(): Promise<ApiSuccess<Profile>>;
  updateProfile(key: string, body: ProfileUpdate): Promise<ApiSuccess<MutationReceipt>>;
  browseExams(query: PageQuery & { category?: Category }): Promise<ApiSuccess<Page<Exam>>>;
  getExam(examId: string): Promise<ApiSuccess<Exam>>;
  startAttempt(examId: string, key: string): Promise<ApiSuccess<Attempt>>;
  resumeAttempt(attemptId: string): Promise<ApiSuccess<Attempt>>;
  getQuestions(attemptId: string, query: PageQuery): Promise<ApiSuccess<Page<CandidateQuestion>>>;
  getAnswers(attemptId: string, query: PageQuery): Promise<ApiSuccess<Page<Answer>>>;
  saveAnswers(attemptId: string, key: string, body: SaveAnswersRequest): Promise<ApiSuccess<SaveReceipt>>;
  submitAttempt(attemptId: string, key: string): Promise<ApiSuccess<SubmitReceipt>>;
  getAttemptStatus(attemptId: string): Promise<ApiSuccess<Attempt>>;
  getResult(attemptId: string): Promise<ApiSuccess<ResultRead>>;
  getReleasedReview(attemptId: string, query: PageQuery): Promise<ApiSuccess<Page<ReviewQuestion>>>;
  getHistory(query: PageQuery): Promise<ApiSuccess<Page<HistoryItem>>>;
  getLeaderboard(
    examId: string,
    versionId: string,
    query: PageQuery,
  ): Promise<ApiSuccess<Page<LeaderboardEntry>>>;
  listAdminExams(query: PageQuery): Promise<ApiSuccess<Page<AdminExam>>>;
  createExam(key: string, body: ExamWriteRequest): Promise<ApiSuccess<MutationReceipt>>;
  getAdminExam(examId: string): Promise<ApiSuccess<AdminExam>>;
  replaceExamDraft(examId: string, key: string, body: ExamWriteRequest): Promise<ApiSuccess<MutationReceipt>>;
  archiveExam(examId: string, key: string, body: RevisionRequest): Promise<ApiSuccess<MutationReceipt>>;
  publishExam(examId: string, key: string, body: RevisionRequest): Promise<ApiSuccess<MutationReceipt>>;
  unpublishExam(examId: string, key: string, body: RevisionRequest): Promise<ApiSuccess<MutationReceipt>>;
  listBankQuestions(query: PageQuery): Promise<ApiSuccess<Page<AdminQuestion>>>;
  createBankQuestion(key: string, body: QuestionWriteRequest): Promise<ApiSuccess<MutationReceipt>>;
  getBankQuestion(questionId: string): Promise<ApiSuccess<AdminQuestion>>;
  replaceBankQuestion(
    questionId: string,
    key: string,
    body: QuestionWriteRequest,
  ): Promise<ApiSuccess<MutationReceipt>>;
  archiveBankQuestion(questionId: string, key: string, body: RevisionRequest): Promise<ApiSuccess<MutationReceipt>>;
  importQuestions(key: string, body: ImportRequest): Promise<ApiSuccess<ImportReport>>;
  getImportReport(importId: string): Promise<ApiSuccess<ImportReport>>;
  listActiveCandidates(examId: string, query: PageQuery): Promise<ApiSuccess<Page<ActiveCandidate>>>;
  listSubmissions(
    examId: string,
    query: PageQuery & { publishedVersionId?: string },
  ): Promise<ApiSuccess<Page<AdminSubmission>>>;
  getAdminResult(attemptId: string): Promise<ApiSuccess<ResultRead>>;
  getAdminReview(attemptId: string, query: PageQuery): Promise<ApiSuccess<Page<ReviewQuestion>>>;
  replayFailedAttempt(attemptId: string, key: string, body: ReplayRequest): Promise<ApiSuccess<Accepted>>;
  getQuestionStatistics(
    examId: string,
    versionId: string,
    query: PageQuery,
  ): Promise<ApiSuccess<Page<QuestionStatistic>>>;
  getSystemBusinessMetrics(): Promise<ApiSuccess<Metrics>>;
  getAudit(query: PageQuery): Promise<ApiSuccess<Page<AuditEntry>>>;
}

export const DELIVERED_LIVE_OPERATIONS = [
  "getCsrf",
  "register",
  "requestEmailVerification",
  "confirmEmailVerification",
  "login",
  "refresh",
  "logout",
  "getProfile",
  "updateProfile",
] as const;

export type LiveOperation = keyof PlatformApi;

export function isDeliveredLive(operation: LiveOperation): boolean {
  return (DELIVERED_LIVE_OPERATIONS as readonly string[]).includes(operation);
}
