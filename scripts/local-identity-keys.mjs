import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
if (process.env.NODE_ENV === "production") throw new Error("Local key generator only");
await mkdir(".local/identity", { recursive: true, mode: 0o700 });
const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" }),
  kid = "local-1";
const files = {
  "signing.pem": pair.privateKey.export({ type: "pkcs8", format: "pem" }),
  "public-keys.json": JSON.stringify([
    { kid, publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString() },
  ]),
  "email-keys.json": JSON.stringify({
    activeKid: "mail-local-1",
    keys: { "mail-local-1": randomBytes(32).toString("base64url") },
  }),
  "csrf.key": randomBytes(32).toString("base64url"),
  "leaderboard.key": randomBytes(32).toString("base64url"),
  "rate.key": randomBytes(32).toString("base64url"),
};
// Exclusive creation: rerunning cannot silently replace an identity or erase live mail key access.
for (const [name, value] of Object.entries(files))
  await writeFile(`.local/identity/${name}`, value, { mode: 0o600, flag: "wx" });
process.stdout.write("Local Identity key files created with mode600; no key material printed.\n");
