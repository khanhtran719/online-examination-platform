import { UnitOfWork } from "../../../../shared/application/unit-of-work/unit-of-work.port";
import { SecurityControls } from "../../../../shared/application/ports/security";
import { IdempotencyStore } from "../../../../shared/application/ports/idempotency";
import {
  IdempotencyConflictError,
  RevisionConflictError,
  forbidden,
  invalidRequest,
  rateLimited,
  unauthenticated,
} from "../../domain/errors/index";
import { DomainError } from "../../../../shared/domain/exceptions/domain-error";
import { ErrorCategory } from "../../../../shared/domain/exceptions/error-category";
import {
  absoluteSessionExpiry,
  canRequestVerification,
  requireActivation,
  requireFreshKey,
  requireLogin,
  verificationDeadline,
} from "../../domain/identity-policy";
import { Account } from "../../domain/entities/identity-state";
import { IdentityRepository } from "../../domain/repositories/identity.repository";
import { Principal, MutationReceipt } from "../dto/identity.dto";
import { IdentityQuery } from "../ports/identity-query.port";
import {
  AuthenticatedWriteAdmission,
  WRITE_ADMISSION_INTERVAL_MS,
  WRITE_ADMISSION_BURST,
} from "../ports/authenticated-write-admission.port";
import {
  Passwords,
  SessionTokens,
  VerificationSecrets,
  IssuedTokens,
} from "../ports/identity-crypto.ports";
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly uow: UnitOfWork,
    private readonly passwords: Passwords,
    private readonly tokens: SessionTokens,
    private readonly secrets: VerificationSecrets,
    private readonly dummyHash: string,
    private readonly security: SecurityControls,
    private readonly receipts: IdempotencyStore,
    private readonly queries: IdentityQuery,
    private readonly writeAdmission: AuthenticatedWriteAdmission,
  ) {}
  private async challenge(account: Account, now: number): Promise<void> {
    let challenge = await this.repo.activeChallenge(account.id, now);
    const expiresAt = verificationDeadline(now);
    if (!challenge) {
      const id = this.secrets.id(),
        token = this.secrets.newToken();
      await this.repo.createChallenge({
        id,
        userId: account.id,
        email: account.email,
        hash: this.secrets.hash(token),
        ciphertext: await this.secrets.seal({ challengeId: id, token }),
        expiresAt,
      });
      challenge = {
        id,
        userId: account.id,
        email: account.email,
        expiresAt,
        consumed: false,
        cancelled: false,
        ciphertext: "created",
      };
    }
    await this.repo.enqueueEmail(this.secrets.id(), challenge.id);
  }
  async register(input: { email: string; displayName: string; password: string }): Promise<void> {
    const passwordHash = await this.passwords.hash(input.password),
      id = this.secrets.id();
    await this.uow.transaction(async () => {
      if (
        !(await this.repo.createAccount({
          id,
          email: input.email,
          displayName: input.displayName,
          passwordHash,
        }))
      )
        return;
      const account = await this.repo.lockAccount(id);
      if (!account) throw invalidRequest();
      await this.challenge(account, await this.repo.now());
    });
  }
  async requestVerification(email: string): Promise<void> {
    const found = await this.repo.accountByEmail(email);
    if (!found) return;
    await this.uow.transaction(async () => {
      const account = await this.repo.lockAccount(found.id),
        now = await this.repo.now();
      if (
        !account ||
        !canRequestVerification(account, now) ||
        !(await this.repo.canSend(account.id, now))
      )
        return;
      await this.challenge(account, now);
    });
  }
  async confirm(token: string, password: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalidRequest();
    const hash = await this.passwords.hash(password),
      found = await this.repo.challengeByHash(this.secrets.hash(token));
    if (!found) throw invalidRequest();
    await this.uow.transaction(async () => {
      const account = await this.repo.lockAccount(found.userId),
        challenge = await this.repo.lockChallenge(found.id),
        now = await this.repo.now();
      if (!account || !account.enabled || !challenge) throw invalidRequest();
      requireActivation(challenge, account.email, now);
      if (challenge.consumed) return;
      if (account.emailVerifiedAt !== null) throw invalidRequest();
      await this.repo.activate(account.id, challenge.id, hash);
    });
  }
  async login(
    email: string,
    password: string,
    correlationId = this.secrets.id(),
  ): Promise<IssuedTokens> {
    const reservation = await this.security.reserveLogin(email);
    if (!reservation) throw rateLimited();
    let keepFailure = false;
    try {
      const found = await this.repo.accountByEmail(email),
        valid = await this.passwords.verify(found?.passwordHash ?? this.dummyHash, password);
      if (!found || !valid || !found.enabled || found.emailVerifiedAt === null) {
        keepFailure = true;
        throw unauthenticated();
      }
      return await this.uow.transaction(async () => {
        const account = await this.repo.lockAccount(found.id);
        if (
          !account ||
          account.credentialVersion !== found.credentialVersion ||
          account.passwordHash !== found.passwordHash
        )
          throw unauthenticated();
        requireLogin(account);
        const now = await this.repo.now(),
          familyId = this.secrets.id(),
          absoluteExpiresAt = absoluteSessionExpiry(now);
        const pair = await this.tokens.issue({
          userId: account.id,
          familyId,
          sessionId: this.secrets.id(),
          now,
          absoluteExpiresAt,
        });
        await this.repo.createFamily(familyId, account.id, absoluteExpiresAt);
        await this.repo.saveSession(pair);
        await this.security.audit({
          actorId: account.id,
          action: "identity.login",
          resourceId: familyId,
          resourceType: "SESSION_FAMILY",
          correlationId,
        });
        return pair;
      });
    } catch (error) {
      if (error instanceof DomainError && error.category === ErrorCategory.Unauthorized)
        keepFailure = true;
      throw error;
    } finally {
      if (!keepFailure) await this.security.releaseLogin(email, reservation);
    }
  }
  async refresh(raw: string, correlationId = this.secrets.id()): Promise<IssuedTokens> {
    const c = await this.tokens.verify(raw, "refresh");
    const outcome = await this.uow.transaction(async () => {
      const account = await this.repo.lockAccount(c.userId),
        family = await this.repo.lockFamily(c.familyId),
        session = await this.repo.session(c, this.tokens.hash(raw), "refresh"),
        now = await this.repo.now();
      if (
        !account ||
        !account.enabled ||
        account.emailVerifiedAt === null ||
        !family ||
        family.userId !== account.id ||
        family.revoked ||
        family.absoluteExpiresAt <= now ||
        !session ||
        session.refreshExpiresAt <= now
      )
        return null;
      // Commit revocation before reporting a replay: throwing here would undo it.
      if (session.consumed) {
        await this.repo.revokeFamily(family.id);
        await this.security.audit({
          actorId: account.id,
          action: "identity.refresh.reuse",
          resourceId: family.id,
          resourceType: "SESSION_FAMILY",
          correlationId,
        });
        return null;
      }
      const pair = await this.tokens.issue({
        userId: account.id,
        familyId: family.id,
        sessionId: this.secrets.id(),
        now,
        absoluteExpiresAt: family.absoluteExpiresAt,
      });
      await this.repo.consumeSession(session.id);
      await this.repo.saveSession(pair);
      return pair;
    });
    if (!outcome) throw unauthenticated();
    return outcome;
  }
  async logout(raw?: string, correlationId = this.secrets.id()): Promise<void> {
    if (!raw) return;
    let c;
    try {
      c = await this.tokens.verify(raw, "refresh");
    } catch {
      return;
    }
    await this.uow.transaction(async () => {
      const account = await this.repo.lockAccount(c.userId),
        family = await this.repo.lockFamily(c.familyId);
      if (
        account &&
        family?.userId === account.id &&
        !family.revoked &&
        (await this.repo.session(c, this.tokens.hash(raw), "refresh"))
      ) {
        await this.repo.revokeFamily(family.id);
        await this.security.audit({
          actorId: account.id,
          action: "identity.logout",
          resourceId: family.id,
          resourceType: "SESSION_FAMILY",
          correlationId,
        });
      }
    });
  }
  async authenticate(raw: string): Promise<Principal> {
    const c = await this.tokens.verify(raw, "access"),
      principal = await this.queries.principal(c, this.tokens.hash(raw));
    if (!principal) throw unauthenticated();
    return principal;
  }
  async authorizeWrite(
    raw: string,
    refreshRaw: string | undefined,
    csrfFamily: string,
    permission: string,
  ): Promise<Principal> {
    const claims = await this.tokens.verify(raw, "access");
    let refresh = null;
    if (refreshRaw) {
      try {
        refresh = {
          claims: await this.tokens.verify(refreshRaw, "refresh"),
          hash: this.tokens.hash(refreshRaw),
        };
      } catch {
        // Invalid/expired refresh falls back to the live access family, as checkUnsafe does.
      }
    }
    const decision = await this.writeAdmission.admit({
      access: { claims, hash: this.tokens.hash(raw) },
      refresh,
      csrfFamily,
      permission,
      subjectHash: this.security.rateSubject("actor.write", claims.userId),
      intervalMs: WRITE_ADMISSION_INTERVAL_MS,
      burst: WRITE_ADMISSION_BURST,
    });
    if (!decision.csrfValid) throw forbidden();
    if (!decision.principal) throw unauthenticated();
    this.requirePermission(decision.principal, permission);
    if (!decision.allowed) throw rateLimited();
    return decision.principal;
  }

  async csrfFamily(refresh?: string, allowRevoked = false): Promise<string | null> {
    if (!refresh) return null;
    let c;
    try {
      c = await this.tokens.verify(refresh, "refresh");
    } catch {
      return null;
    }
    // Replayed credentials may reach refresh so the application can durably revoke the family.
    return this.queries.csrfFamily(c, this.tokens.hash(refresh), allowRevoked);
  }
  requirePermission(principal: { permissions: readonly string[] }, permission: string): void {
    if (!principal.permissions.includes(permission)) throw forbidden();
  }
  async revalidate(raw: string, permission: string): Promise<Principal> {
    const claims = await this.tokens.verify(raw, "access");
    const account = await this.repo.lockAccount(claims.userId);
    if (!account?.enabled || account.emailVerifiedAt === null) throw unauthenticated();
    const current = await this.authenticate(raw);
    if (current.userId !== account.id) throw unauthenticated();
    this.requirePermission(current, permission);
    return current;
  }
  async updateProfile(
    raw: string,
    key: string,
    input: { displayName: string; leaderboardOptIn: boolean; expectedRevision: number },
    correlationId: string,
  ): Promise<MutationReceipt> {
    const principal = await this.authenticate(raw);
    this.requirePermission(principal, "identity.self");
    const fingerprint = this.secrets.hash(
      JSON.stringify([
        "PUT",
        "/v1/me",
        input.displayName,
        input.leaderboardOptIn,
        input.expectedRevision,
      ]),
    );
    return this.uow.transaction(async () => {
      const account = await this.repo.lockAccount(principal.userId);
      if (!account) throw unauthenticated();
      const current = await this.authenticate(raw);
      this.requirePermission(current, "identity.self");
      const existing = await this.receipts.find<MutationReceipt>(account.id, key);
      if (existing) {
        if (
          existing.fingerprint.length !== fingerprint.length ||
          !existing.fingerprint.every((v, i) => v === fingerprint[i])
        )
          throw new IdempotencyConflictError();
        return existing.response;
      }
      const now = await this.repo.now();
      requireFreshKey(key, now);
      if (account.revision !== input.expectedRevision) throw new RevisionConflictError();
      const revision = await this.repo.updateProfile(
          account.id,
          input.displayName,
          input.leaderboardOptIn,
        ),
        receipt = { resourceId: account.id, revision, acceptedAt: new Date(now).toISOString() };
      await this.security.audit({
        actorId: account.id,
        action: "identity.profile.update",
        resourceType: "USER",
        resourceId: account.id,
        correlationId,
        changedFields: ["displayName", "leaderboardOptIn"],
      });
      await this.receipts.save({
        actorId: account.id,
        key,
        fingerprint,
        operation: "identity.profile.update",
        resourceId: account.id,
        httpStatus: 200,
        response: receipt,
      });
      return receipt;
    });
  }
}
