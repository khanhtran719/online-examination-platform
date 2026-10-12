import { invalidReport } from "./reporting.error";

export interface AuditSource {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: string;
  correlationId: string;
  changedFields: unknown;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const actions = new Set([
  "identity.login",
  "identity.logout",
  "identity.refresh.reuse",
  "identity.profile.update",
  "identity.admin.grant",
  "identity.admin.revoke",
  "identity.email.replay",
  "identity.key.revoke",
  "identity.pending.purge",
  "catalog.exam.create",
  "catalog.exam.replace",
  "catalog.exam.archive",
  "catalog.exam.publish",
  "catalog.exam.unpublish",
  "catalog.question.create",
  "catalog.question.replace",
  "catalog.question.archive",
  "catalog.question.list",
  "catalog.question.read",
  "catalog.import",
  "assessment.grading.failed",
  "assessment.grading.replay",
  "assessment.outbox.replay",
  "assessment.payload.purge",
  "assessment.receipts.prune",
  "reporting.active-candidates.read",
  "reporting.submissions.read",
  "reporting.result.read",
  "reporting.question-statistics.read",
  "reporting.candidate-results.read",
  "reporting.business-metrics.read",
  "reporting.audit.read",
  "platform.audit.prune",
]);
const types = new Set([
  "USER",
  "SESSION_FAMILY",
  "EMAIL_INTENT",
  "EXAM",
  "EXAM_VERSION",
  "QUESTION",
  "IMPORT_REPORT",
  "QUESTION_IMPORT",
  "SUBMISSION_EVENT",
  "RETENTION_BATCH",
  "ATTEMPT",
  "BUSINESS_METRICS",
  "AUDIT_LOG",
  "RECEIPT",
  "UNSPECIFIED",
]);
const fields = new Set([
  "displayName",
  "leaderboardOptIn",
  "email",
  "passwordHash",
  "permissions",
  "revokedAt",
  "availableAt",
  "parkedAt",
  "replayAt",
  "attempts",
  "title",
  "category",
  "schedule",
  "sections",
  "archivedAt",
  "published",
  "currentVersionId",
  "type",
  "prompt",
  "options",
  "points",
  "valid",
  "committed",
  "dryRun",
  "status",
  "generation",
  "gradingGeneration",
  "revision",
  "outbox",
  "failureCode",
  "replayPending",
  "purgedAt",
  "answers",
  "selections",
  "results",
  "statistics",
  "leaderboard",
  "receipts",
  "purgedRows",
]);
export function auditTime(value: string): number {
  const n = Date.parse(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    value.startsWith("0000-") ||
    !Number.isFinite(n) ||
    new Date(n).toISOString() !== value
  )
    throw invalidReport();
  return n;
}
export function validateAuditPosition(state: {
  watermark: string;
  position: [string, string];
  expiresAt: number;
}): number {
  const n = auditTime(state.watermark);
  if (
    state.position.length !== 2 ||
    !uuid.test(state.position[1]) ||
    auditTime(state.position[0]) > n ||
    !Number.isSafeInteger(state.expiresAt) ||
    state.expiresAt !== n + 900000
  )
    throw invalidReport();
  return n;
}
export function auditValues(row: AuditSource) {
  try {
    auditTime(row.occurredAt);
    if (
      !uuid.test(row.id) ||
      !uuid.test(row.correlationId) ||
      (row.actorId !== null && !uuid.test(row.actorId)) ||
      (row.resourceId !== null && !uuid.test(row.resourceId)) ||
      !["USER", "OPERATOR", "SYSTEM"].includes(row.actorType) ||
      !["SUCCESS", "DENIED", "FAILURE"].includes(row.outcome) ||
      !Array.isArray(row.changedFields)
    )
      throw Error();
  } catch {
    throw Error("AUDIT_STATE_UNAVAILABLE");
  }
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    actorId: row.actorId,
    actorType: row.actorType as "USER" | "OPERATOR" | "SYSTEM",
    action: actions.has(row.action) ? row.action : "UNRECOGNIZED",
    resourceType: types.has(row.resourceType) ? row.resourceType : "UNSPECIFIED",
    resourceId: row.resourceId,
    outcome: (row.outcome === "FAILURE" ? "FAILED" : row.outcome) as
      "SUCCESS" | "DENIED" | "FAILED",
    reason: null,
    correlationId: row.correlationId,
    changedFields: [
      ...new Set(
        (row.changedFields as unknown[]).filter(
          (v): v is string => typeof v === "string" && fields.has(v),
        ),
      ),
    ],
  };
}
