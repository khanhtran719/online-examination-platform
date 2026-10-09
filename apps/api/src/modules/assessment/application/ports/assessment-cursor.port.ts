export type AssessmentCursorKind =
  "attempt.questions" | "attempt.answers" | "attempt.review" | "attempt.history";

export interface AssessmentCursorClaims {
  kind: AssessmentCursorKind;
  actorId: string;
  pageSize: number;
  filter: string;
}

export interface AssessmentCursor {
  sign(
    claims: AssessmentCursorClaims,
    watermark: string,
    position: string[],
    expiresAt: number,
  ): string;
  read(
    token: string,
    claims: AssessmentCursorClaims,
    now: number,
  ): { watermark: string; position: string[] };
}
