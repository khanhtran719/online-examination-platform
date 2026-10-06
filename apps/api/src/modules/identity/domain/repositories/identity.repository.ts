import {
  Account,
  Challenge,
  Family,
  SessionLookup,
  SessionRecord,
  PersistedSession,
} from "../entities/identity-state";
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
    claims: SessionLookup,
    hash: Uint8Array,
    purpose: "access" | "refresh",
  ): Promise<SessionRecord | null>;
  saveSession(tokens: PersistedSession): Promise<void>;
  consumeSession(id: string): Promise<void>;
  revokeFamily(id: string): Promise<void>;
  updateProfile(id: string, displayName: string, optIn: boolean): Promise<number>;
}
