import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import {
  PostgresDatabase,
  DatabaseError,
  DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import {
  loadMigrations,
  migrate,
  SqlMigration,
} from "../../src/infrastructure/database/migration-runner";

// Explicit disposable DB names. Never truncate the main local development database.
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl)
  throw new Error("TEST_DATABASE_ADMIN_URL required (Compose local administrator only)");
const base = new URL(adminUrl);
const dbName = `exam_test_${randomUUID().replaceAll("-", "")}`;
const migrationUrl = new URL(base);
migrationUrl.pathname = `/${dbName}`;
const suffix = dbName.slice(-16);
const migratorRole = `exam_migrator_${suffix}`;
const runtimeRole = `exam_runtime_${suffix}`;
const password = randomUUID();
const ddlUrl = new URL(migrationUrl);
ddlUrl.username = migratorRole;
ddlUrl.password = password;
const runtimeUrl = new URL(migrationUrl);
runtimeUrl.username = runtimeRole;
runtimeUrl.password = password;
const config = databaseConfig({
  NODE_ENV: "test",
  DATABASE_URL: runtimeUrl.toString(),
});
const migrationConfig = databaseConfig({
  NODE_ENV: "test",
  DATABASE_URL: ddlUrl.toString(),
});
const admin = new Pool({ connectionString: adminUrl, max: 1 });
let db: PostgresDatabase;
let fixture: Pool;
let migrations: SqlMigration[];
const fixturePoolErrors: string[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function sqlMigration(name: string, sql: string): SqlMigration {
  return {
    name,
    sql,
    checksum: createHash("sha256").update(sql).digest("hex"),
  };
}

beforeAll(async () => {
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${dbName} TO examination_owner`);
  await admin.query(`CREATE ROLE ${migratorRole} LOGIN NOINHERIT PASSWORD '${password}'`);
  await admin.query(`CREATE ROLE ${runtimeRole} LOGIN INHERIT PASSWORD '${password}'`);
  await admin.query(`GRANT examination_owner TO ${migratorRole}`);
  await admin.query(`GRANT examination_runtime TO ${runtimeRole}`);
  fixture = new Pool({ connectionString: migrationUrl.toString(), max: 3 });
  fixture.on("error", (error) => {
    fixturePoolErrors.push(
      "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN",
    );
  });
  migrations = await loadMigrations("apps/api/src/infrastructure/database/migrations");
  await migrate(migrationConfig, migrations);
  await fixture.query(await readFile("infra/database/observability.sql", "utf8"));
  await fixture.query(
    "CREATE TABLE platform.transaction_fixture (id text PRIMARY KEY, value integer NOT NULL)",
  );
  await fixture.query(
    "GRANT SELECT, INSERT, UPDATE ON platform.transaction_fixture TO examination_runtime",
  );
  db = new PostgresDatabase(config);
});
afterAll(async () => {
  await db?.close();
  await fixture?.end();
  // Wait for server-side socket close, rather than force terminating closing clients.
  let connections = 1;
  for (let i = 0; i < 100 && connections; i += 1) {
    connections = (
      await admin.query(
        `
      SELECT
        count(*)::int AS n
      FROM
        pg_stat_activity
      WHERE
        datname = $1
      `,
        [dbName],
      )
    ).rows[0]!.n;
    if (connections) await new Promise((done) => setTimeout(done, 10));
  }
  expect(connections).toBe(0);
  expect(fixturePoolErrors).toEqual([]);
  await admin.query(`DROP DATABASE IF EXISTS ${dbName}`);
  await admin.query(`DROP ROLE IF EXISTS ${migratorRole}, ${runtimeRole}`);
  await admin.end();
});
beforeEach(async () => {
  await fixture.query("TRUNCATE platform.transaction_fixture");
});

async function user(): Promise<string> {
  const id = randomUUID();
  await db.query(
    "diagnostic",
    `
    INSERT INTO
      identity.users (id, email, password_hash, display_name)
    VALUES
      ($1, $2, $3, $4)
    `,
    [id, `${id}@example.test`, "fixture-not-a-real-password-hash", "Fixture"],
  );
  return id;
}
async function publication(existing?: { exam: string }) {
  const actor = await user();
  const exam = existing?.exam ?? randomUUID();
  const version = randomUUID();
  const section = randomUUID();
  const question = randomUUID();
  const options = [randomUUID(), randomUUID()];
  await db.transaction(async () => {
    if (!existing)
      await db.query(
        "diagnostic",
        `
        INSERT INTO
          catalog.exams (id, title, category, duration_seconds, attempt_limit, opens_at, closes_at)
        VALUES
          (
            $1,
            'Fixture',
            'IT_CERTIFICATION',
            3600,
            3,
            clock_timestamp() - interval '1 hour',
            clock_timestamp() + interval '1 day'
          )
        `,
        [exam],
      );
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        catalog.published_versions (
          id,
          exam_id,
          version,
          title,
          description,
          duration_seconds,
          attempt_limit,
          opens_at,
          closes_at,
          display_timezone,
          explanation_policy,
          published_by
        )
      VALUES
        (
          $1,
          $2,
          $4,
          'Frozen',
          '',
          3600,
          3,
          clock_timestamp() - interval '1 hour',
          clock_timestamp() + interval '1 day',
          'UTC',
          'NEVER',
          $3
        )
      `,
      [version, exam, actor, existing ? 2 : 1],
    );
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        catalog.published_sections
      VALUES
        ($1, $2, 'Section', 1)
      `,
      [version, section],
    );
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        catalog.published_questions
      VALUES
        ($1, $2, $3, $4, 1, 'SINGLE_CHOICE', 'Question', 'Explanation', 10, 1)
      `,
      [version, question, section, randomUUID()],
    );
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        catalog.published_options
      VALUES
        ($1, $2, $3, 1, 'A'),
        ($1, $2, $4, 2, 'B')
      `,
      [version, question, ...options],
    );
    await db.query(
      "diagnostic",
      `
    INSERT INTO
      catalog.published_answer_keys
    VALUES
      ($1, $2, $3)
    `,
      [version, question, options[0]],
    );
    await db.query(
      "diagnostic",
      `
      UPDATE catalog.exams
      SET
        current_version_id = $2,
        published = true
      WHERE
        id = $1
      `,
      [exam, version],
    );
  });
  return { actor, exam, version, section, question, options };
}
async function attempt(p: Awaited<ReturnType<typeof publication>>, actor?: string) {
  const id = randomUUID();
  const owner = actor ?? (await user());
  await db.query(
    "diagnostic",
    `
    INSERT INTO
      assessment.attempts (
        id,
        user_id,
        exam_id,
        version_id,
        status,
        started_at,
        deadline,
        revision
      )
    VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'IN_PROGRESS',
        clock_timestamp(),
        clock_timestamp() + interval '1 hour',
        1
      )
    `,
    [id, owner, p.exam, p.version],
  );
  return { id, owner };
}

describe("capability schema and runtime privileges", () => {
  it("preserves the first accepted submission identity and timestamp", async () => {
    const p = await publication();
    const a = await attempt(p);
    await db.query(
      "diagnostic",
      `
      UPDATE assessment.attempts
      SET
        status = 'SUBMITTED',
        submitted_at = clock_timestamp(),
        submission_id = $2,
        submission_event_id = $3,
        submission_kind = 'MANUAL'
      WHERE
        id = $1
      `,
      [a.id, randomUUID(), randomUUID()],
    );
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE assessment.attempts
      SET
        submission_id = $2
      WHERE
        id = $1
      `,
        [a.id, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
        UPDATE assessment.attempts
        SET
          submitted_at = submitted_at + interval '1 second'
        WHERE
          id = $1
        `,
        [a.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("keeps the public category frozen when the exam draft category changes", async () => {
    const p = await publication();
    await db.query(
      "diagnostic",
      `
    UPDATE catalog.exams
    SET
      category = 'CORPORATE'
    WHERE
      id = $1
    `,
      [p.exam],
    );
    expect(
      (
        await fixture.query(
          `
        SELECT
          category
        FROM
          catalog.published_versions
        WHERE
          id = $1
        `,
          [p.version],
        )
      ).rows[0]!.category,
    ).toBe("IT_CERTIFICATION");
  });
  it("rejects normalized duplicate users and invalid duration/time constraints", async () => {
    const owner = await user();
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          identity.users
        SELECT
          $1,
          email,
          password_hash,
          display_name,
          enabled,
          leaderboard_opt_in,
          privacy_requested_at,
          created_at
        FROM
          identity.users
        WHERE
          id = $2
        `,
        [randomUUID(), owner],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    const p = await publication();
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE catalog.exams
      SET
        duration_seconds = 0
      WHERE
        id = $1
      `,
        [p.exam],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE catalog.exams
      SET
        closes_at = opens_at
      WHERE
        id = $1
      `,
        [p.exam],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("prevents an incomplete publication from committing", async () => {
    const p = await publication();
    const id = randomUUID();
    await expect(
      db.transaction(async () => {
        await db.query(
          "diagnostic",
          `
          INSERT INTO
            catalog.published_versions (
              id,
              exam_id,
              version,
              title,
              description,
              duration_seconds,
              attempt_limit,
              opens_at,
              closes_at,
              display_timezone,
              explanation_policy,
              published_by
            )
          SELECT
            $1,
            exam_id,
            2,
            title,
            description,
            duration_seconds,
            attempt_limit,
            opens_at,
            closes_at,
            display_timezone,
            explanation_policy,
            published_by
          FROM
            catalog.published_versions
          WHERE
            id = $2
          `,
          [id, p.version],
        );
      }),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (
        await fixture.query(
          `
      SELECT
        id
      FROM
        catalog.published_versions
      WHERE
        id = $1
      `,
          [id],
        )
      ).rowCount,
    ).toBe(0);
  });
  it("seals publications against later append and denies snapshot UPDATE/DELETE", async () => {
    const p = await publication();
    await expect(
      db.query(
        "diagnostic",
        `
      INSERT INTO
        catalog.published_sections
      VALUES
        ($1, $2, 'Late', 2)
      `,
        [p.version, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
        UPDATE catalog.published_versions
        SET
          duration_seconds = 60
        WHERE
          id = $1
        `,
        [p.version],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "diagnostic",
        `
      DELETE FROM catalog.published_questions
      WHERE
        version_id = $1
      `,
        [p.version],
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("enforces one active attempt across versions of one logical exam", async () => {
    const p = await publication();
    const a = await attempt(p);
    const next = await publication(p);
    await expect(attempt(next, a.owner)).rejects.toMatchObject({
      code: "23505",
    });
  });
  it("rejects foreign frozen question and option membership and duplicate selections", async () => {
    const p = await publication();
    const foreign = await publication();
    const a = await attempt(p);
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.answers
        VALUES
          ($1, $2, $3, 1, false, clock_timestamp())
        `,
        [a.id, p.version, foreign.question],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.answers
        VALUES
          ($1, $2, $3, 1, false, clock_timestamp())
        `,
        [a.id, foreign.version, foreign.question],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        assessment.answers
      VALUES
        ($1, $2, $3, 1, false, clock_timestamp())
      `,
      [a.id, p.version, p.question],
    );
    await expect(
      db.query(
        "diagnostic",
        `
      INSERT INTO
        assessment.answer_selections
      VALUES
        ($1, $2, $3, $4)
      `,
        [a.id, p.version, p.question, foreign.options[0]],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await db.query(
      "diagnostic",
      `
    INSERT INTO
      assessment.answer_selections
    VALUES
      ($1, $2, $3, $4)
    `,
      [a.id, p.version, p.question, p.options[0]],
    );
    await expect(
      db.query(
        "diagnostic",
        `
      INSERT INTO
        assessment.answer_selections
      VALUES
        ($1, $2, $3, $4)
      `,
        [a.id, p.version, p.question, p.options[0]],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejects incoherent submission and negative answer version", async () => {
    const p = await publication();
    const a = await attempt(p);
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE assessment.attempts
      SET
        status = 'SUBMITTED'
      WHERE
        id = $1
      `,
        [a.id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.answers
        VALUES
          ($1, $2, $3, 0, false, clock_timestamp())
        `,
        [a.id, p.version, p.question],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("keeps receipt and result identities unique and actor/version result ownership consistent", async () => {
    const p = await publication();
    const a = await attempt(p);
    const key = randomUUID();
    const receipt = [a.owner, key, Buffer.alloc(32), "fixture", a.id];
    await db.query(
      "diagnostic",
      `
      INSERT INTO
        platform.idempotency_receipts (actor_id, key, fingerprint, operation, resource_id, http_status, response)
      VALUES
        ($1, $2, $3, $4, $5, 200, '{}')
      `,
      receipt,
    );
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          platform.idempotency_receipts (actor_id, key, fingerprint, operation, resource_id, http_status, response)
        VALUES
          ($1, $2, $3, $4, $5, 200, '{}')
        `,
        receipt,
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.results (
            attempt_id,
            version_id,
            user_id,
            earned_points,
            possible_points,
            correct_count,
            question_count
          )
        VALUES
          ($1, $2, $3, 10, 10, 1, 1)
        `,
        [a.id, p.version, p.actor],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await db.transaction(async () => {
      await db.query(
        "diagnostic",
        `
        UPDATE assessment.attempts
        SET
          status = 'COMPLETED',
          submitted_at = clock_timestamp(),
          submission_id = $2,
          submission_event_id = $3,
          submission_kind = 'MANUAL'
        WHERE
          id = $1
        `,
        [a.id, randomUUID(), randomUUID()],
      );
      await db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.results (
            attempt_id,
            version_id,
            user_id,
            earned_points,
            possible_points,
            correct_count,
            question_count
          )
        VALUES
          ($1, $2, $3, 7, 10, 0, 1)
        `,
        [a.id, p.version, a.owner],
      );
    });
    expect(
      (
        await fixture.query(
          `
          SELECT
            percentage_basis_points
          FROM
            assessment.results
          WHERE
            attempt_id = $1
          `,
          [a.id],
        )
      ).rows[0]!.percentage_basis_points,
    ).toBe(7000);
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.results (
            attempt_id,
            version_id,
            user_id,
            earned_points,
            possible_points,
            correct_count,
            question_count
          )
        VALUES
          ($1, $2, $3, 7, 10, 0, 1)
        `,
        [a.id, p.version, a.owner],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejects completion without result, result before completion and durable PROCESSING without a lease", async () => {
    const p = await publication();
    const a = await attempt(p);
    const metadata = [a.id, randomUUID(), randomUUID()];
    await expect(
      db.query(
        "diagnostic",
        `
        UPDATE assessment.attempts
        SET
          status = 'COMPLETED',
          submitted_at = clock_timestamp(),
          submission_id = $2,
          submission_event_id = $3,
          submission_kind = 'MANUAL'
        WHERE
          id = $1
        `,
        metadata,
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
        INSERT INTO
          assessment.results (
            attempt_id,
            version_id,
            user_id,
            earned_points,
            possible_points,
            correct_count,
            question_count
          )
        VALUES
          ($1, $2, $3, 7, 10, 0, 1)
        `,
        [a.id, p.version, a.owner],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.query(
        "diagnostic",
        `
        UPDATE assessment.attempts
        SET
          status = 'PROCESSING',
          submitted_at = clock_timestamp(),
          submission_id = $2,
          submission_event_id = $3
        WHERE
          id = $1
        `,
        metadata,
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("denies runtime reassigning attempts/answers and changing an outbox identity", async () => {
    const p = await publication();
    const a = await attempt(p);
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE assessment.attempts
      SET
        user_id = $2
      WHERE
        id = $1
      `,
        [a.id, p.actor],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE assessment.answers
      SET
        version_id = $1
      `,
        [p.version],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE platform.outbox
      SET
        payload = '{}'
      `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("prevents runtime DDL, migration history writes, audit changes and SET ROLE owner", async () => {
    await expect(
      db.query("diagnostic", "CREATE TABLE platform.runtime_ddl (id integer)"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("diagnostic", "DELETE FROM platform.schema_migrations"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "diagnostic",
        `
      UPDATE platform.audit_logs
      SET
        action = 'changed'
      `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("diagnostic", "SET ROLE examination_owner")).rejects.toMatchObject({
      code: "42501",
    });
  });
  it("commits audit and outbox intent atomically with rollback of the owning write", async () => {
    const p = await publication();
    const a = await attempt(p);
    const event = randomUUID();
    const audit = randomUUID();
    await expect(
      db.transaction(async () => {
        await db.query(
          "diagnostic",
          `
          INSERT INTO
            platform.outbox (event_id, aggregate_id, type, payload, correlation_id)
          VALUES
            ($1, $2, 'attempt.submitted.v1', '{}', $3)
          `,
          [event, a.id, randomUUID()],
        );
        await db.query(
          "diagnostic",
          `
          INSERT INTO
            platform.audit_logs (id, actor_id, action, resource_id, correlation_id, outcome)
          VALUES
            ($1, $2, 'fixture', $3, $4, 'SUCCESS')
          `,
          [audit, p.actor, a.id, randomUUID()],
        );
        throw new Error("cancel");
      }),
    ).rejects.toThrow("cancel");
    expect(
      (
        await fixture.query(
          `
      SELECT
        event_id
      FROM
        platform.outbox
      WHERE
        event_id = $1
      `,
          [event],
        )
      ).rowCount,
    ).toBe(0);
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
          [audit],
        )
      ).rowCount,
    ).toBe(0);
  });
});

describe("transaction correctness on PostgreSQL", () => {
  it("commits joined calls on one backend resolved at call time", async () => {
    const pids: number[] = [];
    await db.transaction(async () => {
      pids.push((await db.query("diagnostic", "SELECT pg_backend_pid() AS pid")).rows[0]!.pid);
      await db.query(
        "diagnostic",
        `
      INSERT INTO
        platform.transaction_fixture
      VALUES
        ('one', 1)
      `,
      );
      await db.transaction(async () => {
        pids.push((await db.query("diagnostic", "SELECT pg_backend_pid() AS pid")).rows[0]!.pid);
      });
    });
    expect(new Set(pids).size).toBe(1);
    expect(
      (
        await fixture.query(`
      SELECT
        count(*)::int AS n
      FROM
        platform.transaction_fixture
      `)
      ).rows[0]!.n,
    ).toBe(1);
  });
  it("rolls back all writes when a joined business failure is caught", async () => {
    await expect(
      db.transaction(async () => {
        await db.query(
          "diagnostic",
          `
        INSERT INTO
          platform.transaction_fixture
        VALUES
          ('one', 1)
        `,
        );
        try {
          await db.transaction(async () => {
            await db.query(
              "diagnostic",
              `
              INSERT INTO
                platform.transaction_fixture
              VALUES
                ('two', 2)
              `,
            );
            throw new Error("business failure");
          });
        } catch {
          /* caller catches */
        }
      }),
    ).rejects.toThrow("rollback-only");
    expect(
      (
        await fixture.query(`
      SELECT
        count(*)::int AS n
      FROM
        platform.transaction_fixture
      `)
      ).rows[0]!.n,
    ).toBe(0);
  });
  it("forbids a successful result after a caught SQL failure", async () => {
    await expect(
      db.transaction(async () => {
        try {
          await db.query("diagnostic", "SELECT 1 / 0");
        } catch {
          /* caught SQL error */
        }
      }),
    ).rejects.toThrow("rollback-only");
  });
  it("isolates overlapping async contexts and rolls back only the failed one", async () => {
    const ready = deferred<void>();
    const release = deferred<void>();
    const first = db.transaction(async () => {
      await db.query(
        "diagnostic",
        `
      INSERT INTO
        platform.transaction_fixture
      VALUES
        ('first', 1)
      `,
      );
      ready.resolve();
      await release.promise;
      throw new Error("cancel");
    });
    const failed = expect(first).rejects.toThrow("cancel");
    await ready.promise;
    await db.transaction(async () => {
      await db.query(
        "diagnostic",
        `
      INSERT INTO
        platform.transaction_fixture
      VALUES
        ('second', 2)
      `,
      );
    });
    release.resolve();
    await failed;
    expect(
      (
        await fixture.query(`
    SELECT
      id
    FROM
      platform.transaction_fixture
    `)
      ).rows,
    ).toEqual([{ id: "second" }]);
  });
  it("rejects detached work after its transaction has ended", async () => {
    const release = deferred<void>();
    let late!: Promise<unknown>;
    await db.transaction(async () => {
      late = release.promise.then(() =>
        db.query(
          "diagnostic",
          `
        INSERT INTO
          platform.transaction_fixture
        VALUES
          ('late', 1)
        `,
        ),
      );
    });
    const rejection = expect(late).rejects.toMatchObject({
      code: "DB_CONTEXT_ENDED",
    });
    release.resolve();
    await rejection;
    expect(
      (
        await fixture.query(`
      SELECT
        count(*)::int AS n
      FROM
        platform.transaction_fixture
      `)
      ).rows[0]!.n,
    ).toBe(0);
  });
  it("rolls back pending unawaited database work instead of committing it", async () => {
    await expect(
      db.transaction(async () => {
        void db.query("diagnostic", "SELECT pg_sleep(0.05)");
      }),
    ).rejects.toThrow("rollback-only");
  });
  it("bounds a real row-lock wait and permits pool reuse after rollback", async () => {
    await fixture.query(`
    INSERT INTO
      platform.transaction_fixture
    VALUES
      ('lock', 0)
    `);
    const client = await fixture.connect();
    await client.query("BEGIN");
    try {
      await client.query(`
      UPDATE platform.transaction_fixture
      SET
        value = 1
      WHERE
        id = 'lock'
      `);
      await expect(
        db.transaction(async () => {
          await db.query(
            "diagnostic",
            `
            UPDATE platform.transaction_fixture
            SET
              value = 2
            WHERE
              id = 'lock'
            `,
          );
        }),
      ).rejects.toMatchObject({ code: "55P03" });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    await db.query(
      "diagnostic",
      `
    UPDATE platform.transaction_fixture
    SET
      value = 3
    WHERE
      id = 'lock'
    `,
    );
    expect(
      (
        await fixture.query(`
      SELECT
        value
      FROM
        platform.transaction_fixture
      `)
      ).rows[0]!.value,
    ).toBe(3);
  });
  it("uses clock_timestamp after lock acquisition rather than transaction start time", async () => {
    await fixture.query(`
    INSERT INTO
      platform.transaction_fixture
    VALUES
      ('clock', 0)
    `);
    await db.transaction(async () => {
      const start = (await db.query("diagnostic", "SELECT clock_timestamp() AS at")).rows[0]!
        .at as Date;
      await db.query("diagnostic", "SELECT pg_sleep(0.05)");
      await db.query(
        "diagnostic",
        `
        SELECT
          id
        FROM
          platform.transaction_fixture
        WHERE
          id = 'clock'
        FOR UPDATE
        `,
      );
      const end = (await db.query("diagnostic", "SELECT clock_timestamp() AS at")).rows[0]!
        .at as Date;
      expect(end.getTime() - start.getTime()).toBeGreaterThanOrEqual(40);
    });
  });
});

describe("pool protection and safe observations", () => {
  it("does not change commit semantics when the telemetry collector fails", async () => {
    const observed = new PostgresDatabase(config, () => {
      throw new Error("collector unavailable");
    });
    try {
      await observed.transaction(async () => {
        await observed.query(
          "diagnostic",
          `
          INSERT INTO
            platform.transaction_fixture
          VALUES
            ('telemetry', 1)
          `,
        );
      });
      expect(
        (
          await fixture.query(`
        SELECT
          value
        FROM
          platform.transaction_fixture
        WHERE
          id = 'telemetry'
        `)
        ).rows[0]!.value,
      ).toBe(1);
    } finally {
      await observed.close();
    }
  });
  it("records bounded lock-acquisition timing without row identifiers", async () => {
    const observations: DatabaseObservation[] = [];
    const observed = new PostgresDatabase({ ...config, statementMs: 200, lockMs: 50 }, (event) =>
      observations.push(event),
    );
    await fixture.query(`
    INSERT INTO
      platform.transaction_fixture
    VALUES
      ('timed_lock', 0)
    `);
    const client = await fixture.connect();
    await client.query("BEGIN");
    try {
      await client.query(
        `
        SELECT
          id
        FROM
          platform.transaction_fixture
        WHERE
          id = 'timed_lock'
        FOR UPDATE
        `,
      );
      await expect(
        observed.transaction(async () => {
          await observed.query(
            "lock.acquire",
            `
            SELECT
              id
            FROM
              platform.transaction_fixture
            WHERE
              id = 'timed_lock'
            FOR UPDATE
            `,
          );
        }),
      ).rejects.toMatchObject({ code: "55P03" });
      const event = observations.find((event) => event.kind === "lock");
      expect(event).toMatchObject({ operation: "lock.acquire", code: "55P03" });
      expect(event!.durationMs).toBeGreaterThanOrEqual(40);
      expect(JSON.stringify(observations)).not.toContain("timed_lock");
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await observed.close();
    }
  });
  it("collects pg_stat_statements without SQL text and keeps diagnostics restricted", async () => {
    await db.query("diagnostic", "SELECT $1::integer AS n", [123]);
    const result = await fixture.query(`
    SELECT
      *
    FROM
      public.examination_query_metrics
    `);
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.fields.map((field) => field.name)).not.toContain("query");
    expect(
      (await fixture.query("SHOW log_parameter_max_length_on_error")).rows[0]!
        .log_parameter_max_length_on_error,
    ).toBe("0");
    await expect(
      db.query(
        "diagnostic",
        `
      SELECT
        *
      FROM
        public.examination_query_metrics
      `,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("rejects excess admission, times out bounded waiters and recovers", async () => {
    const bounded = new PostgresDatabase({
      ...config,
      max: 1,
      maxWaiting: 1,
      acquireMs: 80,
    });
    const ready = deferred<void>();
    const release = deferred<void>();
    try {
      const active = bounded.transaction(async () => {
        ready.resolve();
        await release.promise;
      });
      await ready.promise;
      const waiter = bounded.query("diagnostic", "SELECT 1");
      const timedOut = expect(waiter).rejects.toMatchObject({
        code: "DB_ACQUIRE_TIMEOUT",
      });
      await expect(bounded.query("diagnostic", "SELECT 1")).rejects.toMatchObject({
        code: "DB_BUSY",
      });
      await timedOut;
      release.resolve();
      await active;
      expect((await bounded.query("diagnostic", "SELECT 42 AS n")).rows[0]!.n).toBe(42);
    } finally {
      release.resolve();
      await bounded.close();
    }
  });
  it("drains active and queued admitted work before ending the pool", async () => {
    const bounded = new PostgresDatabase({ ...config, max: 1, maxWaiting: 1 });
    const entered = deferred<void>();
    const release = deferred<void>();
    const active = bounded.transaction(async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    const queued = bounded.query("diagnostic", "SELECT 42 AS n");
    const closing = bounded.close();
    try {
      await expect(bounded.query("diagnostic", "SELECT 1")).rejects.toMatchObject({
        code: "DB_BUSY",
      });
      release.resolve();
      expect((await queued).rows[0]!.n).toBe(42);
      await active;
      await closing;
    } finally {
      release.resolve();
      await Promise.allSettled([active, queued, closing]);
    }
  });
  it("cancels long statements at the server and does not emit SQL, parameters or error detail", async () => {
    const observations: DatabaseObservation[] = [];
    const bounded = new PostgresDatabase({ ...config, statementMs: 100, lockMs: 50 }, (event) =>
      observations.push(event),
    );
    try {
      await expect(bounded.query("diagnostic", "SELECT pg_sleep($1)", [1])).rejects.toMatchObject({
        code: "57014",
      });
      await expect(bounded.query("diagnostic", "SELECT 'secret-answer'::integer")).rejects.toEqual(
        new DatabaseError("22P02"),
      );
      expect(JSON.stringify(observations)).not.toMatch(/secret-answer|pg_sleep|SELECT/);
      expect(observations.some((event) => event.kind === "acquire")).toBe(true);
      expect(observations.some((event) => event.kind === "query" && event.code === "57014")).toBe(
        true,
      );
    } finally {
      await bounded.close();
    }
  });
  it("terminates idle transactions without crashing the process and replaces the connection", async () => {
    const bounded = new PostgresDatabase({ ...config, idleTransactionMs: 100 });
    try {
      await expect(
        bounded.transaction(async () => {
          await new Promise((done) => setTimeout(done, 200));
        }),
      ).rejects.toThrow();
      expect((await bounded.query("diagnostic", "SELECT 7 AS n")).rows[0]!.n).toBe(7);
    } finally {
      await bounded.close();
    }
  });
});

describe("immutable ordered migrations", () => {
  it("is repeatable and serializes two migration runners", async () => {
    const next = sqlMigration(
      `${String(migrations.length + 1).padStart(4, "0")}_serialized_fixture.sql`,
      "CREATE TABLE platform.serialized_fixture (id integer PRIMARY KEY)",
    );
    migrations.push(next);
    const results = await Promise.all([
      migrate(migrationConfig, migrations),
      migrate(migrationConfig, migrations),
    ]);
    expect(results.flat()).toEqual([next.name]);
    expect(await migrate(migrationConfig, migrations)).toEqual([]);
  });
  it("rejects changed or missing applied migrations", async () => {
    await expect(
      migrate(
        migrationConfig,
        migrations.map((m, index) =>
          index === 0 ? sqlMigration(m.name, m.sql + "\n-- changed") : m,
        ),
      ),
    ).rejects.toThrow("checksum");
    await expect(migrate(migrationConfig, migrations.slice(0, -1))).rejects.toThrow("prefix");
  });
  it("rolls back failed DDL and its migration receipt, then succeeds on repaired new migration", async () => {
    const name = `${String(migrations.length + 1).padStart(4, "0")}_atomic_fixture.sql`;
    await expect(
      migrate(migrationConfig, [
        ...migrations,
        sqlMigration(
          name,
          `
        CREATE TABLE platform.atomic_fixture (id integer);

        SELECT
          1 / 0;
        `,
        ),
      ]),
    ).rejects.toThrow("Migration failed");
    expect(
      (await fixture.query("SELECT to_regclass('platform.atomic_fixture') AS name")).rows[0]!.name,
    ).toBeNull();
    expect(
      (
        await fixture.query(
          `
      SELECT
        name
      FROM
        platform.schema_migrations
      WHERE
        name = $1
      `,
          [name],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      await migrate(migrationConfig, [
        ...migrations,
        sqlMigration(name, "CREATE TABLE platform.atomic_fixture (id integer);"),
      ]),
    ).toEqual([name]);
  });
});
