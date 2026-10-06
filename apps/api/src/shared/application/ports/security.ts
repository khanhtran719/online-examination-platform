export interface AuditRecord {
  actorId: string;
  action: string;
  resourceId: string;
  resourceType: string;
  correlationId: string;
  changedFields?: string[];
}
export interface SecurityControls {
  audit(record: AuditRecord): Promise<void>;
  allow(scope: string, subject: string, intervalMs: number, burst: number): Promise<boolean>;
  reserveLogin(email: string): Promise<string | null>;
  releaseLogin(email: string, window: string): Promise<void>;
}

export interface SecurityMaintenance {
  purgeExpired(): Promise<void>;
}
