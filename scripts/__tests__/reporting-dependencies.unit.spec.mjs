import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { checkReportingDependencies, compareReportingSchema } from "../reporting-dependencies.mjs";

const hash = (content) => createHash("sha256").update(content).digest("hex");
const prefix = "apps/api/src/modules/reporting/";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "report-contract-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const query = "const sql = `SELECT a.id FROM assessment.attempts a`;";
  const port = "export interface ExampleQuery {}";
  put(prefix + "infrastructure/persistence/postgres-example.query.ts", query);
  put(prefix + "application/ports/example.query.ts", port);
  put("apps/api/src/infrastructure/database/migrations/0001_initial.sql", "SELECT 1;");
  const table = [{ name: "id", type: "uuid", nullable: false }];
  const manifest = {
    version: 1,
    queries: [
      {
        id: "example",
        queryHash: hash(query),
        portHash: hash(port),
        sources: ["assessment.attempts"],
      },
    ],
    tables: { "assessment.attempts": table },
    migrationReview: {
      queries: ["example"],
      reason: "Explicit fixture consumer review",
      files: [{ name: "0001_initial.sql", sha256: hash("SELECT 1;") }],
    },
  };
  const save = () => put("docs/contracts/reporting-dependencies.json", JSON.stringify(manifest));
  save();
  return { root, put, manifest, save, table };
}
test("accepts a fully inventoried reviewed query and physical schema", (t) => {
  const f = fixture(t);
  assert.deepEqual(checkReportingDependencies(f.root), []);
  assert.deepEqual(compareReportingSchema(f.manifest, { "assessment.attempts": f.table }), []);
});
test("rejects missing, duplicate and removed query consumers", (t) => {
  const f = fixture(t);
  f.put(prefix + "infrastructure/persistence/postgres-new.query.ts", "export {};");
  assert.match(checkReportingDependencies(f.root).join("\n"), /query inventory/);
  f.manifest.queries.push(f.manifest.queries[0]);
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /duplicate query/);
});
test("requires renewed review for a changed query or private port", (t) => {
  const f = fixture(t);
  f.put(
    prefix + "application/ports/example.query.ts",
    "export interface ExampleQuery { email: string }",
  );
  assert.match(checkReportingDependencies(f.root).join("\n"), /port review required/);
  f.put(
    prefix + "infrastructure/persistence/postgres-example.query.ts",
    "const sql = `SELECT email FROM assessment.attempts`;",
  );
  assert.match(checkReportingDependencies(f.root).join("\n"), /query review required/);
});
test("rejects a query adapter hidden in a nested persistence folder", (t) => {
  const f = fixture(t);
  f.put(
    prefix + "infrastructure/persistence/postgres/queries/postgres-hidden.query.ts",
    "export {};",
  );
  assert.match(checkReportingDependencies(f.root).join("\n"), /query inventory/);
});
test("detects an undeclared physical join even after the source hash is renewed", (t) => {
  const f = fixture(t);
  const query =
    "const sql = `SELECT a.id FROM assessment.attempts a JOIN identity.users u ON u.id = a.user_id`;";
  f.put(prefix + "infrastructure/persistence/postgres-example.query.ts", query);
  f.manifest.queries[0].queryHash = hash(query);
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /source inventory/);
});
test("does not invent physical dependencies from source comments or aliases", (t) => {
  const f = fixture(t);
  const query =
    "// FROM identity.users\nconst sql = `WITH page AS (SELECT id FROM assessment.attempts) SELECT * FROM page`;";
  f.put(prefix + "infrastructure/persistence/postgres-example.query.ts", query);
  f.manifest.queries[0].queryHash = hash(query);
  f.save();
  assert.deepEqual(checkReportingDependencies(f.root), []);
});
test("rejects a new unreviewed migration and altered or omitted migration receipts", (t) => {
  const f = fixture(t);
  f.put("apps/api/src/infrastructure/database/migrations/0002_change.sql", "SELECT 2;");
  assert.match(checkReportingDependencies(f.root).join("\n"), /migration review required/);
  f.put("apps/api/src/infrastructure/database/migrations/0001_initial.sql", "SELECT 3;");
  assert.match(checkReportingDependencies(f.root).join("\n"), /migration checksum/);
  f.manifest.migrationReview.queries = [];
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /migration consumers/);
});
test("rejects path-like IDs, missing source signatures and malformed schema columns", (t) => {
  const f = fixture(t);
  f.manifest.queries[0].id = "../../../outside";
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /query id/);
  f.manifest.queries[0].id = "example";
  delete f.manifest.tables["assessment.attempts"];
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /table inventory/);
  f.manifest.tables["assessment.attempts"] = [{ name: "id", type: "uuid", nullable: "no" }];
  f.save();
  assert.match(checkReportingDependencies(f.root).join("\n"), /schema signature/);
});
test("detects missing, added, renamed, nullable or differently typed physical columns", (t) => {
  const f = fixture(t);
  for (const columns of [
    [],
    [{ name: "renamed", type: "uuid", nullable: false }],
    [{ name: "id", type: "text", nullable: false }],
    [{ name: "id", type: "uuid", nullable: true }],
    [...f.table, { name: "private_email", type: "text", nullable: true }],
  ])
    assert.match(
      compareReportingSchema(f.manifest, { "assessment.attempts": columns }).join("\n"),
      /assessment.attempts/,
    );
  assert.match(compareReportingSchema(f.manifest, {}).join("\n"), /assessment.attempts/);
});
test("reports malformed manifest data as a failed check", (t) => {
  const f = fixture(t);
  f.put("docs/contracts/reporting-dependencies.json", "{");
  assert.match(checkReportingDependencies(f.root).join("\n"), /manifest/);
});
test("keeps repository query receipts and source schemas in the checked inventory", () => {
  assert.deepEqual(checkReportingDependencies(process.cwd()), []);
  const manifest = JSON.parse(readFileSync("docs/contracts/reporting-dependencies.json", "utf8"));
  assert.equal(manifest.queries.length, 7);
  assert.equal(manifest.migrationReview.files.length >= 19, true);
  assert.equal(Object.keys(manifest.tables).length >= 15, true);
});
