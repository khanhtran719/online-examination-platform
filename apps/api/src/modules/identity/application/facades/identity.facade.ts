export const IDENTITY_ACCESS = Symbol("IDENTITY_ACCESS");

export interface IdentityAccess {
  authenticate(accessToken: string): Promise<{
    userId: string;
    permissions: readonly string[];
  }>;
  requirePermission(actor: { permissions: readonly string[] }, permission: string): void;
  revalidate(
    accessToken: string,
    permission: string,
  ): Promise<{ userId: string; permissions: readonly string[] }>;
}

export const REQUEST_GUARD = Symbol("REQUEST_GUARD");

export interface GuardedRequest {
  headers: Record<string, string | string[] | undefined>;
  cookies: Partial<Record<string, string>>;
  id: string;
  ip: string;
}

export interface RequestGuard {
  checkUnsafe(request: GuardedRequest, context?: "live" | "logout" | "anonymous"): Promise<void>;
  admit(request: GuardedRequest, kind: "read" | "write", actor?: string): Promise<void>;
  access(request: GuardedRequest): string;
}
