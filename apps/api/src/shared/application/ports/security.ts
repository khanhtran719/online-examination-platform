export interface AuditRecord {
  actorId: string;
  action: string;
  resourceId: string;
  resourceType: string;
  correlationId: string;
  changedFields?: string[];
}
export interface SecurityControls {
  /** Stable keyed identifier for atomic database admission; never a raw subject. */
  rateSubject(scope: string, subject: string): Uint8Array;
  audit(record: AuditRecord): Promise<void>;
  allow(scope: string, subject: string, intervalMs: number, burst: number): Promise<boolean>;
  reserveLogin(email: string): Promise<string | null>;
  releaseLogin(email: string, window: string): Promise<void>;
}

export interface SecurityMaintenance {
  purgeExpired(): Promise<void>;
}
