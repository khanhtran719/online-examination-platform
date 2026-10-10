export interface QuestionStatisticsCursorClaims {
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
}
export interface QuestionStatisticsCursorState {
  watermark: string;
  position: [number, number, string];
  expiresAt: number;
}
export interface QuestionStatisticsCursor {
  sign(claims: QuestionStatisticsCursorClaims, state: QuestionStatisticsCursorState): string;
  read(
    token: string,
    claims: QuestionStatisticsCursorClaims,
    now: number,
  ): QuestionStatisticsCursorState;
}
