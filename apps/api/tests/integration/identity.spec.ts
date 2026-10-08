import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Module } from "@nestjs/common";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { PostgresDatabase } from "../../src/infrastructure/database/transaction/postgres-database";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import { IdentityService } from "../../src/modules/identity/application/services/identity.service";
import { PostgresIdentityRepository } from "../../src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../src/modules/identity/infrastructure/security/identity-crypto";
import { PostgresIdempotency } from "../../src/infrastructure/idempotency/postgres-idempotency";
import { PostgresSecurity } from "../../src/infrastructure/security/authorization/postgres-security";
import { READINESS } from "../../src/shared/application/ports/readiness";
import { ShutdownGate } from "../../src/infrastructure/resilience/shutdown/shutdown-gate";
import { createHttpApplication } from "../../src/infrastructure/http/configure-http-application";
import { LiveController } from "../../src/infrastructure/health/http/live.controller";
import { ReadyController } from "../../src/infrastructure/health/http/ready.controller";
import { HttpSession } from "../../src/modules/identity/infrastructure/http/http-session";
import { IdentityController } from "../../src/modules/identity/presentation/http/identity.controller";
import { HTTP_SESSION } from "../../src/modules/identity/presentation/http/http-session.port";
import { VerificationWorker } from "../../src/modules/identity/application/services/verification-worker";
import { PostgresVerificationDelivery } from "../../src/modules/identity/infrastructure/persistence/postgres/delivery/postgres-verification-delivery";
import { createVerificationWorker } from "../../src/modules/identity/identity-worker.factory";

import { PostgresIdentityQuery } from "../../src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Local test administrator required");
const name = `identity_test_${randomUUID().replaceAll("-", "")}`,
  suffix = name.slice(-12),
  password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const owner = `identity_ddl_${suffix}`,
  runtime = `identity_app_${suffix}`,
  operator = `identity_ops_${suffix}`,
  mailRole = `identity_mail_${suffix}`;
const url = new URL(adminUrl);
url.pathname = `/${name}`;
const runtimeUrl = new URL(url);
runtimeUrl.username = runtime;
runtimeUrl.password = password;
const ddlUrl = new URL(url);
ddlUrl.username = owner;
ddlUrl.password = password;
let fixture: Pool,
  db: PostgresDatabase,
  db2: PostgresDatabase,
  mailDatabase: PostgresDatabase,
  identity: IdentityService,
  second: IdentityService;
let codec: VerificationCodec;
let emailKey: Buffer;
const originalPassword = "initial candidate password",
  finalPassword = "email owner final password";
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  await admin.query(`CREATE ROLE ${owner} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtime} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${operator} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${mailRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${owner}`);
  await admin.query(`GRANT examination_runtime TO ${runtime}`);
  await admin.query(`GRANT examination_operator TO ${operator}`);
  await admin.query(`GRANT examination_mail_worker TO ${mailRole}`);
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: ddlUrl.toString() }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: url.toString(), max: 3 });
  db = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() }),
  );
  db2 = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() }),
  );
  const mailUrl = new URL(url);
  mailUrl.username = mailRole;
  mailUrl.password = password;
  mailDatabase = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: mailUrl.toString() }),
  );
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = {
    kid: "local-test",
    privatePem: keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const jwt = await JwtSessionTokens.create("urn:test:identity", key, [key]);
  emailKey = randomBytes(32);
  codec = new VerificationCodec("mail", { mail: emailKey });
  const passwords = new ArgonPasswords(2, 8),
    dummy = await passwords.hash("dummy fixture credential");
  const rateKey = randomBytes(32);
  const make = (database: PostgresDatabase) =>
    new IdentityService(
      new PostgresIdentityRepository(database),
      database,
      passwords,
      jwt,
      codec,
      dummy,
      new PostgresSecurity(database, rateKey),
      new PostgresIdempotency(database),
      new PostgresIdentityQuery(database),
      new PostgresAuthenticatedWriteAdmission(database),
    );
  identity = make(db);
  second = make(db2);
});
afterAll(async () => {
  await db?.close();
  await db2?.close();
  await mailDatabase?.close();
  await fixture?.end();
  for (let i = 0; i < 100; i++) {
    if (
      (
        await admin.query(
          `
      SELECT
        count(*)::int n
      FROM
        pg_stat_activity
      WHERE
        datname = $1
      `,
          [name],
        )
      ).rows[0].n === 0
    )
      break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(`
  DROP ROLE IF EXISTS ${owner},
  ${runtime},
  ${operator},
  ${mailRole}
  `);
  await admin.end();
});
async function register() {
  const email = `${randomUUID()}@example.test`;
  await identity.register({ email, displayName: "Candidate", password: originalPassword });
  const row = (
    await fixture.query(
      `
      SELECT
        c.id,
        c.user_id,
        c.ciphertext
      FROM
        identity.verification_challenges c
        JOIN identity.users u ON u.id = c.user_id
      WHERE
        u.email = $1
      `,
      [email],
    )
  ).rows[0];
  return {
    email,
    id: row.user_id,
    challenge: row.id,
    token: await codec.open(row.ciphertext, row.id),
  };
}
beforeEach(async () => {
  await fixture.query(
    `
    UPDATE identity.email_intents
    SET
      cancelled_at = clock_timestamp()
    WHERE
      cancelled_at IS NULL
      AND delivered_at IS NULL
    `,
  );
});
async function activated() {
  const a = await register();
  await identity.confirm(a.token, finalPassword);
  return a;
}
describe("Identity on real restricted PostgreSQL", () => {
  it("creates one pending account and one durable intent under duplicate registration", async () => {
    const email = `${randomUUID()}@example.test`,
      input = { email, displayName: "Candidate", password: originalPassword };
    await Promise.all([identity.register(input), second.register(input)]);
    expect(
      (
        await fixture.query(
          `
      SELECT
        count(*)::int n
      FROM
        identity.users
      WHERE
        email = $1
      `,
          [email],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            identity.email_intents i
            JOIN identity.verification_challenges c ON c.id = i.challenge_id
          WHERE
            c.email = $1
          `,
          [email],
        )
      ).rows[0].n,
    ).toBe(1);
    await expect(identity.login(email, originalPassword)).rejects.toThrow("Unauthenticated");
  });
  it("activates once with the email owner's password, erases ciphertext and never auto logs in", async () => {
    const a = await register();
    await Promise.all([
      identity.confirm(a.token, finalPassword),
      second.confirm(a.token, "second confirmation password"),
    ]);
    const row = (
      await fixture.query(
        `
        SELECT
          password_hash,
          email_verified_at
        FROM
          identity.users
        WHERE
          id = $1
        `,
        [a.id],
      )
    ).rows[0];
    expect(row.email_verified_at).not.toBeNull();
    expect(
      (
        await fixture.query(
          `
        SELECT
          ciphertext
        FROM
          identity.verification_challenges
        WHERE
          id = $1
        `,
          [a.challenge],
        )
      ).rows[0].ciphertext,
    ).toBeNull();
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            identity.sessions s
            JOIN identity.session_families f ON f.id = s.family_id
          WHERE
            f.user_id = $1
          `,
          [a.id],
        )
      ).rows[0].n,
    ).toBe(0);
    await expect(identity.login(a.email, originalPassword)).rejects.toThrow("Unauthenticated");
    const passwordMatches = await Promise.all(
      [finalPassword, "second confirmation password"].map((p) =>
        new ArgonPasswords().verify(row.password_hash, p),
      ),
    );
    expect(passwordMatches.filter(Boolean)).toHaveLength(1);
    await identity.confirm(a.token, "a duplicate new password");
    expect(
      (
        await fixture.query(
          `
      SELECT
        password_hash
      FROM
        identity.users
      WHERE
        id = $1
      `,
          [a.id],
        )
      ).rows[0].password_hash,
    ).toBe(row.password_hash);
  });
  it("coalesces resend during cooldown and rejects expired/cancelled challenges", async () => {
    const a = await register();
    await second.requestVerification(a.email);
    await identity.requestVerification("absent@example.test");
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            identity.email_intents
          WHERE
            challenge_id = $1
          `,
          [a.challenge],
        )
      ).rows[0].n,
    ).toBe(1);
    await fixture.query(
      `
      UPDATE identity.verification_challenges
      SET
        expires_at = clock_timestamp() - interval '1 second'
      WHERE
        id = $1
      `,
      [a.challenge],
    );
    await expect(identity.confirm(a.token, finalPassword)).rejects.toThrow("Invalid request");
  });
  it("commits reuse revocation and invalidates the replacement across two instances", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword);
    const next = await second.refresh(session.refresh);
    await expect(identity.authenticate(session.access)).rejects.toThrow("Unauthenticated");
    await expect(identity.refresh(session.refresh)).rejects.toThrow("Unauthenticated");
    expect(
      (
        await fixture.query(
          `
        SELECT
          revoked_at
        FROM
          identity.session_families
        WHERE
          id = $1
        `,
          [session.familyId],
        )
      ).rows[0].revoked_at,
    ).not.toBeNull();
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            platform.audit_logs
          WHERE
            action = 'identity.refresh.reuse'
            AND resource_id = $1
          `,
          [session.familyId],
        )
      ).rows[0].n,
    ).toBe(1);
    await expect(second.authenticate(next.access)).rejects.toThrow("Unauthenticated");
  });
  it("reserves failure capacity atomically before concurrent password evaluations", async () => {
    const a = await activated(),
      results = await Promise.allSettled(
        Array.from({ length: 6 }, (_, i) =>
          (i % 2 ? second : identity).login(a.email, "wrong fixture password"),
        ),
      );
    const messages = results.map((r) =>
      r.status === "rejected" ? String(r.reason.message) : "success",
    );
    expect(messages.filter((m) => m === "Unauthenticated")).toHaveLength(5);
    expect(messages.filter((m) => m === "Too many requests")).toHaveLength(1);
  });
  it("shares login failure limits across instances without counting successful logins", async () => {
    const a = await activated();
    for (let i = 0; i < 6; i++) await (i % 2 ? second : identity).login(a.email, finalPassword);
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            platform.audit_logs
          WHERE
            actor_id = $1
            AND action = 'identity.login'
          `,
          [a.id],
        )
      ).rows[0].n,
    ).toBe(6);
    for (let i = 0; i < 5; i++)
      await expect(
        (i % 2 ? second : identity).login(a.email, "wrong fixture password"),
      ).rejects.toThrow("Unauthenticated");
    await expect(second.login(a.email, finalPassword)).rejects.toThrow("Too many requests");
  });
  it("retains each failure reservation for at least fifteen minutes", async () => {
    const security = new PostgresSecurity(db, randomBytes(32));
    const email = `${randomUUID()}@example.test`;
    const first = await security.reserveLogin(email);
    expect(first).not.toBeNull();
    await fixture.query(
      `
      UPDATE platform.rate_limit_buckets
      SET
        expires_at = clock_timestamp() + interval '1 second'
      WHERE
        scope = 'login.failure'
        AND window_start = $1
      `,
      [first],
    );
    const before = (await fixture.query("SELECT clock_timestamp() AS now")).rows[0].now;
    const next = await security.reserveLogin(email);
    const expires = (
      await fixture.query(
        `
        SELECT
          max(expires_at) AS expires
        FROM
          platform.rate_limit_buckets
        WHERE
          scope = 'login.failure'
          AND window_start = $1
        `,
        [next],
      )
    ).rows[0].expires;
    expect(expires.getTime() - before.getTime()).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1);
  });
  it("serializes concurrent refresh and fails closed after a replay", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword);
    const results = await Promise.allSettled([
      identity.refresh(session.refresh),
      second.refresh(session.refresh),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const success = results.find((r) => r.status === "fulfilled");
    if (success?.status === "fulfilled")
      await expect(identity.authenticate(success.value.access)).rejects.toThrow("Unauthenticated");
  });
  it("rejects DB-expired access and absolute families even while the JWT signature is valid", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword);
    await fixture.query(
      `
      UPDATE identity.sessions
      SET
        created_at = clock_timestamp() - interval '10 minutes',
        access_expires_at = clock_timestamp() - interval '1 second'
      WHERE
        id = $1
      `,
      [session.sessionId],
    );
    await expect(second.authenticate(session.access)).rejects.toThrow("Unauthenticated");
    const rotated = await second.refresh(session.refresh);
    await fixture.query(
      `
      UPDATE identity.session_families
      SET
        created_at = clock_timestamp() - interval '31 days',
        absolute_expires_at = clock_timestamp() - interval '1 second'
      WHERE
        id = $1
      `,
      [session.familyId],
    );
    await expect(identity.authenticate(rotated.access)).rejects.toThrow("Unauthenticated");
    await expect(second.refresh(rotated.refresh)).rejects.toThrow("Unauthenticated");
  });
  it("rolls back the profile and receipt when its mandatory audit cannot commit", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword),
      principal = await identity.authenticate(session.access),
      time = Date.now().toString(16).padStart(12, "0"),
      key = `${time.slice(0, 8)}-${time.slice(8)}-7000-8000-000000000002`;
    await fixture.query(
      "CREATE FUNCTION platform.fail_profile_audit () RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='identity.profile.update' THEN RAISE EXCEPTION 'fixture audit unavailable'; END IF; RETURN NEW; END $$",
    );
    await fixture.query(
      `
      CREATE TRIGGER fixture_profile_audit
      BEFORE INSERT ON platform.audit_logs FOR EACH ROW
      EXECUTE FUNCTION platform.fail_profile_audit ()
      `,
    );
    try {
      await expect(
        identity.updateProfile(
          session.access,
          key,
          {
            displayName: "Must roll back",
            leaderboardOptIn: true,
            expectedRevision: principal.profile.revision,
          },
          randomUUID(),
        ),
      ).rejects.toThrow("Database operation failed");
      expect((await identity.authenticate(session.access)).profile).toEqual(principal.profile);
      expect(
        (
          await fixture.query(
            `
            SELECT
              key
            FROM
              platform.idempotency_receipts
            WHERE
              actor_id = $1
              AND key = $2
            `,
            [a.id, key],
          )
        ).rowCount,
      ).toBe(0);
    } finally {
      await fixture.query("DROP TRIGGER fixture_profile_audit ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.fail_profile_audit()");
    }
  });
  it("makes logout idempotent and reflects current disable and permission changes", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword);
    expect((await second.authenticate(session.access)).permissions).toContain("identity.self");
    await fixture.query(
      `
    DELETE FROM identity.user_roles
    WHERE
      user_id = $1
    `,
      [a.id],
    );
    expect((await identity.authenticate(session.access)).permissions).not.toContain(
      "identity.self",
    );
    await identity.logout(session.refresh);
    await second.logout(session.refresh);
    await expect(second.authenticate(session.access)).rejects.toThrow("Unauthenticated");
    const next = await identity.login(a.email, finalPassword);
    await fixture.query(
      `
    UPDATE identity.users
    SET
      enabled = false
    WHERE
      id = $1
    `,
      [a.id],
    );
    await expect(second.authenticate(next.access)).rejects.toThrow("Unauthenticated");
  });
  it("forbids runtime self-granting admin or editing the permission matrix", async () => {
    const a = await activated();
    await expect(
      db.query(
        "diagnostic",
        `
      INSERT INTO
        identity.user_roles
      VALUES
        ($1, 'ADMIN')
      `,
        [a.id],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE identity.role_permissions
      SET
        permission_id = 'profile:update'
      `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("persists profile receipts before checking revision, with atomic audit and no lost update", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword),
      p = await identity.authenticate(session.access);
    const time = Date.now().toString(16).padStart(12, "0"),
      key = `${time.slice(0, 8)}-${time.slice(8)}-7000-8000-000000000001`;
    const input = {
      displayName: "Updated",
      leaderboardOptIn: true,
      expectedRevision: p.profile.revision,
    };
    const first = await identity.updateProfile(session.access, key, input, randomUUID());
    expect(await second.updateProfile(session.access, key, input, randomUUID())).toEqual(first);
    await expect(
      identity.updateProfile(
        session.access,
        key,
        { ...input, displayName: "Different" },
        randomUUID(),
      ),
    ).rejects.toThrow("Idempotency key conflict");
    expect(
      (
        await fixture.query(
          `
          SELECT
            count(*)::int n
          FROM
            platform.audit_logs
          WHERE
            actor_id = $1
            AND action = 'identity.profile.update'
          `,
          [a.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("enforces cookie/Origin/CSRF boundaries over Nest HTTP and returns no JWT in JSON", async () => {
    const origin = "http://127.0.0.1:3000",
      security = new PostgresSecurity(db, randomBytes(32));
    @Module({
      controllers: [IdentityController, LiveController, ReadyController],
      providers: [
        { provide: IdentityService, useValue: identity },
        {
          provide: HTTP_SESSION,
          useValue: new HttpSession(identity, security, origin, randomBytes(32)),
        },
        {
          provide: READINESS,
          useValue: {
            check: async () => {
              await db.query("diagnostic", "SELECT 1");
            },
          },
        },
        ShutdownGate,
      ],
    })
    class TestHttpModule {}
    const api = await createHttpApplication(TestHttpModule);
    try {
      const http = api.app.getHttpAdapter().getInstance();
      expect((await http.inject({ method: "GET", url: "/live" })).json()).toEqual({ status: "ok" });
      expect((await http.inject({ method: "GET", url: "/ready" })).json()).toEqual({
        status: "ok",
      });
      const malformed = await http.inject({
        method: "POST",
        url: "/v1/auth/register",
        headers: { "content-type": "application/json" },
        payload: "{",
      });
      expect(malformed.statusCode).toBe(400);
      expect(malformed.json()).toEqual({
        data: null,
        errorCode: "Invalid request",
        message: "Invalid request",
        status: false,
      });
      const pre = await http.inject({ method: "GET", url: "/v1/auth/csrf" });
      const csrf = pre.cookies.find((c: { name: string }) => c.name === "__Host-csrf")!;
      const headers = {
        origin: "http://127.0.0.1:3000",
        cookie: `__Host-csrf=${csrf.value}`,
        "x-csrf-token": pre.json().data.csrfToken,
      };
      const a = { email: `${randomUUID()}@example.test` };
      const registration = await http.inject({
        method: "POST",
        url: "/v1/auth/register",
        headers,
        payload: {
          email: ` ${a.email.toUpperCase()} `,
          displayName: "HTTP Candidate",
          password: originalPassword,
        },
      });
      expect(registration.statusCode).toBe(202);
      expect(registration.json()).toEqual({
        data: { accepted: true },
        errorCode: null,
        message: null,
        status: true,
      });
      expect(
        (
          await http.inject({
            method: "POST",
            url: "/v1/auth/login",
            headers,
            payload: { email: a.email, password: originalPassword },
          })
        ).statusCode,
      ).toBe(401);
      const challenge = (
        await fixture.query(
          `
          SELECT
            c.id,
            c.ciphertext
          FROM
            identity.verification_challenges c
            JOIN identity.users u ON u.id = c.user_id
          WHERE
            u.email = $1
          `,
          [a.email],
        )
      ).rows[0];
      const confirmation = await http.inject({
        method: "POST",
        url: "/v1/auth/email-verification/confirm",
        headers,
        payload: {
          token: await codec.open(challenge.ciphertext, challenge.id),
          password: finalPassword,
        },
      });
      expect(confirmation.statusCode).toBe(200);
      expect(confirmation.json().data).toEqual({ verified: true });
      expect(confirmation.cookies).toHaveLength(0);
      expect(
        (
          await http.inject({
            method: "POST",
            url: "/v1/auth/login",
            payload: { email: a.email, password: finalPassword },
          })
        ).statusCode,
      ).toBe(403);
      const login = await http.inject({
        method: "POST",
        url: "/v1/auth/login",
        headers,
        payload: { email: a.email, password: finalPassword },
      });
      expect(login.statusCode).toBe(200);
      expect(login.json()).toMatchObject({ errorCode: null, message: null, status: true });
      expect(Object.keys(login.json().data).sort()).toEqual([
        "absoluteExpiresAt",
        "accessExpiresAt",
        "refreshExpiresAt",
        "userId",
      ]);
      for (const name of ["__Host-access", "__Host-refresh"]) {
        const cookie = login.cookies.find((c: { name: string }) => c.name === name)!;
        expect(cookie.secure).toBe(true);
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.path).toBe("/");
        expect(cookie.domain).toBeUndefined();
      }
      const cookies = login.cookies
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join("; ");
      const me = await http.inject({ method: "GET", url: "/v1/me", headers: { cookie: cookies } });
      expect(me.json().data.email).toBe(a.email);
      const liveHeaders = {
        origin,
        cookie: cookies,
        "x-csrf-token": login.cookies.find((c: { name: string }) => c.name === "__Host-csrf")!
          .value,
      };
      for (const [url, payload] of [
        ["/v1/auth/email-verification/request", { email: a.email }],
        [
          "/v1/auth/email-verification/confirm",
          {
            token: await codec.open(challenge.ciphertext, challenge.id),
            password: finalPassword,
          },
        ],
      ] as const) {
        expect(
          (await http.inject({ method: "POST", url, headers: liveHeaders, payload })).statusCode,
        ).toBe(403);
      }
      // A valid signed anonymous nonce plus live credentials must not revoke a live family.
      const anonymousWithLiveCookies = login.cookies
        .filter((c: { name: string }) => c.name !== "__Host-csrf")
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .concat(`__Host-csrf=${csrf.value}`)
        .join("; ");
      expect(
        (
          await http.inject({
            method: "POST",
            url: "/v1/auth/logout",
            headers: { origin, cookie: anonymousWithLiveCookies, "x-csrf-token": csrf.value },
          })
        ).statusCode,
      ).toBe(403);
      const anonymous = await http.inject({
        method: "POST",
        url: "/v1/auth/refresh",
        headers: { ...headers, cookie: cookies },
      });
      expect(anonymous.statusCode).toBe(403);
      const logout = await http.inject({
        method: "POST",
        url: "/v1/auth/logout",
        headers: {
          origin: headers.origin,
          cookie: cookies,
          "x-csrf-token": login.cookies.find((c: { name: string }) => c.name === "__Host-csrf")!
            .value,
        },
      });
      expect(logout.statusCode).toBe(200);
      const logoutRetry = await http.inject({
        method: "POST",
        url: "/v1/auth/logout",
        headers: {
          origin,
          cookie: cookies,
          "x-csrf-token": login.cookies.find((c: { name: string }) => c.name === "__Host-csrf")!
            .value,
        },
      });
      expect(logoutRetry.statusCode).toBe(200);
      const freshAfterLogout = await http.inject({
        method: "GET",
        url: "/v1/auth/csrf",
        headers: { cookie: cookies },
      });
      const freshCsrf = freshAfterLogout.cookies.find(
        (c: { name: string }) => c.name === "__Host-csrf",
      )!;
      const freshCookies = login.cookies
        .filter((c: { name: string }) => c.name !== "__Host-csrf")
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .concat(`__Host-csrf=${freshCsrf.value}`)
        .join("; ");
      expect(
        (
          await http.inject({
            method: "POST",
            url: "/v1/auth/logout",
            headers: {
              origin,
              cookie: freshCookies,
              "x-csrf-token": freshAfterLogout.json().data.csrfToken,
            },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (await http.inject({ method: "GET", url: "/v1/me", headers: { cookie: cookies } }))
          .statusCode,
      ).toBe(401);
      expect(me.headers["cache-control"]).toBe("no-store");
      expect(me.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
      api.drain();
      expect((await http.inject({ method: "GET", url: "/ready" })).statusCode).toBe(503);
      expect((await http.inject({ method: "GET", url: "/live" })).statusCode).toBe(200);
      expect((await http.inject({ method: "GET", url: "/v1/me" })).statusCode).toBe(503);
    } finally {
      await api.app.close();
    }
  });
  it("delivers a captured SMTP verification link and never sends an already consumed job", async () => {
    const a = await register(),
      delivery = new PostgresVerificationDelivery(mailDatabase);
    const worker = createVerificationWorker(
      {
        origin: "http://127.0.0.1:3000",
        port: 3001,
        workerConcurrency: 1,
        emailKeys: { activeKid: "mail", keys: { mail: emailKey } },
        rateKey: randomBytes(32),
        mail: {
          adapter: "smtp",
          host: "127.0.0.1",
          port: 11025,
          from: "no-reply@example.test",
          region: "",
        },
      },
      mailDatabase,
    );
    // Drain earlier pending fixtures through local mailbox only.
    for (let i = 0; i < 30; i++) {
      if (!(await worker.runOnce())) break;
    }
    const messages = (await (await fetch("http://127.0.0.1:18025/api/v1/messages")).json()) as {
      messages: { ID: string; To: { Address: string }[] }[];
    };
    const item = messages.messages.find((m) => m.To.some((t) => t.Address === a.email));
    expect(item).toBeDefined();
    const mail = (await (
      await fetch(`http://127.0.0.1:18025/api/v1/message/${item!.ID}`)
    ).json()) as { Text: string };
    expect(mail.Text).toContain(`/verify-email#token=${a.token}`);
    const b = await register();
    await identity.confirm(b.token, finalPassword);
    let sent = 0;
    const skipped = new VerificationWorker(
      delivery,
      codec,
      {
        send: async () => {
          sent++;
        },
      },
      "http://127.0.0.1:3000",
    );
    while (await skipped.runOnce()) {}
    expect(sent).toBe(0);
    worker.close();
  });
  it("fences expired delivery leases and parks bounded retry failures", async () => {
    const a = await register(),
      delivery = new PostgresVerificationDelivery(mailDatabase),
      job = await delivery.claim();
    expect(job).not.toBeNull();
    await fixture.query(
      `
      UPDATE identity.email_intents
      SET
        lease_until = clock_timestamp() - interval '1 second'
      WHERE
        id = $1
      `,
      [job!.id],
    );
    const replacement = await delivery.claim();
    expect(replacement!.leaseToken).not.toBe(job!.leaseToken);
    await delivery.delivered(job!);
    expect(
      (
        await fixture.query(
          `
        SELECT
          delivered_at
        FROM
          identity.email_intents
        WHERE
          id = $1
        `,
          [job!.id],
        )
      ).rows[0].delivered_at,
    ).toBeNull();
    await delivery.failed(replacement!, "PROVIDER_UNAVAILABLE", false);
    expect(
      (
        await fixture.query(
          `
      SELECT
        parked_at
      FROM
        identity.email_intents
      WHERE
        id = $1
      `,
          [job!.id],
        )
      ).rows[0].parked_at,
    ).not.toBeNull();
    await identity.confirm(a.token, finalPassword);
  });
  it("grants first admin once through the operator role and audits every grant/revoke", async () => {
    const pending = await register(),
      a = await activated(),
      b = await activated();
    const opsUrl = new URL(url);
    opsUrl.username = operator;
    opsUrl.password = password;
    const ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
    try {
      await expect(
        ops.query(
          "SELECT identity.operator_admin($1, 'test-operator', 'bootstrap test', $2, true, true)",
          [pending.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "22023" });
      await expect(
        db.query(
          "diagnostic",
          "SELECT identity.operator_admin($1, 'runtime', 'escalation', $2, true, true)",
          [a.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await ops.query(
        "SELECT identity.operator_admin($1, 'test-operator', 'bootstrap test', $2, true, true)",
        [a.id, randomUUID()],
      );
      await expect(
        ops.query(
          "SELECT identity.operator_admin($1, 'test-operator', 'second bootstrap', $2, true, true)",
          [b.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      const session = await identity.login(a.email, finalPassword);
      expect((await second.authenticate(session.access)).permissions).toContain("catalog.manage");
      await ops.query(
        "SELECT identity.operator_admin($1, 'test-operator', 'revoke test', $2, false, false)",
        [a.id, randomUUID()],
      );
      expect((await identity.authenticate(session.access)).permissions).not.toContain(
        "catalog.manage",
      );
      const audit = (
        await fixture.query(
          `
          SELECT
            operator_identity,
            reason
          FROM
            platform.audit_logs
          WHERE
            resource_id = $1
            AND actor_type = 'OPERATOR'
          `,
          [a.id],
        )
      ).rows;
      expect(audit).toHaveLength(2);
      expect(audit[0].operator_identity).toContain(operator);
    } finally {
      await ops.end();
    }
  });
  it("parks a worker that crashed on its last allowed attempt and bounds retry backoff", async () => {
    const a = await register(),
      delivery = new PostgresVerificationDelivery(mailDatabase);
    await fixture.query(
      `
    UPDATE identity.email_intents
    SET
      attempts = 9
    WHERE
      challenge_id = $1
    `,
      [a.challenge],
    );
    const job = await delivery.claim();
    expect(job!.attempts).toBe(10);
    await fixture.query(
      `
      UPDATE identity.email_intents
      SET
        lease_until = clock_timestamp() - interval '1 second'
      WHERE
        id = $1
      `,
      [job!.id],
    );
    await delivery.cleanup();
    expect(
      (
        await fixture.query(
          `
      SELECT
        parked_at
      FROM
        identity.email_intents
      WHERE
        id = $1
      `,
          [job!.id],
        )
      ).rows[0].parked_at,
    ).not.toBeNull();
    const b = await register();
    await fixture.query(
      `
    UPDATE identity.email_intents
    SET
      attempts = 8
    WHERE
      challenge_id = $1
    `,
      [b.challenge],
    );
    const retry = await delivery.claim(),
      random = Math.random;
    Math.random = () => 1;
    try {
      await delivery.failed(retry!, "PROVIDER_UNAVAILABLE", true);
    } finally {
      Math.random = random;
    }
    const wait = (
      await fixture.query(
        `
        SELECT
          extract(
            epoch
            FROM
              available_at - clock_timestamp()
          ) * 1000::float8 AS ms
        FROM
          identity.email_intents
        WHERE
          id = $1
        `,
        [retry!.id],
      )
    ).rows[0].ms;
    expect(wait).toBeLessThanOrEqual(60000);
  });
  it("does not hold email intents while awaiting challenge cleanup", async () => {
    const a = await register(),
      delivery = new PostgresVerificationDelivery(mailDatabase),
      holder = await fixture.connect();
    await fixture.query(
      `
    UPDATE identity.email_intents
    SET
      attempts = 10
    WHERE
      challenge_id = $1
    `,
      [a.challenge],
    );
    await fixture.query(
      `
      UPDATE identity.verification_challenges
      SET
        expires_at = created_at + interval '1 millisecond',
        created_at = clock_timestamp() - interval '1 minute'
      WHERE
        id = $1
      `,
      [a.challenge],
    );
    await holder.query("BEGIN");
    await holder.query("SET LOCAL lock_timeout='100ms'");
    await holder.query(
      `
    SELECT
      id
    FROM
      identity.verification_challenges
    WHERE
      id = $1
    FOR UPDATE
    `,
      [a.challenge],
    );
    let finished = false;
    const cleanup = delivery.cleanup().then(
      () => {
        finished = true;
        return null;
      },
      (error: unknown) => {
        finished = true;
        return error;
      },
    );
    try {
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        waiting = Boolean(
          (
            await fixture.query(
              `
              SELECT
                1
              FROM
                pg_stat_activity
              WHERE
                usename = $1
                AND wait_event_type = 'Lock'
              `,
              [mailRole],
            )
          ).rowCount,
        );
        if (waiting || finished) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(waiting || finished).toBe(true);
      await expect(
        holder.query(
          `
        SELECT
          id
        FROM
          identity.email_intents
        WHERE
          challenge_id = $1
        FOR UPDATE
        `,
          [a.challenge],
        ),
      ).resolves.toMatchObject({ rowCount: 1 });
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
      expect(await cleanup).toBeNull();
    }
  });
  it("isolates mail worker privileges and purges terminal verification material by policy", async () => {
    const a = await register(),
      mailUrl = new URL(url);
    mailUrl.username = mailRole;
    mailUrl.password = password;
    const mailDb = new PostgresDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: mailUrl.toString() }),
    );
    try {
      await expect(
        mailDb.query(
          "diagnostic",
          `
        SELECT
          password_hash
        FROM
          identity.users
        `,
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        mailDb.query(
          "diagnostic",
          `
        SELECT
          refresh_hash
        FROM
          identity.sessions
        `,
        ),
      ).rejects.toMatchObject({ code: "42501" });
      const delivery = new PostgresVerificationDelivery(mailDb);
      expect((await delivery.claim())!.challengeId).toBe(a.challenge);
      await fixture.query(
        `
        UPDATE identity.verification_challenges
        SET
          expires_at = clock_timestamp() - interval '2 days'
        WHERE
          id = $1
        `,
        [a.challenge],
      );
      await delivery.cleanup();
      const c = (
        await fixture.query(
          `
          SELECT
            ciphertext,
            token_hash
          FROM
            identity.verification_challenges
          WHERE
            id = $1
          `,
          [a.challenge],
        )
      ).rows[0];
      expect(c.ciphertext).toBeNull();
      expect(c.token_hash).toBeNull();
      await fixture.query(
        `
        UPDATE identity.users
        SET
          created_at = clock_timestamp() - interval '8 days'
        WHERE
          id = $1
        `,
        [a.id],
      );
      await delivery.cleanup();
      const u = (
        await fixture.query(
          `
        SELECT
          email,
          password_hash,
          enabled
        FROM
          identity.users
        WHERE
          id = $1
        `,
          [a.id],
        )
      ).rows[0];
      expect(u).toEqual({ email: null, password_hash: null, enabled: false });
    } finally {
      await mailDb.close();
    }
  });
  it("revokes all sessions signed by a compromised key through the audited operator boundary", async () => {
    const a = await activated(),
      session = await identity.login(a.email, finalPassword);
    const opsUrl = new URL(url);
    opsUrl.username = operator;
    opsUrl.password = password;
    const ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
    try {
      await expect(
        db.query(
          "diagnostic",
          "SELECT identity.operator_revoke_key('local-test', 'runtime', 'not permitted', $1)",
          [randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await ops.query(
        "SELECT identity.operator_revoke_key('local-test', 'operator-test', 'compromise drill', $1)",
        [randomUUID()],
      );
      await expect(second.authenticate(session.access)).rejects.toThrow("Unauthenticated");
      await expect(identity.refresh(session.refresh)).rejects.toThrow("Unauthenticated");
      expect(
        (
          await fixture.query(
            `
            SELECT
              count(*)::int n
            FROM
              platform.audit_logs
            WHERE
              resource_id = $1
              AND action = 'identity.key.revoke'
            `,
            [session.familyId],
          )
        ).rows[0].n,
      ).toBe(1);
    } finally {
      await ops.end();
    }
  });
  it("replays only a parked live email intent without changing its challenge or deadline", async () => {
    const a = await register(),
      delivery = new PostgresVerificationDelivery(mailDatabase),
      job = (await delivery.claim())!;
    await delivery.failed(job, "PROVIDER_UNAVAILABLE", false);
    const opsUrl = new URL(url);
    opsUrl.username = operator;
    opsUrl.password = password;
    const ops = new Pool({ connectionString: opsUrl.toString(), max: 1 });
    try {
      await ops.query(
        "SELECT identity.operator_replay_email($1, 'test-operator', 'provider fixed', $2)",
        [job.id, randomUUID()],
      );
      const retried = (await delivery.claim())!;
      expect(retried.challengeId).toBe(a.challenge);
      expect(retried.attempts).toBe(1);
      expect(retried.expiresAt).toBe(job.expiresAt);
      await delivery.failed(retried, "PROVIDER_UNAVAILABLE", false);
      await identity.confirm(a.token, finalPassword);
      await expect(
        ops.query(
          "SELECT identity.operator_replay_email($1, 'test-operator', 'already activated', $2)",
          [job.id, randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "22023" });
    } finally {
      await ops.end();
    }
  });
});
