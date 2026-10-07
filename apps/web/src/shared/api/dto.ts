export const CATEGORIES = [
  "TOEIC",
  "IELTS",
  "IT_CERTIFICATION",
  "UNIVERSITY",
  "RECRUITMENT",
  "CORPORATE",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ATTEMPT_STATUSES = [
  "CREATED",
  "IN_PROGRESS",
  "SUBMITTED",
  "PROCESSING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const EXPLANATION_POLICIES = ["NEVER", "AFTER_COMPLETION", "AFTER_EXAM_CLOSE"] as const;
export type ExplanationPolicy = (typeof EXPLANATION_POLICIES)[number];

export const PERMISSIONS = [
  "catalog.read",
  "assessment.take",
  "assessment.result.read",
  "catalog.manage",
  "catalog.keys.read",
  "catalog.import",
  "reporting.read",
  "assessment.review.admin",
  "assessment.replay",
  "audit.read",
  "system.metrics.read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Accepted {
  accepted: true;
}
export interface Revoked {
  revoked: true;
}
export interface Verified {
  verified: true;
}
export interface Csrf {
  csrfToken: string;
  expiresAt: string;
}
export interface Session {
  userId: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  absoluteExpiresAt: string;
}
export interface Profile {
  id: string;
  email: string;
  emailVerifiedAt: string;
  displayName: string;
  leaderboardOptIn: boolean;
  revision: number;
}
export interface ProfileUpdate {
  displayName: string;
  leaderboardOptIn: boolean;
  expectedRevision: number;
}
export interface MutationReceipt {
  resourceId: string;
  revision: number;
  acceptedAt: string;
}
export interface SectionSummary {
  id: string;
  title: string;
  position: number;
  questionCount: number;
  possible: number;
}
export interface Exam {
  id: string;
  title: string;
  category: Category;
  publishedVersionId: string;
  version: number;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  questionCount: number;
  scoringPolicy: "EXACT_MATCH_V1";
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionSummary[];
}
export interface CandidateOption {
  id: string;
  position: number;
  text: string;
}
export interface CandidateQuestion {
  id: string;
  sectionId: string;
  position: number;
  type: QuestionType;
  prompt: string;
  points: number;
  options: CandidateOption[];
}
export interface Attempt {
  id: string;
  examId: string;
  publishedVersionId: string;
  revision: number;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  expired: boolean;
  serverNow: string;
  canSave: boolean;
  resultAvailable: boolean;
  pollAfterSeconds: number;
  replayPending: boolean;
}
export interface Answer {
  questionId: string;
  selectedOptionIds: string[];
  marked: boolean;
  version: number;
  updatedAt: string | null;
}
export interface AnswerMutation {
  questionId: string;
  selectedOptionIds: string[];
  marked: boolean;
  expectedVersion: number;
}
export interface SaveAnswersRequest {
  answers: AnswerMutation[];
}
export interface SaveReceipt {
  attemptId: string;
  acceptedAt: string;
  answers: { questionId: string; version: number }[];
}
export interface SubmitReceipt {
  attemptId: string;
  submissionId: string;
  acceptedAt: string;
  acceptanceState: "SUBMITTED" | "EXPIRED";
  expired: boolean;
}
export interface SectionScore {
  sectionId: string;
  earned: number;
  possible: number;
  correct: number;
  total: number;
}
export interface ReviewLink {
  href: string;
}
export interface Result {
  attemptId: string;
  publishedVersionId: string;
  submissionId: string;
  completedAt: string;
  earned: number;
  possible: number;
  correct: number;
  total: number;
  percentageBasisPoints: number;
  expired: boolean;
  scoringPolicy: "EXACT_MATCH_V1";
  sections: SectionScore[];
  review: ReviewLink | null;
}
export interface ReviewQuestion {
  question: CandidateQuestion;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  correct: boolean;
  explanation: string | null;
}
export interface LeaderboardEntry {
  rank: number;
  pseudonym: string;
  earned: number;
  possible: number;
  completedAt: string;
}
export interface HistoryItem {
  attemptId: string;
  examId: string;
  publishedVersionId: string;
  startedAt: string;
  status: AttemptStatus;
  expired: boolean;
  earned: number | null;
  possible: number | null;
}
export interface QuestionOptionInput {
  position: number;
  text: string;
}
export interface QuestionWriteRequest {
  type: QuestionType;
  prompt: string;
  options: QuestionOptionInput[];
  correctOptionPositions: number[];
  points: number;
  explanation: string | null;
  expectedRevision: number;
}
export interface AdminQuestion {
  id: string;
  revision: number;
  archived: boolean;
  type: QuestionType;
  prompt: string;
  options: QuestionOptionInput[];
  correctOptionPositions: number[];
  points: number;
  explanation: string | null;
}
export interface QuestionReference {
  bankQuestionId: string;
  position: number;
  points: number;
}
export interface SectionInput {
  title: string;
  position: number;
  questions: QuestionReference[];
}
export interface ExamWriteRequest {
  title: string;
  category: Category;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionInput[];
  expectedRevision: number;
}
export interface AdminExam {
  id: string;
  revision: number;
  published: boolean;
  archived: boolean;
  publishedVersionId: string | null;
  title: string;
  category: Category;
  durationSeconds: number;
  openAt: string;
  closeAt: string;
  displayTimezone: string;
  attemptLimit: number;
  explanationPolicy: ExplanationPolicy;
  leaderboardEnabled: boolean;
  sections: SectionInput[];
}
export interface RevisionRequest {
  expectedRevision: number;
}
export interface ReplayRequest {
  expectedRevision: number;
  reason: string;
}
export interface ImportEntry {
  clientRef: string;
  type: QuestionType;
  prompt: string;
  options: QuestionOptionInput[];
  correctOptionPositions: number[];
  points: number;
  explanation: string | null;
}
export interface ImportRequest {
  schemaVersion: 1;
  dryRun: boolean;
  questions: ImportEntry[];
}
export interface ImportIssue {
  clientRef: string;
  field: string;
  message: string;
}
export interface ImportedQuestion {
  clientRef: string;
  questionId: string;
}
export interface ImportReport {
  id: string;
  valid: boolean;
  committed: boolean;
  issues: ImportIssue[];
  questions: ImportedQuestion[];
  createdAt: string;
}
export interface ActiveCandidate {
  candidateId: string;
  attemptId: string;
  status: AttemptStatus;
  startedAt: string;
  deadline: string;
}
export interface AdminSubmission {
  candidateId: string;
  attemptId: string;
  publishedVersionId: string;
  submittedAt: string | null;
  status: AttemptStatus;
  expired: boolean;
  earned: number | null;
  possible: number | null;
}
export interface OptionStatistic {
  optionId: string;
  selectedCount: number;
}
export interface QuestionStatistic {
  questionId: string;
  completedAttempts: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  options: OptionStatistic[];
}
export interface Metrics {
  asOf: string;
  activeCandidates: number;
  submitted: number;
  completed: number;
  failed: number;
  httpRps: number;
  httpP95Ms: number;
  queueDepth: number;
  oldestJobSeconds: number;
}
export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  reason: string | null;
  correlationId: string;
  changedFields: string[];
}
export interface Page<T> {
  items: T[];
  next: string | null;
  pageSize: number;
}
export interface PageQuery {
  pageSize?: number;
  cursor?: string;
}
export interface HttpMeta {
  httpStatus: number;
  correlationId: string | null;
  retryAfterSeconds: number | null;
  idempotencyReplayed: boolean;
}
export interface ApiSuccess<T> {
  data: T;
  meta: HttpMeta;
}
