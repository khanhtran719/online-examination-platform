import { SubmittedEvent } from "./assessment-policy";
import { AttemptState } from "./attempt";
import { SubmissionKind } from "./assessment-policy";

interface SubmissionIdentity extends Pick<
  AttemptState,
  "examId" | "status" | "submittedAt" | "deadline" | "expired"
> {
  publishedVersionId: string;
  submissionId: string | null;
  submissionEventId: string | null;
  submissionKind: SubmissionKind | null;
}

export function matchesSubmission(
  attempt: SubmissionIdentity,
  event: SubmittedEvent,
  allowCompletedAlias = false,
): boolean {
  const p = event.payload;
  return (
    attempt.examId === p.examId.toLowerCase() &&
    attempt.publishedVersionId === p.publishedVersionId.toLowerCase() &&
    attempt.submissionId === p.submissionId.toLowerCase() &&
    attempt.submittedAt === Date.parse(event.occurredAt) &&
    attempt.deadline === Date.parse(p.deadline) &&
    attempt.expired === p.expired &&
    attempt.submissionKind === p.submissionKind &&
    (attempt.submissionEventId === event.eventId.toLowerCase() ||
      (allowCompletedAlias && attempt.status === "COMPLETED"))
  );
}
