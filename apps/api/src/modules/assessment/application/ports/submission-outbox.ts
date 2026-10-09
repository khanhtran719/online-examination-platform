import { SubmittedEvent } from "../../domain/assessment-policy";

/** Transaction-side intent only. The separate dispatcher publishes after commit. */
export interface SubmissionOutbox {
  append(event: SubmittedEvent): Promise<void>;
}
