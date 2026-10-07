export type CursorKind = "exam.browse" | "exam.admin" | "question.bank" | "question.frozen";

export interface CursorClaims {
  kind: CursorKind;
  actorId: string;
  pageSize: number;
  filter: string;
}

export interface CatalogCursor {
  sign(claims: CursorClaims, watermark: string, position: string[], expiresAt: number): string;
  read(token: string, claims: CursorClaims, now: number): { watermark: string; position: string[] };
}
