import { SessionLookup } from "../../domain/entities/identity-state";
import { Principal } from "../dto/identity.dto";
export const WRITE_ADMISSION_INTERVAL_MS = 200;
export const WRITE_ADMISSION_BURST = 20;

export interface WriteAdmissionInput {
  access: { claims: SessionLookup; hash: Uint8Array };
  refresh: { claims: SessionLookup; hash: Uint8Array } | null;
  csrfFamily: string;
  permission: string;
  subjectHash: Uint8Array;
  intervalMs: number;
  burst: number;
}

export interface WriteAdmissionResult {
  principal: Principal | null;
  csrfValid: boolean;
  allowed: boolean;
}

/** Technical write workflow. The business mutation must revalidate after its own lock. */
export interface AuthenticatedWriteAdmission {
  admit(input: WriteAdmissionInput): Promise<WriteAdmissionResult>;
}
