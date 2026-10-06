export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  enabled: boolean;
  emailVerifiedAt: number | null;
  credentialVersion: number;
  revision: number;
  leaderboardOptIn: boolean;
  createdAt: number;
}
export interface Challenge {
  id: string;
  userId: string;
  email: string;
  expiresAt: number;
  consumed: boolean;
  cancelled: boolean;
  ciphertext: string | null;
}
export interface Family {
  id: string;
  userId: string;
  absoluteExpiresAt: number;
  revoked: boolean;
}
export interface SessionRecord {
  id: string;
  familyId: string;
  consumed: boolean;
  refreshExpiresAt: number;
  accessExpiresAt: number;
}
export interface SessionLookup {
  userId: string;
  sessionId: string;
  familyId: string;
  jti: string;
  kid: string;
}
export interface PersistedSession {
  sessionId: string;
  familyId: string;
  accessHash: Uint8Array;
  refreshHash: Uint8Array;
  accessJti: string;
  refreshJti: string;
  kid: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}
