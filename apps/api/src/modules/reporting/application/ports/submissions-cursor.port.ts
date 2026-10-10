export interface SubmissionCursorClaims {
  actorId: string;
  examId: string;
  publishedVersionId: string | null;
  pageSize: number;
}
export interface SubmissionCursorState {
  watermark: string;
  position: [string, string];
  expiresAt: number;
}
export interface SubmissionsCursor {
  sign(claims: SubmissionCursorClaims, state: SubmissionCursorState): string;
  read(token: string, claims: SubmissionCursorClaims, now: number): SubmissionCursorState;
}
