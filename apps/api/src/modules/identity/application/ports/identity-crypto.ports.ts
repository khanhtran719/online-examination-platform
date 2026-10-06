export interface Passwords {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}
export interface TokenClaims {
  userId: string;
  sessionId: string;
  familyId: string;
  jti: string;
  kid: string;
}
export interface IssuedTokens {
  userId: string;
  sessionId: string;
  familyId: string;
  access: string;
  refresh: string;
  accessHash: Uint8Array;
  refreshHash: Uint8Array;
  accessJti: string;
  refreshJti: string;
  kid: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
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
