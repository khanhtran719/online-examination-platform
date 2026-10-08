import { SubmittedEvent } from "../../domain/assessment-policy";

/** Transaction-side intent. The dispatcher that publishes platform.outbox is a later increment. */
export interface SubmissionOutbox {
  append(event: SubmittedEvent): Promise<void>;
}
