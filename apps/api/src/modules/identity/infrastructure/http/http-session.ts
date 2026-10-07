import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { IdentityService } from "../../application/services/identity.service";
import { IssuedTokens } from "../../application/ports/identity-crypto.ports";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { forbidden, rateLimited, unauthenticated } from "../../domain/errors/index";
export class HttpSession {
  constructor(
    private readonly identity: IdentityService,
    private readonly security: SecurityControls,
    private readonly origin: string,
    private readonly csrfKey: Buffer,
  ) {
    if (csrfKey.length !== 32) throw new Error("Invalid CSRF key");
  }
  private signature(value: string): string {
    return createHmac("sha256", this.csrfKey).update(value).digest("base64url");
  }
  private csrf(family: string | null): { csrfToken: string; expiresAt: string } {
    const expires = Date.now() + 600000,
      value = Buffer.from(
        JSON.stringify({
          nonce: randomBytes(32).toString("base64url"),
          family: family ?? "anonymous",
          expires,
        }),
      ).toString("base64url");
    return {
      csrfToken: value + "." + this.signature(value),
      expiresAt: new Date(expires).toISOString(),
    };
  }
  private writeCsrf(reply: FastifyReply, family: string | null) {
    const value = this.csrf(family);
    reply.setCookie("__Host-csrf", value.csrfToken, {
      secure: true,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return value;
  }
  async csrfResponse(request: FastifyRequest, reply: FastifyReply) {
    return this.writeCsrf(reply, await this.identity.csrfFamily(request.cookies["__Host-refresh"]));
  }
  async checkUnsafe(
    request: FastifyRequest,
    context: "live" | "logout" | "anonymous" = "live",
  ): Promise<void> {
    const reject = () => forbidden();
    if (request.headers.origin !== this.origin) throw reject();
    const token = request.headers["x-csrf-token"],
      cookie = request.cookies["__Host-csrf"];
    if (typeof token !== "string" || !cookie || cookie.length > 1024 || token !== cookie)
      throw reject();
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw reject();
    const signature = this.signature(parts[0]),
      got = Buffer.from(parts[1]);
    if (got.length !== signature.length || !timingSafeEqual(got, Buffer.from(signature)))
      throw reject();
    let data: { family: string; expires: number };
    try {
      data = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as typeof data;
    } catch {
      throw reject();
    }
    if (
      !Number.isSafeInteger(data.expires) ||
      data.expires <= Date.now() ||
      data.expires > Date.now() + 600000
    )
      throw reject();
    let family = await this.identity.csrfFamily(request.cookies["__Host-refresh"]);
    if (!family && request.cookies["__Host-access"]) {
      try {
        family = (await this.identity.authenticate(request.cookies["__Host-access"])).familyId;
      } catch (e) {
        if (!(e instanceof DomainError)) throw e;
      }
    }
    if (context === "anonymous" && family) throw reject();
    if (data.family === (family ?? "anonymous")) return;
    // A lost logout ACK leaves the revoked cookie in the browser. Fresh anonymous
    // CSRF is valid without a live family; the original family-bound nonce can also
    // acknowledge that same logout, but cannot authorize another live mutation.
    if (context === "logout" && !family && data.family !== "anonymous") {
      const revokedFamily = await this.identity.csrfFamily(request.cookies["__Host-refresh"], true);
      if (revokedFamily && data.family === revokedFamily) return;
    }
    throw reject();
  }
  async admit(request: FastifyRequest, kind: "read" | "write", actor?: string): Promise<void> {
    // IP is the socket peer unless an explicit trusted proxy is configured at the root.
    const interval = actor ? (kind === "read" ? 100 : 200) : 5,
      burst = actor ? (kind === "read" ? 30 : 20) : 2000;
    if (
      !(await this.security.allow(
        actor ? `actor.${kind}` : "public.admission",
        actor ?? request.ip,
        interval,
        burst,
      ))
    )
      throw rateLimited();
  }
  async registerAdmission(request: FastifyRequest): Promise<void> {
    if (!(await this.security.allow("register.ip", request.ip, 360000, 10))) throw rateLimited();
  }
  access(request: FastifyRequest): string {
    const raw = request.cookies["__Host-access"];
    if (!raw) throw unauthenticated();
    return raw;
  }
  refresh(request: FastifyRequest): string {
    const raw = request.cookies["__Host-refresh"];
    if (!raw) throw unauthenticated();
    return raw;
  }
  optionalRefresh(request: FastifyRequest): string | undefined {
    return request.cookies["__Host-refresh"];
  }
  session(reply: FastifyReply, t: IssuedTokens) {
    const now = Date.now();
    for (const [name, value, expiry] of [
      ["__Host-access", t.access, t.accessExpiresAt],
      ["__Host-refresh", t.refresh, t.refreshExpiresAt],
    ] as const)
      reply.setCookie(name, value, {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: Math.max(0, Math.floor((expiry - now) / 1000)),
      });
    this.writeCsrf(reply, t.familyId);
    return {
      userId: t.userId,
      accessExpiresAt: new Date(t.accessExpiresAt).toISOString(),
      refreshExpiresAt: new Date(t.refreshExpiresAt).toISOString(),
      absoluteExpiresAt: new Date(t.absoluteExpiresAt).toISOString(),
    };
  }
  clear(reply: FastifyReply): void {
    for (const name of ["__Host-access", "__Host-refresh", "__Host-csrf"])
      reply.clearCookie(name, {
        secure: true,
        httpOnly: name !== "__Host-csrf",
        sameSite: "lax",
        path: "/",
      });
  }
}
