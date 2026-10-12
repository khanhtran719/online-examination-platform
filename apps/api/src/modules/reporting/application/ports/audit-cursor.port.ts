export interface AuditCursorClaims {
  actorId: string;
  pageSize: number;
}
export interface AuditCursorState {
  watermark: string;
  position: [string, string];
  expiresAt: number;
}
export interface AuditCursor {
  sign(claims: AuditCursorClaims, state: AuditCursorState): string;
  read(token: string, claims: AuditCursorClaims, now: number): AuditCursorState;
}
