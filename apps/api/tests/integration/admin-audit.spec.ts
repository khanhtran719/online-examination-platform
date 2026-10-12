import { execFileSync, spawn } from "node:child_process";
import { createHash, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import SwaggerParser from "@apidevtools/swagger-parser";
import { Module } from "@nestjs/common";
import Ajv, { type AnySchema, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { Pool, type QueryResultRow } from "pg";

import { databaseConfig } from "@config/database.config";
import { IDENTITY_ACCESS, REQUEST_GUARD } from "@identity/facade";
import { loadMigrations, migrate } from "@infrastructure/database/migration-runner";
import {
  type DatabaseObservation,
  type DatabaseOperation,
  PostgresDatabase,
} from "@infrastructure/database/transaction/postgres-database";
import { createHttpApplication } from "@infrastructure/http/configure-http-application";
import { PostgresIdempotency } from "@infrastructure/idempotency/postgres-idempotency";
import { PostgresAuditRetention } from "@infrastructure/observability/audit/postgres-audit-retention";
import { ShutdownGate } from "@infrastructure/resilience/shutdown/shutdown-gate";
import { PostgresSecurity } from "@infrastructure/security/authorization/postgres-security";
import { AuditRetention } from "@shared/application/services/audit-retention";

import { IdentityService } from "../../src/modules/identity/application/services/identity.service";
import { HttpSession } from "../../src/modules/identity/infrastructure/http/http-session";
import { PostgresAuthenticatedWriteAdmission } from "../../src/modules/identity/infrastructure/persistence/postgres/admission/postgres-authenticated-write-admission";
import { PostgresIdentityQuery } from "../../src/modules/identity/infrastructure/persistence/postgres/queries/postgres-identity.query";
import { PostgresIdentityRepository } from "../../src/modules/identity/infrastructure/persistence/postgres/repositories/postgres-identity.repository";
import {
  ArgonPasswords,
  JwtSessionTokens,
  VerificationCodec,
} from "../../src/modules/identity/infrastructure/security/identity-crypto";
import { AuditPage } from "../../src/modules/reporting/application/dto/audit.dto";
import { AuditService } from "../../src/modules/reporting/application/services/audit.service";
import { PostgresAuditQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-audit.query";
import { AuditCrypto } from "../../src/modules/reporting/infrastructure/security/audit-cursor";
import { AuditController } from "../../src/modules/reporting/presentation/http/audit.controller";
import { runAuditRetentionJob } from "../../src/workers/scheduler/audit-retention.main";

const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435")
  throw new Error("Disposable55435 administrator required");
const name = "audit_lifecycle_" + randomUUID().replaceAll("-", ""),
  suffix = name.slice(-12),
  password = randomUUID();
const owner = "au_ddl_" + suffix,
  runtimeRole = "au_api_" + suffix,
  graderRole = "au_grade_" + suffix,
  maintenanceRole = "au_maintenance_" + suffix,
  recoveryRole = "au_recovery_" + suffix,
  operatorRole = "au_operator_" + suffix,
  auditRole = "au_purge_" + suffix;
const admin = new Pool({ connectionString: adminUrl, max: 1 }),
  base = new URL(adminUrl);
base.pathname = "/" + name;
function url(login: string) {
  const result = new URL(base);
  result.username = login;
  result.password = password;
  return result.toString();
}
const observations: DatabaseObservation[] = [];
let fixture: Pool,
  db: PostgresDatabase,
  gradeDb: PostgresDatabase,
  maintenance: PostgresDatabase,
  recoveryDb: PostgresDatabase,
  operatorDb: PostgresDatabase,
  auditDb: PostgresDatabase,
  identity: IdentityService;
let http: import("fastify").FastifyInstance, api: Awaited<ReturnType<typeof createHttpApplication>>;
let hash: string, viewer: string, headers: { cookie: string }, validate: ValidateFunction;
let security: PostgresSecurity;
const reader = () =>
  new AuditService(
    identity,
    new PostgresAuditQuery(db),
    new AuditCrypto(Buffer.alloc(32, 9)),
    security,
    db,
  );
async function user(optIn = true): Promise<string> {
  const id = randomUUID();
  await fixture.query(
    `
      INSERT INTO
        identity.users (
          id,
          email,
          password_hash,
          display_name,
          email_verified_at,
          leaderboard_opt_in
        )
      VALUES
        ($1, $2, $3, 'PRIVATE_DISPLAY_NAME', clock_timestamp(), $4)
    `,
    [id, `${id}@example.test`, hash, optIn],
  );
  await fixture.query(
    `
      INSERT INTO
        identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'CANDIDATE')
    `,
    [id],
  );
  return id;
}
beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [login, group] of [
    [owner, "examination_owner"],
    [runtimeRole, "examination_runtime"],
    [graderRole, "examination_grading_worker"],
    [maintenanceRole, "examination_assessment_maintenance"],
    [recoveryRole, "examination_grading_recovery"],
    [operatorRole, "examination_operator"],
    [auditRole, "examination_audit_maintenance"],
  ]) {
    await admin.query(
      `CREATE ROLE ${login} LOGIN ${login === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
    await admin.query(`GRANT ${group} TO ${login}`);
  }
  const migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(owner) }), migrations);
  fixture = new Pool({
    connectionString: base.toString(),
    max: 3,
    options: "-c statement_timeout=90000 -c timezone=UTC",
  });
  db = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    (value) => observations.push(value),
  );
  gradeDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(graderRole) }),
  );
  maintenance = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(maintenanceRole) }),
  );
  recoveryDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(recoveryRole) }),
  );
  operatorDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(operatorRole) }),
  );
  auditDb = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(auditRole), DB_POOL_MAX: "1" }),
  );
  const passwords = new ArgonPasswords(2, 8),
    pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  hash = await passwords.hash("ranking fixture password");
  const signing = {
    kid: "ranking",
    privatePem: pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  const tokens = await JwtSessionTokens.create("urn:test:ranking", signing, [signing]),
    createdSecurity = new PostgresSecurity(db, randomBytes(32));
  security = createdSecurity;
  identity = new IdentityService(
    new PostgresIdentityRepository(db),
    db,
    passwords,
    tokens,
    new VerificationCodec("mail", { mail: randomBytes(32) }),
    hash,
    security,
    new PostgresIdempotency(db),
    new PostgresIdentityQuery(db),
    new PostgresAuthenticatedWriteAdmission(db),
  );
  const transport = new HttpSession(identity, security, "http://127.0.0.1:3000", randomBytes(32));
  @Module({
    controllers: [AuditController],
    providers: [
      ShutdownGate,
      { provide: IDENTITY_ACCESS, useValue: identity },
      { provide: REQUEST_GUARD, useValue: transport },
      { provide: AuditService, useValue: reader() },
    ],
  })
  class AuditHttpModule {}
  api = await createHttpApplication(AuditHttpModule);
  http = api.app.getHttpAdapter().getInstance();
  viewer = await user();
  await fixture.query(
    `
      INSERT INTO
        identity.user_roles (user_id, role_id)
      VALUES
        ($1, 'ADMIN')
    `,
    [viewer],
  );
  const session = await identity.login(`${viewer}@example.test`, "ranking fixture password");
  headers = { cookie: `__Host-access=${session.access}` };
  const document = (await SwaggerParser.dereference("docs/contracts/openapi.yaml", {
    resolve: { external: false },
  })) as { components: { schemas: Record<string, AnySchema> } };
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  validate = ajv.compile(document.components.schemas.AuditEntryListEnvelope!);
});

afterAll(async () => {
  await api?.app.close();
  await db?.close();
  await gradeDb?.close();
  await maintenance?.close();
  await recoveryDb?.close();
  await operatorDb?.close();
  await auditDb?.close();
  await fixture?.end();
  for (let n = 0; n < 100; n++) {
    const count = (
      await admin.query<{ n: number }>(
        `
          SELECT
            count(*)::int AS n
          FROM
            pg_stat_activity
          WHERE
            datname = $1
        `,
        [name],
      )
    ).rows[0]!.n;
    if (!count) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.query(
    `DROP ROLE IF EXISTS ${owner}, ${runtimeRole}, ${graderRole}, ${maintenanceRole}, ${recoveryRole}, ${operatorRole}, ${auditRole}`,
  );
  await admin.end();
});

const retained = () => new AuditRetention(new PostgresAuditRetention(auditDb), auditDb, 2);
async function seed(age = "1 hour", extra: Record<string, unknown> = {}) {
  const id = randomUUID(),
    resource = randomUUID(),
    correlation = randomUUID();
  await fixture.query(
    `
      INSERT INTO platform.audit_logs (
        id,
        actor_id,
        actor_type,
        action,
        resource_type,
        resource_id,
        occurred_at,
        correlation_id,
        outcome,
        reason,
        operator_identity,
        changed_fields
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        clock_timestamp() - $7::interval,
        $8,
        $9,
        'PRIVATE_TOKEN_REASON',
        'PRIVATE_OPERATOR_EMAIL',
        $10
      )
    `,
    [
      id,
      extra.actorId === null ? null : (extra.actorId ?? viewer),
      extra.actorType ?? "USER",
      extra.action ?? "catalog.exam.create",
      extra.resourceType ?? "EXAM",
      extra.resourceId === null ? null : resource,
      age,
      correlation,
      extra.outcome ?? "SUCCESS",
      JSON.stringify(
        extra.changedFields ?? ["title", "PRIVATE_TOKEN_FIELD", { body: "PRIVATE_ANSWER" }],
      ),
    ],
  );
  return id;
}
async function count() {
  return (
    await fixture.query(`
      SELECT
        count(*)::int AS n
      FROM
        platform.audit_logs
    `)
  ).rows[0].n as number;
}
async function get(query = "", cookie = headers.cookie) {
  return http.inject({ method: "GET", url: "/v1/admin/audit" + query, headers: { cookie } });
}
function page(r: { json: () => unknown }) {
  const body = r.json() as { data: AuditPage["items"]; metadata: AuditPage["metadata"] };
  expect(validate(body)).toBe(true);
  return body;
}
beforeEach(async () => {
  await fixture.query("TRUNCATE platform.audit_logs");
  observations.length = 0;
});
describe("Primary audit browse and append-only capability", () => {
  it("returns an empty audited page with eight SQL calls and no recursive audit", async () => {
    const r = await get();
    expect(r.statusCode).toBe(200);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(page(r)).toMatchObject({ data: [], metadata: { pageSize: 20, next: null } });
    expect(await count()).toBe(1);
    expect(observations.filter((x) => x.kind === "query")).toHaveLength(8);
    expect(
      (
        await fixture.query(`
          SELECT
            action,
            resource_type
          FROM
            platform.audit_logs
        `)
      ).rows,
    ).toEqual([{ action: "reporting.audit.read", resource_type: "AUDIT_LOG" }]);
  });
  it("redacts source free text, maps failure/null resources and exposes actor type", async () => {
    await seed("1 hour", { resourceId: null, actorType: "OPERATOR", outcome: "FAILURE" });
    const r = await get();
    expect(r.statusCode).toBe(200);
    expect(page(r).data).toHaveLength(1);
    expect(page(r).data[0]).toMatchObject({
      actorType: "OPERATOR",
      resourceId: null,
      reason: null,
      outcome: "FAILED",
      changedFields: ["title"],
    });
    for (const s of ["PRIVATE_TOKEN", "PRIVATE_OPERATOR", "PRIVATE_ANSWER"])
      expect(r.payload).not.toContain(s);
  });
  it("orders equal times by UUID and advances an actor/page-size bound cursor", async () => {
    for (let i = 0; i < 4; i++) await seed();
    await fixture.query(`
      UPDATE
        platform.audit_logs
      SET
        occurred_at = '2026-01-01T00:00:00.000Z'
    `);
    const first = page(await get("?pageSize=2"));
    expect(first.data).toHaveLength(2);
    const second = page(await get("?pageSize=2&cursor=" + first.metadata.next));
    expect(second.data).toHaveLength(2);
    expect(second.metadata.next).toBeNull();
    expect(new Set([...first.data, ...second.data].map((x) => x.id)).size).toBe(4);
    expect((await get("?pageSize=3&cursor=" + first.metadata.next)).statusCode).toBe(400);
  });
  it("makes previous access audits visible on a fresh browse without recursion", async () => {
    await get();
    const r = await get();
    expect(page(r).data.some((x) => x.action === "reporting.audit.read")).toBe(true);
    expect(await count()).toBe(2);
  });
  it.each([
    "?pageSize=0",
    "?pageSize=101",
    "?pageSize=2&pageSize=3",
    "?cursor=",
    "?cursor=bad",
    "?actorId=bad",
    "?offset=10",
  ])("rejects unsupported query %s", async (q) => {
    expect((await get(q)).statusCode).toBe(400);
    expect(await count()).toBe(0);
  });
  it("authenticates/authorizes before query parsing", async () => {
    const candidate = await user();
    const s = await identity.login(`${candidate}@example.test`, "ranking fixture password");
    await fixture.query("TRUNCATE platform.audit_logs");
    expect((await get("?pageSize=bad", `__Host-access=${s.access}`)).statusCode).toBe(403);
    expect((await get("?pageSize=bad", "")).statusCode).toBe(401);
    expect(await count()).toBe(0);
  });
  it("uses audit.read independently of reporting.read", async () => {
    await fixture.query(
      `
        DELETE
        FROM
          identity.role_permissions
        WHERE
          role_id = 'ADMIN'
          AND permission_id = 'reporting.read'
      `,
    );
    try {
      expect((await get()).statusCode).toBe(200);
    } finally {
      await fixture.query(`
        INSERT INTO identity.role_permissions VALUES('ADMIN', 'reporting.read')
      `);
    }
  });
  it("revalidates permission after authentication", async () => {
    const raw = headers.cookie.split("=")[1]!;
    await identity.authenticate(raw);
    await fixture.query(
      `
        DELETE
        FROM
          identity.role_permissions
        WHERE
          role_id = 'ADMIN'
          AND permission_id = 'audit.read'
      `,
    );
    try {
      await expect(
        reader().page({
          raw,
          actorId: viewer,
          correlationId: randomUUID(),
          pageSize: 20,
          cursor: null,
        }),
      ).rejects.toMatchObject({ category: "forbidden" });
      expect(await count()).toBe(0);
    } finally {
      await fixture.query(`
        INSERT INTO identity.role_permissions VALUES('ADMIN', 'audit.read')
      `);
    }
  });
  it("releases no page when mandatory access audit fails", async () => {
    await seed();
    await fixture.query(
      `
        CREATE FUNCTION platform.au_fail()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.action = 'reporting.audit.read' THEN
            RAISE EXCEPTION 'fixture';
          END IF;
          RETURN NEW;
        END
        $$
      `,
    );
    await fixture.query(
      `
        CREATE TRIGGER au_fail
        BEFORE INSERT ON platform.audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION platform.au_fail()
      `,
    );
    try {
      const r = await get();
      expect(r.statusCode).toBe(503);
      expect(r.json().data).toBeNull();
      expect(await count()).toBe(1);
    } finally {
      await fixture.query("DROP TRIGGER au_fail ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.au_fail()");
    }
    expect((await get()).statusCode).toBe(200);
  });
  it("bounds current actor locks and recovers", async () => {
    const c = await fixture.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        `
          SELECT
            id
          FROM
            identity.users
          WHERE
            id = $1
          FOR UPDATE
        `,
        [viewer],
      );
      const start = performance.now();
      expect((await get()).statusCode).toBe(503);
      expect(performance.now() - start).toBeLessThan(2500);
      expect(await count()).toBe(0);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect((await get()).statusCode).toBe(200);
  });
  it("preserves API append-only privileges and isolates maintenance authority", async () => {
    for (const connection of [db, operatorDb, gradeDb, maintenance, recoveryDb]) {
      await expect(
        connection.query(
          "diagnostic",
          `
            SELECT
              platform.prune_audit(2, $1)
          `,
          [randomUUID()],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    }
    const restricted = await fixture.connect();
    try {
      for (const role of [
        "examination_mail_worker",
        "examination_expiry_worker",
        "examination_dispatch_worker",
      ]) {
        // Reviewed static role names, never caller-supplied identifiers.
        await restricted.query(`SET ROLE ${role}`);
        await expect(
          restricted.query(
            `
              SELECT
                platform.prune_audit(2, $1)
            `,
            [randomUUID()],
          ),
        ).rejects.toMatchObject({ code: "42501" });
        await restricted.query("RESET ROLE");
      }
    } finally {
      await restricted.query("RESET ROLE");
      restricted.release();
    }
    for (const sql of [
      `
        DELETE
        FROM
          platform.audit_logs
      `,
      `
        UPDATE
          platform.audit_logs
        SET
          outcome = 'DENIED'
      `,
      "TRUNCATE platform.audit_logs",
    ]) {
      await expect(db.query("diagnostic", sql)).rejects.toMatchObject({ code: "42501" });
      await expect(auditDb.query("diagnostic", sql)).rejects.toMatchObject({ code: "42501" });
    }
    await expect(
      auditDb.query(
        "diagnostic",
        `
          SELECT
            *
          FROM
            identity.users
        `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      auditDb.query(
        "diagnostic",
        `
          SELECT
            id
          FROM
            platform.audit_logs
        `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      auditDb.query(
        "diagnostic",
        `
          INSERT INTO platform.audit_logs (
            id,
            action,
            correlation_id,
            outcome
          )
          VALUES (
            gen_random_uuid(),
            'platform.audit.prune',
            gen_random_uuid(),
            'SUCCESS'
          )
        `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      auditDb.query(
        "diagnostic",
        `
          SELECT
            assessment.retention_facts($1::uuid)
        `,
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(auditDb.query("diagnostic", "SET ROLE examination_owner")).rejects.toMatchObject({
      code: "42501",
    });
  });
});
describe("Fixed365day technical audit maintenance", () => {
  it("purges only an oldest bounded batch and audits atomically; no-op emits nothing", async () => {
    const a = await seed("400 days"),
      b = await seed("399 days"),
      c = await seed("398 days");
    await seed("364 days");
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 2 });
    expect(
      (
        await fixture.query(
          `
            SELECT
              id
            FROM
              platform.audit_logs
            WHERE
              id = ANY($1::uuid[])
          `,
          [[a, b, c]],
        )
      ).rows,
    ).toEqual([{ id: c }]);
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 1 });
    const n = await count();
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 0 });
    expect(await count()).toBe(n);
    expect(
      (
        await fixture.query(
          `
            SELECT
              actor_type,
              reason,
              operator_identity,
              changed_fields
            FROM
              platform.audit_logs
            WHERE
              action = 'platform.audit.prune'
          `,
        )
      ).rows,
    ).toHaveLength(2);
  });
  it("protects the exact fixed cutoff, young/future and nonfinite timestamps", async () => {
    await seed("364 days");
    await seed("-1 day");
    await fixture.query(
      `
        INSERT INTO platform.audit_logs (
          id,
          actor_type,
          action,
          correlation_id,
          outcome,
          occurred_at
        )
        VALUES (
          gen_random_uuid(),
          'SYSTEM',
          'platform.audit.prune',
          gen_random_uuid(),
          'SUCCESS',
          '-infinity'
        )
      `,
    );
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 0 });
    await fixture
      .query(
        `
          WITH boundary AS (
            INSERT INTO platform.audit_logs (
              id,
              actor_type,
              action,
              correlation_id,
              outcome,
              occurred_at
            )
            VALUES (
              gen_random_uuid(),
              'SYSTEM',
              'platform.audit.prune',
              gen_random_uuid(),
              'SUCCESS',
              date_trunc('milliseconds', statement_timestamp()) - interval '365 days'
            )
            RETURNING
              id
          )
          SELECT
            platform.prune_audit(2, $1) AS count
          FROM
            boundary
        `,
        [randomUUID()],
      )
      .then((r) => expect(r.rows[0].count).toBe(0));
    expect(await count()).toBe(4);
  });
  it.each([0, 1001, null])("rejects caller batch override %s", async (batch) => {
    await expect(
      auditDb.query(
        "audit.prune",
        `
          SELECT
          platform.prune_audit($1, $2)
        `,
        [batch, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "22023" });
  });
  it("rejects missing correlation without deleting", async () => {
    await seed("400 days");
    await expect(
      auditDb.query(
        "audit.prune",
        `
          SELECT
          platform.prune_audit(2, NULL)
        `,
      ),
    ).rejects.toMatchObject({ code: "22023" });
    expect(await count()).toBe(1);
  });
  it("rolls back deleted rows when its own audit insert fails", async () => {
    await seed("400 days");
    await fixture.query(
      `
        CREATE FUNCTION platform.au_prune_fail()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.action = 'platform.audit.prune' THEN
            RAISE EXCEPTION 'fixture';
          END IF;
          RETURN NEW;
        END
        $$
      `,
    );
    await fixture.query(
      `
        CREATE TRIGGER au_prune_fail
        BEFORE INSERT ON platform.audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION platform.au_prune_fail()
      `,
    );
    try {
      await expect(retained().runOnce(randomUUID())).rejects.toThrow();
      expect(await count()).toBe(1);
    } finally {
      await fixture.query("DROP TRIGGER au_prune_fail ON platform.audit_logs");
      await fixture.query("DROP FUNCTION platform.au_prune_fail()");
    }
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 1 });
  });
  it("skips locked rows and concurrent batches never purge a row twice", async () => {
    const locked = await seed("410 days");
    for (let i = 0; i < 4; i++) await seed("400 days");
    const holder = await fixture.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        `
          SELECT
            id
          FROM
            platform.audit_logs
          WHERE
            id = $1
          FOR UPDATE
        `,
        [locked],
      );
      const values = await Promise.all([
        retained().runOnce(randomUUID()),
        retained().runOnce(randomUUID()),
      ]);
      expect(values.map((x) => x.purgedRows)).toEqual([2, 2]);
      expect(
        (
          await fixture.query(
            `
              SELECT
                id
              FROM
                platform.audit_logs
              WHERE
                id = $1
            `,
            [locked],
          )
        ).rowCount,
      ).toBe(1);
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
    expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 1 });
  });
  it("acknowledges no deletion after an explicit transaction rollback", async () => {
    const id = await seed("400 days");
    await expect(
      auditDb.transaction(async () => {
        await new PostgresAuditRetention(auditDb).prune(2, randomUUID());
        throw Error("crash before commit");
      }),
    ).rejects.toThrow("crash before commit");
    expect(
      (
        await fixture.query(
          `
            SELECT
              id
            FROM
              platform.audit_logs
            WHERE
              id = $1
          `,
          [id],
        )
      ).rowCount,
    ).toBe(1);
    expect(await count()).toBe(1);
  });
  it("is disabled without DB I/O, checks authority and runs one opt-in batch", async () => {
    const events: Record<string, unknown>[] = [];
    await runAuditRetentionJob(
      { AUDIT_RETENTION_ENABLED: "false" },
      () => false,
      (e) => events.push(e),
    );
    expect(events).toEqual([{ event: "audit.retention.disabled" }]);
    await expect(
      runAuditRetentionJob(
        { NODE_ENV: "test", AUDIT_RETENTION_ENABLED: "true", DATABASE_URL: url(runtimeRole) },
        () => false,
        () => undefined,
      ),
    ).rejects.toThrow("Maintenance authority required");
    await seed("400 days");
    expect(
      await runAuditRetentionJob(
        {
          NODE_ENV: "test",
          AUDIT_RETENTION_ENABLED: "true",
          DATABASE_URL: url(auditRole),
          AUDIT_RETENTION_BATCH: "2",
        },
        () => false,
        (e) => events.push(e),
      ),
    ).toEqual({ purgedRows: 1 });
  });
});

async function until(check: () => Promise<boolean>) {
  const end = performance.now() + 5000;
  while (performance.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Fixture wait expired");
}
it("drains an admitted compiled purge on SIGTERM and admits only its bounded batch", async () => {
  for (let i = 0; i < 3; i++) await seed("400 days");
  const held = await fixture.connect();
  await held.query("BEGIN");
  await held.query("LOCK TABLE platform.audit_logs IN SHARE MODE");
  let output = "";
  const child = spawn(process.execPath, ["dist/workers/scheduler/audit-retention.main.js"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: url(auditRole),
      AUDIT_RETENTION_ENABLED: "true",
      AUDIT_RETENTION_BATCH: "2",
      DB_LOCK_TIMEOUT_MS: "5000",
      DB_STATEMENT_TIMEOUT_MS: "10000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (b) => (output += b));
  child.stderr.on("data", (b) => (output += b));
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  try {
    await until(async () =>
      Boolean(
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
            [auditRole],
          )
        ).rowCount,
      ),
    );
    child.kill("SIGTERM");
    await until(async () => output.includes("audit.retention.stopping"));
    await held.query("ROLLBACK");
    expect(await exited).toBe(0);
    expect(output).toContain('"purgedRows":2');
    expect(
      (
        await fixture.query(
          `
            SELECT
              count(*)::int AS n
            FROM
              platform.audit_logs
            WHERE
              action = 'catalog.exam.create'
          `,
        )
      ).rows[0].n,
    ).toBe(1);
  } finally {
    await held.query("ROLLBACK");
    held.release();
    if (child.exitCode === null) child.kill("SIGTERM");
    await exited;
  }
});
it("restores a real disposable dump with grants and reapplies retention before reopening", async () => {
  const old = await seed("400 days"),
    young = await seed("1 day"),
    restoreName = "audit_restore_" + randomUUID().replaceAll("-", "");
  const dumpStarted = performance.now(),
    dump = execFileSync(
      "docker",
      [
        "exec",
        "examination-identity-https-postgres-1",
        "pg_dump",
        "-U",
        "examination_https",
        "-d",
        name,
        "-Fc",
      ],
      { maxBuffer: 20 * 1024 * 1024 },
    ),
    dumpMs = performance.now() - dumpStarted;
  expect(await retained().runOnce(randomUUID())).toEqual({ purgedRows: 1 });
  await admin.query(`CREATE DATABASE ${restoreName}`);
  const restoredUrl = new URL(base);
  restoredUrl.pathname = "/" + restoreName;
  let restored: Pool | undefined,
    runtimeRestored: PostgresDatabase | undefined,
    purgeRestored: PostgresDatabase | undefined;
  try {
    const started = performance.now();
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "examination-identity-https-postgres-1",
        "pg_restore",
        "-U",
        "examination_https",
        "-d",
        restoreName,
        "--exit-on-error",
      ],
      { input: dump, maxBuffer: 2 * 1024 * 1024 },
    );
    const restoreMs = performance.now() - started;
    restored = new Pool({ connectionString: restoredUrl.toString(), max: 1 });
    expect(
      (
        await restored.query(
          `
            SELECT
              id
            FROM
              platform.audit_logs
            WHERE
              id = $1
          `,
          [old],
        )
      ).rowCount,
    ).toBe(1);
    const runtimeUrl = new URL(url(runtimeRole));
    runtimeUrl.pathname = "/" + restoreName;
    runtimeRestored = new PostgresDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: runtimeUrl.toString() }),
    );
    await expect(
      runtimeRestored.query(
        "diagnostic",
        `
          DELETE
          FROM
            platform.audit_logs
        `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    const maintenanceUrl = new URL(url(auditRole));
    maintenanceUrl.pathname = "/" + restoreName;
    purgeRestored = new PostgresDatabase(
      databaseConfig({
        NODE_ENV: "test",
        DATABASE_URL: maintenanceUrl.toString(),
        DB_POOL_MAX: "1",
      }),
    );
    expect(
      await new AuditRetention(new PostgresAuditRetention(purgeRestored), purgeRestored, 2).runOnce(
        randomUUID(),
      ),
    ).toEqual({ purgedRows: 1 });
    expect(
      (
        await restored.query(
          `
            SELECT
              id
            FROM
              platform.audit_logs
            WHERE
              id = $1
          `,
          [young],
        )
      ).rowCount,
    ).toBe(1);
    expect(
      (
        await restored.query(
          `
            SELECT
              id
            FROM
              platform.audit_logs
            WHERE
              id = $1
          `,
          [old],
        )
      ).rowCount,
    ).toBe(0);
    const directory = process.env.ADMIN_AUDIT_EVIDENCE_DIR;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/restore-${randomUUID()}.json`,
        JSON.stringify(
          {
            localOnly: true,
            dumpBytes: dump.length,
            dumpMs,
            restoreMs,
            originalOldRowResurrected: true,
            oldRowRemovedAgain: true,
            youngRowPreserved: true,
            runtimeDeleteDenied: true,
            ownershipAndGrantsRestored: true,
            productionPitr: false,
            rpo: null,
            rto: null,
            privacyLedgerReconciled: false,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await runtimeRestored?.close();
    await purgeRestored?.close();
    await restored?.end();
    await until(
      async () =>
        !(
          await admin.query(
            `
              SELECT
                1
              FROM
                pg_stat_activity
              WHERE
                datname = $1
            `,
            [restoreName],
          )
        ).rowCount,
    );
    await admin.query(`DROP DATABASE ${restoreName}`);
  }
}, 30000);
function percentile(values: number[]) {
  const a = [...values].sort((x, y) => x - y),
    p = (n: number) => a[Math.ceil(n * a.length) - 1]!;
  return { n: values.length, p50: p(0.5), p95: p(0.95), p99: p(0.99) };
}
it("records bounded500/1000-row retention batches over36000 eligible records", async () => {
  await fixture.query(
    `
      INSERT INTO platform.audit_logs (
        id,
        actor_type,
        action,
        correlation_id,
        outcome,
        occurred_at
      )
      SELECT
        gen_random_uuid(),
        'SYSTEM',
        'platform.audit.prune',
        gen_random_uuid(),
        'SUCCESS',
        statement_timestamp() - interval '400 days' + g * interval '1 millisecond'
      FROM
        generate_series(1, 36000) g
    `,
  );
  await fixture.query("ANALYZE platform.audit_logs");
  const events: DatabaseObservation[] = [],
    measured = new PostgresDatabase(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(auditRole), DB_POOL_MAX: "1" }),
      (event) => events.push(event),
    ),
    populations: unknown[] = [];
  try {
    for (const batch of [500, 1000]) {
      const workflow = new AuditRetention(new PostgresAuditRetention(measured), measured, batch);
      for (let i = 0; i < 3; i++)
        expect(await workflow.runOnce(randomUUID())).toEqual({ purgedRows: batch });
      const raw: number[] = [],
        transactions: number[] = [],
        acquires: number[] = [];
      const cpu = process.cpuUsage();
      for (let i = 0; i < 20; i++) {
        events.length = 0;
        const started = performance.now();
        expect(await workflow.runOnce(randomUUID())).toEqual({ purgedRows: batch });
        raw.push(performance.now() - started);
        expect(events.filter((event) => event.kind === "query")).toHaveLength(3);
        transactions.push(
          ...events.filter((e) => e.kind === "transaction").map((e) => e.durationMs),
        );
        acquires.push(...events.filter((e) => e.kind === "acquire").map((e) => e.durationMs));
      }
      const used = process.cpuUsage(cpu);
      populations.push({
        batch,
        warmups: 3,
        measuredBatches: 20,
        sqlCallsPerBatch: 3,
        rawLatencyMs: raw,
        latencyMs: percentile(raw),
        rawTransactionMs: transactions,
        transactionMs: percentile(transactions),
        rawAcquireMs: acquires,
        acquireMs: percentile(acquires),
        harnessCpuMsPerBatch: (used.user + used.system) / 20000,
      });
    }
    expect(await count()).toBe(1546);
    const directory = process.env.ADMIN_AUDIT_EVIDENCE_DIR;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/retention-${randomUUID()}.json`,
        JSON.stringify(
          {
            localOnly: true,
            syntheticEligibleRows: 36000,
            poolMax: 1,
            concurrentJobs: 1,
            matchedPerformanceComparison: false,
            sustainableJobsPerSecond: null,
            awsCost: null,
            populations,
            decision:
              "Bounded commit-time diagnostic only; retain default500, no optimal sizing claim",
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await measured.close();
  }
}, 30000);
it("records natural100k first/deep query plans and paced local HTTP with eight SQL calls", async () => {
  await fixture.query(
    `
      INSERT INTO platform.audit_logs (
        id,
        actor_id,
        action,
        resource_type,
        resource_id,
        correlation_id,
        outcome,
        occurred_at,
        changed_fields,
        reason
      )
      SELECT
        ('77777777-7777-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
        $1,
        'catalog.exam.create',
        'EXAM',
        gen_random_uuid(),
        gen_random_uuid(),
        'SUCCESS',
        statement_timestamp() - interval '1 hour' + g * interval '1 millisecond',
        '["title","PRIVATE_TOKEN_FIELD"]',
        'PRIVATE_TOKEN_REASON'
      FROM
        generate_series(1, 100000) g
    `,
    [viewer],
  );
  await fixture.query("ANALYZE platform.audit_logs");
  let sql = "",
    bindings: unknown[] = [];
  class Measured extends PostgresDatabase {
    override async query<T extends QueryResultRow = QueryResultRow>(
      operation: DatabaseOperation,
      statement: string,
      parameters: unknown[] = [],
    ) {
      if (operation === "reporting.read") {
        sql = statement;
        bindings = parameters;
      }
      return super.query<T>(operation, statement, parameters);
    }
  }
  const measured = new Measured(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: url(runtimeRole), DB_POOL_MAX: "2" }),
    ),
    query = new PostgresAuditQuery(measured),
    clock = (await query.page({ limit: 101, watermark: null, position: null })).serverNow;
  const deep = (
      await fixture.query(
        `
          SELECT
            occurred_at,
            id
          FROM
            platform.audit_logs
          WHERE
            id = '77777777-7777-4000-8000-000000010000'
        `,
      )
    ).rows[0],
    position: [string, string] = [deep.occurred_at.toISOString(), deep.id],
    populations: unknown[] = [];
  try {
    for (const stage of ["first", "deep"] as const) {
      const q = { limit: 101, watermark: clock, position: stage === "deep" ? position : null };
      for (let i = 0; i < 3; i++) await query.page(q);
      const raw: number[] = [],
        at = performance.now(),
        cpu = process.cpuUsage();
      for (let i = 0; i < 20; i++) {
        const s = performance.now();
        expect((await query.page(q)).rows).toHaveLength(101);
        raw.push(performance.now() - s);
      }
      const queryElapsedMs = performance.now() - at,
        queryCpu = process.cpuUsage(cpu),
        plan = (
          await measured.query(
            "diagnostic",
            `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
            bindings,
          )
        ).rows[0]!["QUERY PLAN"];
      const cursor =
        stage === "deep"
          ? new AuditCrypto(Buffer.alloc(32, 9)).sign(
              { actorId: viewer, pageSize: 100 },
              { watermark: clock, position, expiresAt: Date.parse(clock) + 900000 },
            )
          : null;
      const latencies: number[] = [],
        bytes: number[] = [],
        tx: number[] = [],
        acquire: number[] = [];
      let start = 0,
        httpCpu = process.cpuUsage();
      for (let i = 0; i < 23; i++) {
        await new Promise((r) => setTimeout(r, 110));
        observations.length = 0;
        const s = performance.now();
        if (i === 3) {
          start = s;
          httpCpu = process.cpuUsage();
        }
        const r = await get("?pageSize=100" + (cursor ? "&cursor=" + cursor : ""));
        expect(r.statusCode).toBe(200);
        expect(page(r).data).toHaveLength(100);
        expect(observations.filter((x) => x.kind === "query")).toHaveLength(8);
        expect(Buffer.byteLength(r.payload)).toBeLessThan(262144);
        expect(r.payload).not.toContain("PRIVATE_TOKEN");
        if (i >= 3) {
          latencies.push(performance.now() - s);
          bytes.push(Buffer.byteLength(r.payload));
          tx.push(...observations.filter((x) => x.kind === "transaction").map((x) => x.durationMs));
          acquire.push(
            ...observations.filter((x) => x.kind === "acquire").map((x) => x.durationMs),
          );
        }
      }
      const httpElapsedMs = performance.now() - start,
        httpUsed = process.cpuUsage(httpCpu);
      populations.push({
        stage,
        rows: 100000,
        syntheticAuditRecords: true,
        realBusinessLifecycleLoad: false,
        query: {
          warmups: 3,
          rawLatencyMs: raw,
          latencyMs: percentile(raw),
          sequentialRps: 20000 / queryElapsedMs,
          harnessCpuMsPerQuery: (queryCpu.user + queryCpu.system) / 20000,
          plan,
          bindings,
        },
        http: {
          warmups: 3,
          rawLatencyMs: latencies,
          latencyMs: percentile(latencies),
          rawPayloadBytes: bytes,
          payloadBytes: percentile(bytes),
          rawTransactionMs: tx,
          transactionMs: percentile(tx),
          rawAcquireMs: acquire,
          acquireMs: percentile(acquire),
          sqlCalls: 8,
          paceMs: 110,
          achievedSuccessfulRps: 20000 / httpElapsedMs,
          harnessCpuMsPerRequest: (httpUsed.user + httpUsed.system) / 20000,
          errors: 0,
        },
        rssBytes: process.memoryUsage().rss,
      });
    }
    const directory = process.env.ADMIN_AUDIT_EVIDENCE_DIR;
    if (directory) {
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/diagnostic-${randomUUID()}.json`,
        JSON.stringify(
          {
            localOnly: true,
            notCapacityEvidence: true,
            nodeVersion: process.version,
            architecture: process.arch,
            poolMax: 2,
            sqlSha256: createHash("sha256").update(sql).digest("hex"),
            populations,
            dbCpu: null,
            dbIops: null,
            allocationPerRequest: null,
            sustainableRps: null,
            awsCost: null,
            decision:
              "Existing audit_retention index baseline; no optimization or production sizing winner",
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
    }
  } finally {
    await measured.close();
  }
}, 90000);
