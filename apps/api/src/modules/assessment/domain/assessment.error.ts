export class AssessmentError extends Error {
  readonly category = "business_rule" as const;
}
