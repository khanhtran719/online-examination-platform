import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  CompactEncrypt,
  compactDecrypt,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
  CryptoKey,
} from "jose";
import * as argon2 from "argon2";
import {
  IssuedTokens,
  Passwords,
  SessionTokens,
  TokenClaims,
  VerificationSecrets,
} from "../../application/ports/identity-crypto.ports";
import { AdmissionSaturatedError } from "../../application/errors/admission-saturated.error";
import { unauthenticated } from "../../domain/errors/index";

export interface SigningKey {
  kid: string;
  privatePem: string;
  publicPem: string;
}
export interface PublicKey {
  kid: string;
  publicPem: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest = (value: string) => createHash("sha256").update(value).digest();
const audience = (purpose: string) =>
  purpose === "access" ? "urn:online-exam:api:v1" : "urn:online-exam:refresh:v1";
export class JwtSessionTokens implements SessionTokens {
  private constructor(
    private readonly issuer: string,
    private readonly kid: string,
    private readonly signing: CryptoKey,
    private readonly ring: Map<string, CryptoKey>,
  ) {}
  static async create(
    issuer: string,
    active: SigningKey,
    publicKeys: PublicKey[],
  ): Promise<JwtSessionTokens> {
    if (!/^urn:[A-Za-z0-9:._-]{3,150}$/.test(issuer) || publicKeys.length > 8 || !publicKeys.length)
      throw new Error("Invalid JWT configuration");
    const privateKey = createPrivateKey(active.privatePem);
    const publicKey = createPublicKey(active.publicPem);
    const derived = createPublicKey(privateKey).export({ type: "spki", format: "der" });
    if (
      privateKey.asymmetricKeyType !== "ec" ||
      privateKey.asymmetricKeyDetails?.namedCurve !== "prime256v1" ||
      !derived.equals(publicKey.export({ type: "spki", format: "der" }))
    )
      throw new Error("Invalid signing pair");
    const ring = new Map<string, CryptoKey>();
    for (const key of publicKeys) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(key.kid) || ring.has(key.kid))
        throw new Error("Invalid keyring");
      const parsed = createPublicKey(key.publicPem);
      if (
        parsed.asymmetricKeyType !== "ec" ||
        parsed.asymmetricKeyDetails?.namedCurve !== "prime256v1"
      )
        throw new Error("Invalid public key");
      if (key.kid === active.kid && !derived.equals(parsed.export({ type: "spki", format: "der" })))
        throw new Error("Signing key mismatch");
      ring.set(key.kid, await importSPKI(key.publicPem, "ES256"));
    }
    if (!ring.has(active.kid)) throw new Error("Active key absent from ring");
    return new JwtSessionTokens(
      issuer,
      active.kid,
      await importPKCS8(active.privatePem, "ES256"),
      ring,
    );
  }
  hash(value: string): Uint8Array {
    return digest(value);
  }
  async issue(input: {
    userId: string;
    sessionId: string;
    familyId: string;
    now: number;
    absoluteExpiresAt: number;
  }): Promise<IssuedTokens> {
    const accessExpiresAt = Math.min(
      Math.floor(input.now / 1000) * 1000 + 300000,
      input.absoluteExpiresAt,
    );
    const refreshExpiresAt = Math.min(
      Math.floor(input.now / 1000) * 1000 + 7 * 86400000,
      input.absoluteExpiresAt,
    );
    const accessJti = randomUUID(),
      refreshJti = randomUUID();
    const sign = (purpose: "access" | "refresh", jti: string, expires: number) =>
      new SignJWT({ sid: input.sessionId, fid: input.familyId, token_use: purpose })
        .setProtectedHeader({ alg: "ES256", kid: this.kid, typ: `exam-${purpose}+jwt` })
        .setIssuer(this.issuer)
        .setAudience(audience(purpose))
        .setSubject(input.userId)
        .setJti(jti)
        .setIssuedAt(Math.floor(input.now / 1000))
        .setNotBefore(Math.floor(input.now / 1000))
        .setExpirationTime(Math.floor(expires / 1000))
        .sign(this.signing);
    const [access, refresh] = await Promise.all([
      sign("access", accessJti, accessExpiresAt),
      sign("refresh", refreshJti, refreshExpiresAt),
    ]);
    return {
      ...input,
      access,
      refresh,
      accessExpiresAt,
      refreshExpiresAt,
      accessJti,
      refreshJti,
      kid: this.kid,
      accessHash: digest(access),
      refreshHash: digest(refresh),
    };
  }
  async verify(token: string, purpose: "access" | "refresh"): Promise<TokenClaims> {
    try {
      if (token.length > 2048 || token.length < 100) throw unauthenticated();
      const result = await jwtVerify(
        token,
        (header) => {
          if (
            header.alg !== "ES256" ||
            header.typ !== `exam-${purpose}+jwt` ||
            typeof header.kid !== "string" ||
            Object.keys(header).some((k) => !["alg", "kid", "typ"].includes(k))
          )
            throw unauthenticated();
          const key = this.ring.get(header.kid);
          if (!key) throw unauthenticated();
          return key;
        },
        {
          algorithms: ["ES256"],
          issuer: this.issuer,
          audience: audience(purpose),
          clockTolerance: 30,
          requiredClaims: [
            "iss",
            "aud",
            "sub",
            "jti",
            "sid",
            "fid",
            "iat",
            "nbf",
            "exp",
            "token_use",
          ],
        },
      );
      const p = result.payload;
      if (
        p.token_use !== purpose ||
        p.aud !== audience(purpose) ||
        p.nbf !== p.iat ||
        ![p.sub, p.jti, p.sid, p.fid].every((v) => typeof v === "string" && uuid.test(v)) ||
        ![p.iat, p.nbf, p.exp].every(Number.isInteger) ||
        (p.iat as number) > Date.now() / 1000 + 30 ||
        (p.exp as number) <= (p.iat as number) ||
        (p.exp as number) - (p.iat as number) > (purpose === "access" ? 300 : 7 * 86400)
      )
        throw unauthenticated();
      return {
        userId: p.sub as string,
        sessionId: p.sid as string,
        familyId: p.fid as string,
        jti: p.jti as string,
        kid: result.protectedHeader.kid!,
      };
    } catch {
      throw unauthenticated();
    }
  }
}
export class VerificationCodec implements VerificationSecrets {
  constructor(
    private readonly kid: string,
    private readonly keys: Record<string, Buffer>,
  ) {
    if (
      !keys[kid] ||
      Object.keys(keys).length > 8 ||
      Object.entries(keys).some(
        ([id, key]) => !/^[A-Za-z0-9_-]{1,64}$/.test(id) || key.length !== 32,
      )
    )
      throw new Error("Invalid email encryption keyring");
  }
  id(): string {
    return randomUUID();
  }
  newToken(): string {
    return randomBytes(32).toString("base64url");
  }
  hash(value: string): Uint8Array {
    return digest(value);
  }
  async seal(input: { challengeId: string; token: string }): Promise<string> {
    return new CompactEncrypt(Buffer.from(JSON.stringify(input)))
      .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: this.kid })
      .encrypt(this.keys[this.kid]!);
  }
  async open(ciphertext: string, challengeId: string): Promise<string> {
    const result = await compactDecrypt(ciphertext, (header) => {
      if (
        header.alg !== "dir" ||
        header.enc !== "A256GCM" ||
        typeof header.kid !== "string" ||
        Object.keys(header).some((k) => !["alg", "enc", "kid"].includes(k))
      )
        throw new Error("Invalid delivery material");
      const key = this.keys[header.kid];
      if (!key) throw new Error("Unknown email key");
      return key;
    });
    const p = JSON.parse(Buffer.from(result.plaintext).toString()) as {
      challengeId: string;
      token: string;
    };
    if (p.challengeId !== challengeId || !/^[A-Za-z0-9_-]{43}$/.test(p.token))
      throw new Error("Invalid delivery context");
    return p.token;
  }
}
export class ArgonPasswords implements Passwords {
  private active = 0;
  private readonly waiting: Array<{
    resolve: () => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];
  constructor(
    private readonly concurrency = 2,
    private readonly maxQueued = 8,
  ) {
    if (
      !Number.isInteger(concurrency) ||
      concurrency < 1 ||
      concurrency > 8 ||
      !Number.isInteger(maxQueued) ||
      maxQueued < 0 ||
      maxQueued > 32
    )
      throw new Error("Invalid password admission limits");
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      if (this.waiting.length >= this.maxQueued) throw new AdmissionSaturatedError();
      await new Promise<void>((resolve, reject) => {
        const entry = {
          resolve,
          reject,
          timer: setTimeout(() => {
            const index = this.waiting.indexOf(entry);
            if (index >= 0) this.waiting.splice(index, 1);
            reject(new AdmissionSaturatedError());
          }, 500),
        };
        this.waiting.push(entry);
      });
    } else this.active++;
    try {
      return await work();
    } finally {
      const next = this.waiting.shift();
      if (next) {
        clearTimeout(next.timer);
        next.resolve();
      } else this.active--;
    }
  }
  hash(password: string): Promise<string> {
    return this.run(() =>
      argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
    );
  }
  verify(hash: string, password: string): Promise<boolean> {
    return this.run(() => argon2.verify(hash, password));
  }
}
