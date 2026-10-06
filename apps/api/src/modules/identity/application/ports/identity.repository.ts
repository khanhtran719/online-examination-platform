import { IssuedTokens, TokenClaims } from "./identity-crypto.ports";
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
export interface Profile {
  id: string;
  email: string;
  emailVerifiedAt: string;
  displayName: string;
  leaderboardOptIn: boolean;
  revision: number;
}
export interface Principal {
  userId: string;
  familyId: string;
  sessionId: string;
  permissions: string[];
  profile: Profile;
}
export interface MutationReceipt {
  resourceId: string;
  revision: number;
  acceptedAt: string;
}
export interface IdentityRepository {
  now(): Promise<number>;
  accountByEmail(email: string): Promise<Account | null>;
  lockAccount(id: string): Promise<Account | null>;
  createAccount(input: {
    id: string;
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<boolean>;
  challengeByHash(hash: Uint8Array): Promise<Challenge | null>;
  lockChallenge(id: string): Promise<Challenge | null>;
  activeChallenge(userId: string, now: number): Promise<Challenge | null>;
  canSend(userId: string, now: number): Promise<boolean>;
  createChallenge(input: {
    id: string;
    userId: string;
    email: string;
    hash: Uint8Array;
    ciphertext: string;
    expiresAt: number;
  }): Promise<void>;
  enqueueEmail(id: string, challengeId: string): Promise<void>;
  activate(userId: string, challengeId: string, passwordHash: string): Promise<void>;
  createFamily(id: string, userId: string, absoluteExpiresAt: number): Promise<void>;
  lockFamily(id: string): Promise<Family | null>;
  session(
    claims: TokenClaims,
    hash: Uint8Array,
    purpose: "access" | "refresh",
  ): Promise<SessionRecord | null>;
  saveSession(tokens: IssuedTokens): Promise<void>;
  consumeSession(id: string): Promise<void>;
  revokeFamily(id: string): Promise<void>;
  principal(claims: TokenClaims, hash: Uint8Array): Promise<Principal | null>;
  csrfFamily(claims: TokenClaims, hash: Uint8Array, allowRevoked: boolean): Promise<string | null>;
  updateProfile(id: string, displayName: string, optIn: boolean): Promise<number>;
}
