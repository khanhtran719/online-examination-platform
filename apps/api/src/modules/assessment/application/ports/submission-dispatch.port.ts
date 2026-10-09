export interface SubmissionClaim {
  eventId: string;
  aggregateId: string;
  correlationId: string;
  causationId: string | null;
  payload: unknown;
  token: string;
  attempts: number;
  ageMs: number;
}

export interface DispatchBacklog {
  pending: number;
  parked: number;
  oldestPendingAgeMs: number;
}

/** Each mutation commits atomically before returning; no broker I/O in a UoW. */
export interface SubmissionDispatch {
  claim(limit: number, leaseMs: number): Promise<SubmissionClaim[]>;
  delivered(claim: SubmissionClaim): Promise<boolean>;
  failed(claim: SubmissionClaim, code: string, delayMs: number, park: boolean): Promise<boolean>;
  backlog(): Promise<DispatchBacklog>;
}

export interface SubmissionReplay {
  replay(eventId: string, operator: string, reason: string, correlationId: string): Promise<void>;
}
