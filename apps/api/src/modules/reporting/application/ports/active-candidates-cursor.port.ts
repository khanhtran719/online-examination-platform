export interface ActiveCursorClaims {
  actorId: string;
  examId: string;
  pageSize: number;
}
export interface ActiveCursorState {
  watermark: string;
  position: [string, string];
  expiresAt: number;
}
export interface ActiveCandidatesCursor {
  sign(claims: ActiveCursorClaims, state: ActiveCursorState): string;
  read(token: string, claims: ActiveCursorClaims, now: number): ActiveCursorState;
}
