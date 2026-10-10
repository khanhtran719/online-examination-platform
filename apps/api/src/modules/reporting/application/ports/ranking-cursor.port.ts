import { RankingPosition } from "./ranking.query";
export interface RankingCursorClaims {
  actorId: string;
  examId: string;
  versionId: string;
  pageSize: number;
}
export interface RankingCursorState {
  watermark: string;
  epoch: string;
  position: RankingPosition;
  expiresAt: number;
}
export interface RankingCursor {
  sign(claims: RankingCursorClaims, state: RankingCursorState): string;
  read(token: string, claims: RankingCursorClaims, now: number): RankingCursorState;
}
export interface RankingAlias {
  alias(versionId: string, userId: string): string;
}
