import { AttemptRecord } from "../../domain/repositories/attempt.repository";
import { AttemptView } from "../dto/assessment.dto";
export function attemptView(record: AttemptRecord, serverNow: string): AttemptView {
  const now = Date.parse(serverNow),
    deadline = Date.parse(record.deadline);
  if (!Number.isFinite(now) || !Number.isFinite(deadline))
    throw new Error("Database clock unavailable");
  return {
    id: record.id,
    examId: record.examId,
    publishedVersionId: record.publishedVersionId,
    revision: record.revision,
    status: record.status,
    startedAt: record.startedAt,
    deadline: record.deadline,
    submittedAt: record.submittedAt,
    expired: record.expired,
    serverNow,
    canSave: record.status === "IN_PROGRESS" && now < deadline,
    resultAvailable: record.status === "COMPLETED",
    pollAfterSeconds:
      ["SUBMITTED", "EXPIRED", "PROCESSING"].includes(record.status) ||
      (record.status === "FAILED" && record.replayPending)
        ? 2
        : 0,
    replayPending: record.replayPending,
  };
}
