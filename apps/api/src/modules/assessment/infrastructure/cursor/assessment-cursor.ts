import { createHmac, timingSafeEqual } from "node:crypto";
import { invalidRequest } from "../../domain/assessment.error";
import {
  AssessmentCursor,
  AssessmentCursorClaims,
} from "../../application/ports/assessment-cursor.port";

interface CursorBody extends AssessmentCursorClaims {
  watermark: string;
  position: string[];
  expires: number;
}

export class HmacAssessmentCursor implements AssessmentCursor {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error("Invalid cursor key");
  }

  sign(
    claims: AssessmentCursorClaims,
    watermark: string,
    position: string[],
    expiresAt: number,
  ): string {
    const body = Buffer.from(
      JSON.stringify({ ...claims, watermark, position, expires: expiresAt }),
    ).toString("base64url");
    const mac = createHmac("sha256", this.key)
      .update(`assessment.cursor.v1\0${body}`)
      .digest("base64url");
    return `${body}.${mac}`;
  }

  read(
    token: string,
    claims: AssessmentCursorClaims,
    now: number,
  ): { watermark: string; position: string[] } {
    if (token.length > 2048) throw invalidRequest();
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalidRequest();
    const expected = createHmac("sha256", this.key)
      .update(`assessment.cursor.v1\0${parts[0]}`)
      .digest();
    let got: Buffer;
    try {
      got = Buffer.from(parts[1], "base64url");
    } catch {
      throw invalidRequest();
    }
    if (got.length !== expected.length || !timingSafeEqual(got, expected)) throw invalidRequest();
    let data: CursorBody;
    try {
      data = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as CursorBody;
    } catch {
      throw invalidRequest();
    }
    if (
      data.kind !== claims.kind ||
      data.actorId !== claims.actorId ||
      data.pageSize !== claims.pageSize ||
      data.filter !== claims.filter ||
      typeof data.watermark !== "string" ||
      !Array.isArray(data.position) ||
      data.position.some((part) => typeof part !== "string") ||
      !Number.isSafeInteger(data.expires) ||
      data.expires < now
    ) {
      throw invalidRequest();
    }
    return { watermark: data.watermark, position: data.position };
  }
}
