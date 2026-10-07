import { createRequire } from "node:module";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
const require = createRequire(import.meta.url);
export const {
  PostgresDatabase,
  DatabaseError,
  TransactionRollbackOnlyError,
} = require("../../dist/infrastructure/database/transaction/postgres-database.js");
export const { databaseConfig } = require("../../dist/config/database.config.js");
export const {
  loadMigrations,
  migrate,
} = require("../../dist/infrastructure/database/migration-runner.js");
export const {
  IdentityService,
} = require("../../dist/modules/identity/application/services/identity.service.js");
export const {
  PostgresIdentityRepository,
} = require("../../dist/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository.js");
export const {
  PostgresIdentityQuery,
} = require("../../dist/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query.js");
export const {
  PostgresSecurity,
} = require("../../dist/infrastructure/security/authorization/postgres-security.js");
export const {
  PostgresIdempotency,
} = require("../../dist/infrastructure/idempotency/postgres-idempotency.js");
export const {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} = require("../../dist/modules/identity/infrastructure/security/identity-crypto.js");

export function freshKey() {
  const time = Date.now().toString(16).padStart(12, "0"),
    random = randomUUID();
  return `${time.slice(0, 8)}-${time.slice(8)}-7${random.slice(15)}`;
}

export async function cryptoFixture() {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "orm-evaluation",
    privatePem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const passwords = new ArgonPasswords(2, 8);
  return {
    passwords,
    dummy: await passwords.hash("synthetic fixture password"),
    tokens: await JwtSessionTokens.create("urn:local:orm-evaluation", key, [key]),
    codec: new VerificationCodec("evaluation", { evaluation: randomBytes(32) }),
    rateKey: randomBytes(32),
  };
}
export function identityFixture(db, crypto, mapped = false, securityOverride) {
  const repo = new PostgresIdentityRepository(db);
  if (mapped && db.accountByEmail) {
    repo.accountByEmail = (email) => db.accountByEmail(email);
    repo.lockAccount = (id) => db.lockAccount(id);
    repo.updateProfile = (id, displayName, optIn) => db.updateProfile(id, displayName, optIn);
  }
  const security = securityOverride ?? new PostgresSecurity(db, crypto.rateKey);
  return {
    repo,
    security,
    identity: new IdentityService(
      repo,
      db,
      crypto.passwords,
      crypto.tokens,
      crypto.codec,
      crypto.dummy,
      security,
      new PostgresIdempotency(db),
      new PostgresIdentityQuery(db),
    ),
  };
}
