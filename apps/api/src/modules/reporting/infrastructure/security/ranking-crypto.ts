import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import {
  RankingAlias,
  RankingCursor,
  RankingCursorClaims,
  RankingCursorState,
} from "../../application/ports/ranking-cursor.port";
import { invalidRanking } from "../../domain/ranking.error";
const aad = Buffer.from("online-exam.ranking.cursor.v1");
export class RankingCrypto implements RankingCursor, RankingAlias {
  private readonly cursorKey: Buffer;
  private readonly aliasKey: Buffer;
  constructor(key: Buffer) {
    if (key.length !== 32) throw new Error("Invalid ranking key");
    this.cursorKey = createHmac("sha256", key).update("ranking.cursor.key.v1").digest();
    this.aliasKey = createHmac("sha256", key).update("ranking.alias.key.v1").digest();
  }
  alias(versionId: string, userId: string): string {
    return (
      "candidate-" +
      createHmac("sha256", this.aliasKey)
        .update(JSON.stringify([versionId, userId]))
        .digest("hex")
        .slice(0, 24)
    );
  }
  sign(claims: RankingCursorClaims, state: RankingCursorState): string {
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.cursorKey, nonce);
    cipher.setAAD(aad);
    const payload = Buffer.concat([
      cipher.update(JSON.stringify({ ...claims, ...state }), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), payload]).toString("base64url");
  }
  read(token: string, claims: RankingCursorClaims, now: number): RankingCursorState {
    try {
      if (token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalidRanking();
      const packed = Buffer.from(token, "base64url");
      if (packed.length < 29 || packed.toString("base64url") !== token) throw invalidRanking();
      const cipher = createDecipheriv("aes-256-gcm", this.cursorKey, packed.subarray(0, 12));
      cipher.setAAD(aad);
      cipher.setAuthTag(packed.subarray(12, 28));
      const data = JSON.parse(
        Buffer.concat([cipher.update(packed.subarray(28)), cipher.final()]).toString(),
      ) as RankingCursorClaims & RankingCursorState;
      if (
        !data ||
        data.actorId !== claims.actorId ||
        data.examId !== claims.examId ||
        data.versionId !== claims.versionId ||
        data.pageSize !== claims.pageSize ||
        typeof data.watermark !== "string" ||
        typeof data.epoch !== "string" ||
        !Array.isArray(data.position) ||
        data.position.length !== 3 ||
        data.position.some((p) => typeof p !== "string") ||
        !Number.isSafeInteger(data.expiresAt) ||
        data.expiresAt <= now
      )
        throw invalidRanking();
      return {
        watermark: data.watermark,
        epoch: data.epoch,
        position: data.position,
        expiresAt: data.expiresAt,
      };
    } catch {
      throw invalidRanking();
    }
  }
}
