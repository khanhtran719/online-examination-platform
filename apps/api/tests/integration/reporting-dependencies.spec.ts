import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool, PoolClient } from "pg";
import { databaseConfig } from "../../src/config/database.config";
import { loadMigrations, migrate } from "../../src/infrastructure/database/migration-runner";
import {
  PostgresDatabase,
  DatabaseObservation,
} from "../../src/infrastructure/database/transaction/postgres-database";
import { PostgresActiveCandidatesQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-active-candidates.query";
import { PostgresSubmissionsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-submissions.query";
import { PostgresCandidateResultsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-candidate-results.query";
import { PostgresQuestionStatisticsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-question-statistics.query";
import { PostgresBusinessMetricsQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-business-metrics.query";
import { PostgresAuditQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-audit.query";
import { PostgresRankingQuery } from "../../src/modules/reporting/infrastructure/persistence/postgres-ranking.query";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}
type Tables = Record<string, Column[]>;
interface Manifest {
  tables: Tables;
}
const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
if (!adminUrl || new URL(adminUrl).port !== "55435" || new URL(adminUrl).hostname !== "127.0.0.1")
  throw new Error("Disposable localhost55435 administrator required");
const suffix = randomUUID().replaceAll("-", ""),
  name = "report_contract_" + suffix;
const owner = "rc_ddl_" + suffix.slice(-12),
  runtime = "rc_api_" + suffix.slice(-12),
  password = randomUUID();
const admin = new Pool({ connectionString: adminUrl, max: 1 });
const target = new URL(adminUrl);
target.pathname = "/" + name;
function login(role: string) {
  const url = new URL(target);
  url.username = role;
  url.password = password;
  return url.toString();
}
let fixture: Pool, db: PostgresDatabase, manifest: Manifest;
let compare: (manifest: Manifest, actual: Tables) => string[];
const observations: DatabaseObservation[] = [];
async function schema(client: Pool | PoolClient): Promise<Tables> {
  const result = await client.query<Column & { relation: string }>(
    `
    SELECT
      n.nspname || '.' || c.relname AS relation,
      a.attname AS name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
      NOT a.attnotnull AS nullable
    FROM
      pg_catalog.pg_namespace n
      JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
      JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE
      n.nspname || '.' || c.relname = ANY($1::text[])
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY
      n.nspname,
      c.relname,
      a.attname
  `,
    [Object.keys(manifest.tables)],
  );
  const tables: Tables = {};
  for (const { relation, ...column } of result.rows) (tables[relation] ??= []).push(column);
  return tables;
}
beforeAll(async () => {
  manifest = JSON.parse(await readFile("docs/contracts/reporting-dependencies.json", "utf8"));
  ({ compareReportingSchema: compare } = await import(
    pathToFileURL(resolve("scripts/reporting-dependencies.mjs")).href
  ));
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.query(await readFile("infra/database/roles.sql", "utf8"));
  await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
  for (const [role, group] of [
    [owner, "examination_owner"],
    [runtime, "examination_runtime"],
  ]) {
    await admin.query(
      `CREATE ROLE ${role} LOGIN ${role === owner ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
    );
    await admin.query(`GRANT ${group} TO ${role}`);
  }
  await migrate(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: login(owner) }),
    await loadMigrations("apps/api/src/infrastructure/database/migrations"),
  );
  fixture = new Pool({ connectionString: target.toString(), max: 1 });
  db = new PostgresDatabase(
    databaseConfig({ NODE_ENV: "test", DATABASE_URL: login(runtime), DB_POOL_MAX: "1" }),
    (observation) => observations.push(observation),
  );
});
afterAll(async () => {
  await db?.close();
  await fixture?.end();
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.query(`DROP ROLE IF EXISTS ${runtime}`);
  await admin.query(`DROP ROLE IF EXISTS ${owner}`);
  await admin.end();
});
it("matches every reviewed physical table signature after all versioned migrations", async () => {
  const actual = await schema(fixture);
  expect(compare(manifest, actual)).toEqual([]);
  expect(Object.keys(actual)).toHaveLength(15);
  if (process.env.REPORTING_SCHEMA_EVIDENCE_FILE)
    await writeFile(
      process.env.REPORTING_SCHEMA_EVIDENCE_FILE,
      JSON.stringify(
        {
          kind: "disposable-postgresql-schema-contract",
          tables: actual,
          assertions:
            "column names, PostgreSQL types/typmods and nullability; no AWS or semantic correctness claim",
        },
        null,
        2,
      ),
    );
});
it.each([
  {
    table: "assessment.attempts",
    sql: "ALTER TABLE assessment.attempts ADD COLUMN private_email text",
  },
  {
    table: "assessment.attempts",
    sql: "ALTER TABLE assessment.attempts RENAME COLUMN deadline TO renamed_deadline",
  },
  {
    table: "identity.users",
    sql: "ALTER TABLE identity.users ALTER COLUMN display_name TYPE varchar(200)",
  },
  {
    table: "identity.users",
    sql: "ALTER TABLE identity.users ALTER COLUMN enabled DROP NOT NULL",
  },
  { table: "assessment.results", sql: "ALTER TABLE assessment.results RENAME TO renamed_results" },
])("detects $sql and recovers after rollback", async ({ table, sql }) => {
  const client = await fixture.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    expect(compare(manifest, await schema(client))).toEqual([
      `Reporting physical schema review required: ${table}`,
    ]);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
  expect(compare(manifest, await schema(fixture))).toEqual([]);
});
it("executes every reviewed adapter with the restricted API role and one statement per projection", async () => {
  const id = randomUUID();
  const page = { examId: id, versionId: id, limit: 101, watermark: null, position: null };
  const calls = [
    () => new PostgresActiveCandidatesQuery(db).page(page),
    () => new PostgresSubmissionsQuery(db).page({ ...page, publishedVersionId: null }),
    () => new PostgresSubmissionsQuery(db).result(id),
    () => new PostgresCandidateResultsQuery(db).page(page),
    () => new PostgresQuestionStatisticsQuery(db).page(page),
    () => new PostgresBusinessMetricsQuery(db).snapshot({ from: null, to: null }),
    () => new PostgresAuditQuery(db).page({ limit: 101, watermark: null, position: null }),
    () => new PostgresRankingQuery(db).page({ ...page, epoch: null }),
  ];
  for (const invoke of calls) {
    observations.length = 0;
    const result = await invoke();
    expect(result === null || typeof result === "object").toBe(true);
    expect(observations.filter((entry) => entry.operation === "reporting.read")).toHaveLength(1);
  }
});
