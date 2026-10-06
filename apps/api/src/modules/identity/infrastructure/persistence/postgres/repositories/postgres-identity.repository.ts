import { PostgresDatabase } from "../../../../../../infrastructure/database/transaction/postgres-database";
import {
  Account,
  Challenge,
  Family,
  SessionLookup,
  SessionRecord,
  PersistedSession,
} from "../../../../domain/entities/identity-state";
import { IdentityRepository } from "../../../../domain/repositories/identity.repository";
const accountColumns = `id,email,password_hash AS "passwordHash",display_name AS "displayName",enabled,
 extract(epoch FROM email_verified_at)*1000::float8 AS "emailVerifiedAt",credential_version AS "credentialVersion",revision,
 leaderboard_opt_in AS "leaderboardOptIn",extract(epoch FROM created_at)*1000::float8 AS "createdAt"`;
const challengeColumns = `id,user_id AS "userId",email,extract(epoch FROM expires_at)*1000::float8 AS "expiresAt",consumed_at IS NOT NULL AS consumed,cancelled_at IS NOT NULL AS cancelled,ciphertext`;
export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private readonly db: PostgresDatabase) {}
  async now(): Promise<number> {
    return (
      await this.db.query<{ now: number }>(
        "identity.read",
        "SELECT extract(epoch FROM clock_timestamp())*1000::float8 AS now",
      )
    ).rows[0]!.now;
  }
  async accountByEmail(email: string): Promise<Account | null> {
    return (
      (
        await this.db.query<Account>(
          "identity.read",
          `SELECT ${accountColumns} FROM identity.users WHERE email=$1`,
          [email],
        )
      ).rows[0] ?? null
    );
  }
  async lockAccount(id: string): Promise<Account | null> {
    return (
      (
        await this.db.query<Account>(
          "lock.acquire",
          `SELECT ${accountColumns} FROM identity.users WHERE id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0] ?? null
    );
  }
  async createAccount(input: {
    id: string;
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<boolean> {
    const r = await this.db.query(
      "identity.write",
      "INSERT INTO identity.users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id",
      [input.id, input.email, input.displayName, input.passwordHash],
    );
    if (r.rowCount)
      await this.db.query("identity.write", "SELECT identity.assign_candidate($1)", [input.id]);
    return Boolean(r.rowCount);
  }
  async challengeByHash(hash: Uint8Array): Promise<Challenge | null> {
    return (
      (
        await this.db.query<Challenge>(
          "identity.read",
          `SELECT ${challengeColumns} FROM identity.verification_challenges WHERE token_hash=$1 AND purpose='VERIFY_EMAIL'`,
          [Buffer.from(hash)],
        )
      ).rows[0] ?? null
    );
  }
  async lockChallenge(id: string): Promise<Challenge | null> {
    return (
      (
        await this.db.query<Challenge>(
          "lock.acquire",
          `SELECT ${challengeColumns} FROM identity.verification_challenges WHERE id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0] ?? null
    );
  }
  async activeChallenge(userId: string, now: number): Promise<Challenge | null> {
    return (
      (
        await this.db.query<Challenge>(
          "identity.read",
          `SELECT ${challengeColumns} FROM identity.verification_challenges WHERE user_id=$1 AND consumed_at IS NULL AND cancelled_at IS NULL AND expires_at>$2 ORDER BY created_at DESC LIMIT 1`,
          [userId, new Date(now)],
        )
      ).rows[0] ?? null
    );
  }
  async canSend(userId: string, now: number): Promise<boolean> {
    const r = await this.db.query<{ allowed: boolean }>(
      "identity.read",
      `SELECT count(*)<5 AND coalesce(max(i.created_at)<$2::timestamptz-interval '60 seconds',true) AS allowed FROM identity.email_intents i JOIN identity.verification_challenges c ON c.id=i.challenge_id WHERE c.user_id=$1 AND i.created_at>$2::timestamptz-interval '1 hour'`,
      [userId, new Date(now)],
    );
    return r.rows[0]!.allowed;
  }
  async createChallenge(input: {
    id: string;
    userId: string;
    email: string;
    hash: Uint8Array;
    ciphertext: string;
    expiresAt: number;
  }): Promise<void> {
    await this.db.query(
      "identity.write",
      "INSERT INTO identity.verification_challenges(id,user_id,email,token_hash,ciphertext,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        input.id,
        input.userId,
        input.email,
        Buffer.from(input.hash),
        input.ciphertext,
        new Date(input.expiresAt),
      ],
    );
  }
  async enqueueEmail(id: string, challengeId: string): Promise<void> {
    await this.db.query(
      "identity.write",
      "INSERT INTO identity.email_intents(id,challenge_id) VALUES($1,$2)",
      [id, challengeId],
    );
  }
  async activate(userId: string, challengeId: string, passwordHash: string): Promise<void> {
    await this.db.query(
      "identity.write",
      "UPDATE identity.users SET email_verified_at=clock_timestamp(),password_hash=$2,credential_version=credential_version+1,revision=revision+1 WHERE id=$1",
      [userId, passwordHash],
    );
    await this.db.query(
      "identity.write",
      "UPDATE identity.verification_challenges SET consumed_at=CASE WHEN id=$2 THEN clock_timestamp() ELSE NULL END,cancelled_at=CASE WHEN id<>$2 THEN clock_timestamp() ELSE NULL END,ciphertext=NULL WHERE user_id=$1 AND consumed_at IS NULL AND cancelled_at IS NULL",
      [userId, challengeId],
    );
    await this.db.query(
      "identity.write",
      "UPDATE identity.email_intents SET cancelled_at=clock_timestamp() WHERE challenge_id IN (SELECT id FROM identity.verification_challenges WHERE user_id=$1) AND delivered_at IS NULL",
      [userId],
    );
    await this.db.query(
      "identity.write",
      "UPDATE identity.session_families SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE user_id=$1",
      [userId],
    );
  }
  async createFamily(id: string, userId: string, absoluteExpiresAt: number): Promise<void> {
    await this.db.query(
      "identity.write",
      "INSERT INTO identity.session_families(id,user_id,absolute_expires_at) VALUES($1,$2,$3)",
      [id, userId, new Date(absoluteExpiresAt)],
    );
  }
  async lockFamily(id: string): Promise<Family | null> {
    return (
      (
        await this.db.query<Family>(
          "lock.acquire",
          `SELECT id,user_id AS "userId",extract(epoch FROM absolute_expires_at)*1000::float8 AS "absoluteExpiresAt",revoked_at IS NOT NULL AS revoked FROM identity.session_families WHERE id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0] ?? null
    );
  }
  async session(
    claims: SessionLookup,
    hash: Uint8Array,
    purpose: "access" | "refresh",
  ): Promise<SessionRecord | null> {
    // Column names come from a closed purpose union, never caller SQL.
    return (
      (
        await this.db.query<SessionRecord>(
          "identity.read",
          `SELECT s.id,s.family_id AS "familyId",s.consumed_at IS NOT NULL AS consumed,extract(epoch FROM s.refresh_expires_at)*1000::float8 AS "refreshExpiresAt",extract(epoch FROM s.access_expires_at)*1000::float8 AS "accessExpiresAt" FROM identity.sessions s JOIN identity.session_families f ON f.id=s.family_id WHERE s.id=$1 AND s.family_id=$2 AND f.user_id=$3 AND s.${purpose}_hash=$4 AND s.${purpose}_jti=$5 AND s.signing_kid=$6`,
          [
            claims.sessionId,
            claims.familyId,
            claims.userId,
            Buffer.from(hash),
            claims.jti,
            claims.kid,
          ],
        )
      ).rows[0] ?? null
    );
  }
  async saveSession(t: PersistedSession): Promise<void> {
    await this.db.query(
      "identity.write",
      "INSERT INTO identity.sessions(id,family_id,access_hash,refresh_hash,access_expires_at,refresh_expires_at,signing_kid,access_jti,refresh_jti) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        t.sessionId,
        t.familyId,
        Buffer.from(t.accessHash),
        Buffer.from(t.refreshHash),
        new Date(t.accessExpiresAt),
        new Date(t.refreshExpiresAt),
        t.kid,
        t.accessJti,
        t.refreshJti,
      ],
    );
  }
  async consumeSession(id: string): Promise<void> {
    await this.db.query(
      "identity.write",
      "UPDATE identity.sessions SET consumed_at=clock_timestamp() WHERE id=$1",
      [id],
    );
  }
  async revokeFamily(id: string): Promise<void> {
    await this.db.query(
      "identity.write",
      "UPDATE identity.session_families SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE id=$1",
      [id],
    );
  }
  async updateProfile(id: string, displayName: string, optIn: boolean): Promise<number> {
    return (
      await this.db.query<{ revision: number }>(
        "identity.write",
        "UPDATE identity.users SET display_name=$2,leaderboard_opt_in=$3,revision=revision+1 WHERE id=$1 RETURNING revision",
        [id, displayName, optIn],
      )
    ).rows[0]!.revision;
  }
}
