import { SessionLookup, PersistedSession } from "../../domain/entities/identity-state";
export interface Passwords {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
export type TokenClaims = SessionLookup;
export interface IssuedTokens extends PersistedSession {
  userId: string;
  access: string;
  refresh: string;
  absoluteExpiresAt: number;
}
export interface SessionTokens {
  issue(input: {
    userId: string;
    sessionId: string;
    familyId: string;
    now: number;
    absoluteExpiresAt: number;
  }): Promise<IssuedTokens>;
  verify(token: string, purpose: "access" | "refresh"): Promise<TokenClaims>;
  hash(value: string): Uint8Array;
}
export interface VerificationSecrets {
  id(): string;
  newToken(): string;
  hash(value: string): Uint8Array;
  seal(input: { challengeId: string; token: string }): Promise<string>;
  open(ciphertext: string, challengeId: string): Promise<string>;
}
