import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { JwtSessionTokens, VerificationCodec, ArgonPasswords } from "../identity-crypto";
import { importPKCS8, SignJWT } from "jose";

function pair() {
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    kid: "test-key",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}
describe("real Identity crypto adapters", () => {
  it("signs with private key, verifies with public ring and rejects cross-purpose/tampering/wrong key", async () => {
    const keys = pair();
    const tokens = await JwtSessionTokens.create("urn:test:identity", keys, [keys]);
    const value = await tokens.issue({
      userId: randomUUID(),
      sessionId: randomUUID(),
      familyId: randomUUID(),
      now: Date.now(),
      absoluteExpiresAt: Date.now() + 30 * 86400000,
    });
    expect((await tokens.verify(value.access, "access")).userId).toBe(value.userId);
    await expect(tokens.verify(value.refresh, "access")).rejects.toThrow("Unauthenticated");
    await expect(tokens.verify(value.access, "refresh")).rejects.toThrow("Unauthenticated");
    await expect(tokens.verify(value.access + "x", "access")).rejects.toThrow("Unauthenticated");
    const otherKeys = pair();
    const other = await JwtSessionTokens.create("urn:test:identity", otherKeys, [otherKeys]);
    await expect(other.verify(value.access, "access")).rejects.toThrow("Unauthenticated");
  });
  it("validates the signing pair and binds encrypted delivery material to its challenge", async () => {
    const keys = pair();
    await expect(
      JwtSessionTokens.create("urn:test:identity", { ...keys, publicPem: pair().publicPem }, [
        keys,
      ]),
    ).rejects.toThrow();
    const codec = new VerificationCodec("mail-1", { "mail-1": randomBytes(32) });
    const token = codec.newToken();
    const id = randomUUID();
    const ciphertext = await codec.seal({ challengeId: id, token });
    expect(ciphertext).not.toContain(token);
    expect(await codec.open(ciphertext, id)).toBe(token);
    await expect(codec.open(ciphertext, randomUUID())).rejects.toThrow();
  });
  it("stores unique Argon2id salted hashes with bounded native hashing", async () => {
    const passwords = new ArgonPasswords(1, 1);
    const hash = await passwords.hash("a safe fixture password");
    const parts = hash.split("$");
    expect(parts.slice(1, 3)).toEqual(["argon2id", "v=19"]);
    expect(parts[3]!.split(",").sort()).toEqual(["m=19456", "p=1", "t=2"]);
    expect(await passwords.verify(hash, "a safe fixture password")).toBe(true);
    expect(await passwords.verify(hash, "a different password")).toBe(false);
    expect(await passwords.hash("a safe fixture password")).not.toBe(hash);
  });
  it("supports public overlap and fails closed after removing an old signing key", async () => {
    const old = pair(),
      fresh = { ...pair(), kid: "next-key" };
    const before = await JwtSessionTokens.create("urn:test:identity", old, [old]);
    const input = {
      userId: randomUUID(),
      sessionId: randomUUID(),
      familyId: randomUUID(),
      now: Date.now(),
      absoluteExpiresAt: Date.now() + 30 * 86400000,
    };
    const issued = await before.issue(input),
      overlap = await JwtSessionTokens.create("urn:test:identity", fresh, [old, fresh]);
    expect((await overlap.verify(issued.refresh, "refresh")).userId).toBe(input.userId);
    const denied = await JwtSessionTokens.create("urn:test:identity", fresh, [fresh]);
    await expect(denied.verify(issued.access, "access")).rejects.toThrow("Unauthenticated");
  });
  it("rejects signed but invalid claims and untrusted header key sources", async () => {
    const keys = pair(),
      tokens = await JwtSessionTokens.create("urn:test:identity", keys, [keys]),
      privateKey = await importPKCS8(keys.privatePem, "ES256"),
      now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: "urn:test:identity",
      aud: "urn:online-exam:api:v1",
      sub: randomUUID(),
      jti: randomUUID(),
      sid: randomUUID(),
      fid: randomUUID(),
      iat: now,
      nbf: now,
      exp: now + 300,
      token_use: "access",
    };
    for (const delta of [
      { iss: "urn:other" },
      { aud: "wrong" },
      { aud: ["urn:online-exam:api:v1", "urn:online-exam:refresh:v1"] },
      { nbf: now - 60 },
      { iat: now + 60 },
      { sid: "invalid" },
      { jti: null },
      { nbf: now + 120 },
      { exp: now - 60 },
      { token_use: "refresh" },
    ]) {
      const token = await new SignJWT({ ...claims, ...delta })
        .setProtectedHeader({ alg: "ES256", typ: "exam-access+jwt", kid: keys.kid })
        .sign(privateKey);
      await expect(tokens.verify(token, "access")).rejects.toThrow("Unauthenticated");
    }
    const token = await new SignJWT(claims)
      .setProtectedHeader({
        alg: "ES256",
        typ: "exam-access+jwt",
        kid: keys.kid,
        jku: "https://attacker.example.test/jwks",
      })
      .sign(privateKey);
    await expect(tokens.verify(token, "access")).rejects.toThrow("Unauthenticated");
  });
});
