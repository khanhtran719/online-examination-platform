import { randomUUID } from "node:crypto";
import { AssessmentError } from "../../domain/assessment.error";
import { SubmissionKind, submissionEvent } from "../../domain/assessment-policy";
import { Attempt } from "../../domain/attempt";
import {
  AttemptRecord,
  AttemptRepository,
  LockedAttempt,
} from "../../domain/repositories/attempt.repository";
import { SubmitReceipt } from "../dto/assessment.dto";
import { SubmissionOutbox } from "../ports/submission-outbox";

export interface Acceptance {
  receipt: SubmitReceipt;
  /** True only when this call persisted the submission and its outbox row. */
  written: boolean;
}

/**
 * Shared acceptance path for manual submit and the deadline sweep.
 * The caller owns the transaction and has already locked the attempt.
 * This function does not revalidate Identity, write an HTTP receipt, or open a second lock.
 */
export async function acceptAttemptSubmission(
  repo: Pick<AttemptRepository, "submit">,
  outbox: SubmissionOutbox,
  input: {
    locked: LockedAttempt;
    kind: SubmissionKind;
    correlationId: string;
    causationId: string;
  },
): Promise<Acceptance> {
  if (input.locked.submittedAt !== null) {
    return { receipt: submitReceipt(input.locked), written: false };
  }
  const now = millis(input.locked.serverNow);
  const attempt = Attempt.restore({
    id: input.locked.id,
    examId: input.locked.examId,
    userId: input.locked.userId,
    status: input.locked.status,
    startedAt: millis(input.locked.startedAt),
    deadline: millis(input.locked.deadline),
    submittedAt: null,
    expired: input.locked.expired,
  });
  if (!attempt.submit(now)) {
    return { receipt: submitReceipt(input.locked), written: false };
  }
  const snap = attempt.snapshot();
  if (input.kind === "DEADLINE" && !snap.expired) {
    throw new AssessmentError("Attempt cannot submit");
  }
  const submissionId = randomUUID();
  const eventId = randomUUID();
  const submittedAt = input.locked.serverNow;
  const saved = await repo.submit({
    attemptId: input.locked.id,
    userId: input.locked.userId,
    status: snap.expired ? "EXPIRED" : "SUBMITTED",
    submittedAt,
    submissionId,
    eventId,
    expired: snap.expired,
    submissionKind: input.kind,
  });
  if (!saved) throw new AssessmentError("Attempt cannot submit");
  await outbox.append(
    submissionEvent({
      eventId,
      attemptId: input.locked.id,
      examId: input.locked.examId,
      publishedVersionId: input.locked.publishedVersionId,
      submissionId,
      occurredAt: submittedAt,
      deadline: input.locked.deadline,
      expired: snap.expired,
      submissionKind: input.kind,
      correlationId: input.correlationId,
      causationId: input.causationId,
    }),
  );
  return { receipt: submitReceipt(saved), written: true };
}

export function submitReceipt(record: AttemptRecord): SubmitReceipt {
  if (!record.submissionId || !record.submittedAt) {
    throw new AssessmentError("Attempt cannot submit");
  }
  return {
    attemptId: record.id,
    submissionId: record.submissionId,
    acceptedAt: record.submittedAt,
    acceptanceState: record.expired ? "EXPIRED" : "SUBMITTED",
    expired: record.expired,
  };
}

function millis(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("Database clock unavailable");
  return parsed;
}
