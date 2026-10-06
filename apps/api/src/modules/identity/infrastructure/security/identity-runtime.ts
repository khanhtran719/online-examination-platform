import { VerificationSecrets } from "../../application/ports/identity-crypto.ports";
import {
  ArgonPasswords,
  JwtSessionTokens,
  PublicKey,
  SigningKey,
  VerificationCodec,
} from "./identity-crypto";

export function createVerificationSecrets(
  activeKid: string,
  keys: Record<string, Buffer>,
): VerificationCodec {
  return new VerificationCodec(activeKid, keys);
}

export async function createSessionCredentials(
  emailSecrets: VerificationSecrets,
  input: {
    issuer: string;
    active: SigningKey;
    publicKeys: PublicKey[];
    passwordConcurrency: number;
    passwordMaxQueued: number;
  },
): Promise<{ tokens: JwtSessionTokens; passwords: ArgonPasswords; dummyHash: string }> {
  const tokens = await JwtSessionTokens.create(input.issuer, input.active, input.publicKeys);
  const passwords = new ArgonPasswords(input.passwordConcurrency, input.passwordMaxQueued);
  const dummyHash = await passwords.hash("Startup-only random dummy " + emailSecrets.newToken());
  return { tokens, passwords, dummyHash };
}
