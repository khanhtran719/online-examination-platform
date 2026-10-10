export interface CandidateResultsCursorClaims {
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
}
export interface CandidateResultsCursorState {
  watermark: string;
  position: string;
  expiresAt: number;
}
export interface CandidateResultsCursor {
  sign(claims: CandidateResultsCursorClaims, state: CandidateResultsCursorState): string;
  read(
    token: string,
    claims: CandidateResultsCursorClaims,
    now: number,
  ): CandidateResultsCursorState;
}
