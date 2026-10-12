import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

import type {
  AuditCursor,
  AuditCursorClaims,
  AuditCursorState,
} from "../../application/ports/audit-cursor.port";
import { invalidReport } from "../../domain/reporting.error";

const aad = Buffer.from("online-exam.reporting.audit.occurredAt.desc-id.desc.cursor.v1");
/** Derived from the existing CSRF root with a distinct purpose; never ranking alias material. */
export class AuditCrypto implements AuditCursor {
  private readonly key: Buffer;
  constructor(root: Buffer) {
    if (root.length !== 32) throw new Error("Invalid cursor key");
    this.key = createHmac("sha256", root).update(aad).digest();
  }
  sign(claims: AuditCursorClaims, state: AuditCursorState): string {
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, nonce);
    cipher.setAAD(aad);
    const payload = Buffer.concat([
      cipher.update(JSON.stringify({ ...claims, ...state }), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), payload]).toString("base64url");
  }
  read(token: string, claims: AuditCursorClaims, now: number): AuditCursorState {
    try {
      if (token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalidReport();
      const packed = Buffer.from(token, "base64url");
      if (packed.length < 29 || packed.toString("base64url") !== token) throw invalidReport();
      const cipher = createDecipheriv("aes-256-gcm", this.key, packed.subarray(0, 12));
      cipher.setAAD(aad);
      cipher.setAuthTag(packed.subarray(12, 28));
      const data = JSON.parse(
        Buffer.concat([cipher.update(packed.subarray(28)), cipher.final()]).toString(),
      ) as AuditCursorState & AuditCursorClaims;
      if (
        !data ||
        data.actorId !== claims.actorId ||
        data.pageSize !== claims.pageSize ||
        typeof data.watermark !== "string" ||
        !Array.isArray(data.position) ||
        data.position.length !== 2 ||
        data.position.some((v) => typeof v !== "string") ||
        !Number.isSafeInteger(data.expiresAt) ||
        data.expiresAt <= now
      )
        throw invalidReport();
      return { watermark: data.watermark, position: data.position, expiresAt: data.expiresAt };
    } catch {
      throw invalidReport();
    }
  }
}
