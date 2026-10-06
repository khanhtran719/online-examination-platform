import { FastifyReply, FastifyRequest } from "fastify";
import { IssuedTokens } from "../../application/ports/identity-crypto.ports";
export const HTTP_SESSION = Symbol("HTTP_SESSION");
export interface HttpSessionPort {
  csrfResponse(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ csrfToken: string; expiresAt: string }>;
  checkUnsafe(request: FastifyRequest, context?: "live" | "logout"): Promise<void>;
  admit(request: FastifyRequest, kind: "read" | "write", actor?: string): Promise<void>;
  registerAdmission(request: FastifyRequest): Promise<void>;
  access(request: FastifyRequest): string;
  refresh(request: FastifyRequest): string;
  optionalRefresh(request: FastifyRequest): string | undefined;
  session(
    reply: FastifyReply,
    tokens: IssuedTokens,
  ): {
    userId: string;
    accessExpiresAt: string;
    refreshExpiresAt: string;
    absoluteExpiresAt: string;
  };
  clear(reply: FastifyReply): void;
}
