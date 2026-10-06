import { AssessmentError } from "./assessment.error";

export type AttemptStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "PROCESSING"
  | "COMPLETED"
  | "EXPIRED"
  | "FAILED";

export interface AttemptState {
  id: string;
  examId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: number;
  deadline: number;
  submittedAt: number | null;
  expired: boolean;
}

const submittedStates: readonly AttemptStatus[] = [
  "SUBMITTED",
  "PROCESSING",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
];

/** Pure lifecycle policy. Persistence, authorization and clocks are application concerns. */
export class Attempt {
  private constructor(private readonly state: AttemptState) {}

  static restore(state: AttemptState): Attempt {
    if (
      !Number.isFinite(state.startedAt) ||
      !Number.isFinite(state.deadline) ||
      state.deadline <= state.startedAt
    ) {
      throw new AssessmentError("Invalid attempt deadline");
    }
    const isSubmitted = submittedStates.includes(state.status);
    const isUnsubmitted = ["CREATED", "IN_PROGRESS"].includes(state.status);
    const expiredAtSubmission =
      state.submittedAt !== null && state.submittedAt >= state.deadline;
    if (
      (!isSubmitted && !isUnsubmitted) ||
      isSubmitted !== (state.submittedAt !== null) ||
      (state.submittedAt !== null &&
        (!Number.isFinite(state.submittedAt) ||
          state.submittedAt < state.startedAt)) ||
      state.expired !== expiredAtSubmission ||
      (state.status === "EXPIRED" && !state.expired) ||
      (state.status === "SUBMITTED" && state.expired)
    ) {
      throw new AssessmentError("Invalid attempt state");
    }
    return new Attempt({ ...state });
  }

  start(): void {
    if (this.state.status !== "CREATED") {
      throw new AssessmentError("Attempt cannot start");
    }
    this.state.status = "IN_PROGRESS";
  }

  assertCanSave(now: number): void {
    this.assertTime(now);
    if (this.state.status !== "IN_PROGRESS" || now >= this.state.deadline) {
      throw new AssessmentError("Attempt is closed");
    }
  }

  /** True only for the first accepted submission; caller commits its receipt and outbox. */
  submit(now: number): boolean {
    this.assertTime(now);
    if (submittedStates.includes(this.state.status)) return false;
    if (this.state.status !== "IN_PROGRESS") {
      throw new AssessmentError("Attempt cannot submit");
    }
    this.state.expired = now >= this.state.deadline;
    this.state.status = this.state.expired ? "EXPIRED" : "SUBMITTED";
    this.state.submittedAt = now;
    return true;
  }

  processing(): void {
    if (!["SUBMITTED", "EXPIRED", "FAILED"].includes(this.state.status)) {
      throw new AssessmentError("Attempt cannot process");
    }
    this.state.status = "PROCESSING";
  }

  complete(): void {
    if (this.state.status !== "PROCESSING") {
      throw new AssessmentError("Attempt cannot complete");
    }
    this.state.status = "COMPLETED";
  }

  fail(): void {
    if (this.state.status !== "PROCESSING") {
      throw new AssessmentError("Attempt cannot fail");
    }
    this.state.status = "FAILED";
  }

  snapshot(): AttemptState {
    return { ...this.state };
  }

  private assertTime(now: number): void {
    if (!Number.isFinite(now) || now < this.state.startedAt) {
      throw new AssessmentError("Invalid server time");
    }
  }
}
