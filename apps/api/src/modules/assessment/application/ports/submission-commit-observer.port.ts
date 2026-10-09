/** Called only after successful transaction completion. Telemetry must not change acceptance. */
export interface SubmissionCommitObserver {
  committed(sample: { deadline: string; acceptedAt: string }): void;
}
