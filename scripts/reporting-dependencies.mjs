import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";

const prefix = "apps/api/src/modules/reporting/";
const migrations = "apps/api/src/infrastructure/database/migrations";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sameSet = (left, right) =>
  new Set(left).size === left.length &&
  new Set(right).size === right.length &&
  left.length === right.length &&
  left.every((value) => right.includes(value));

// Inventory ordinary fixed schema-qualified FROM/JOIN targets in adapter SQL.
// Hash review remains mandatory for dynamic SQL and semantics; this is not a SQL parser.
function relations(code) {
  const source = ts.createSourceFile("query.ts", code, ts.ScriptTarget.Latest, true);
  const found = new Set();
  function visit(node) {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const text = node.text.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, " ");
      for (const match of text.matchAll(
        /\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\b/gi,
      ))
        found.add(match[1].toLowerCase());
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...found].sort();
}

export function compareReportingSchema(manifest, actual) {
  const errors = [];
  for (const [table, expected] of Object.entries(manifest.tables)) {
    const current = actual[table];
    const canonical = (columns) =>
      JSON.stringify(
        [...columns]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, type, nullable }) => ({ name, type, nullable })),
      );
    if (!current || canonical(expected) !== canonical(current))
      errors.push(`Reporting physical schema review required: ${table}`);
  }
  return errors;
}

export function checkReportingDependencies(root) {
  const errors = [];
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(root, "docs/contracts/reporting-dependencies.json"), "utf8"),
    );
    if (
      manifest.version !== 1 ||
      !Array.isArray(manifest.queries) ||
      !manifest.queries.length ||
      !manifest.tables ||
      typeof manifest.tables !== "object" ||
      Array.isArray(manifest.tables) ||
      !Array.isArray(manifest.migrationReview?.files) ||
      !Array.isArray(manifest.migrationReview?.queries) ||
      typeof manifest.migrationReview?.reason !== "string" ||
      !manifest.migrationReview.reason.trim()
    )
      throw new Error("Invalid manifest structure");
    const ids = manifest.queries.map((query) => query.id);
    if (new Set(ids).size !== ids.length) errors.push("Reporting duplicate query id");
    if (!sameSet(ids, manifest.migrationReview.queries))
      errors.push("Reporting migration consumers require review");
    const used = new Set();
    for (const query of manifest.queries) {
      if (typeof query.id !== "string" || !/^[a-z]+(?:-[a-z]+)*$/.test(query.id)) {
        errors.push("Invalid Reporting query id");
        continue;
      }
      if (
        !Array.isArray(query.sources) ||
        !query.sources.length ||
        query.sources.some(
          (table) => !/^(?:catalog|assessment|identity|platform)\.[a-z_]+$/.test(table),
        )
      )
        throw new Error("Invalid source inventory");
      query.sources.forEach((table) => used.add(table));
      const path = `${prefix}infrastructure/persistence/postgres-${query.id}.query.ts`;
      const code = readFileSync(resolve(root, path), "utf8");
      const port = readFileSync(resolve(root, `${prefix}application/ports/${query.id}.query.ts`));
      if (hash(code) !== query.queryHash)
        errors.push(`Reporting query review required: ${query.id}`);
      if (hash(port) !== query.portHash) errors.push(`Reporting port review required: ${query.id}`);
      if (!sameSet(query.sources, relations(code)))
        errors.push(`Reporting source inventory mismatch: ${query.id}`);
    }
    const adapters = readdirSync(resolve(root, `${prefix}infrastructure/persistence`), {
      recursive: true,
    }).filter((name) => name.endsWith(".query.ts"));
    if (
      !sameSet(
        ids.map((id) => `postgres-${id}.query.ts`),
        adapters,
      )
    )
      errors.push("Reporting query inventory mismatch");
    if (!sameSet([...used], Object.keys(manifest.tables)))
      errors.push("Reporting table inventory mismatch");
    for (const [table, columns] of Object.entries(manifest.tables)) {
      if (
        !/^(?:catalog|assessment|identity|platform)\.[a-z_]+$/.test(table) ||
        !Array.isArray(columns) ||
        !columns.length ||
        new Set(columns.map((column) => column.name)).size !== columns.length ||
        columns.some(
          (column) =>
            typeof column.name !== "string" ||
            !/^[a-z_]+$/.test(column.name) ||
            typeof column.type !== "string" ||
            !column.type ||
            typeof column.nullable !== "boolean",
        )
      )
        errors.push(`Invalid Reporting schema signature: ${table}`);
    }
    const files = readdirSync(resolve(root, migrations))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    if (
      !sameSet(
        files,
        manifest.migrationReview.files.map((file) => file.name),
      )
    )
      errors.push("Reporting migration review required: file inventory changed");
    for (const file of manifest.migrationReview.files) {
      if (!files.includes(file.name)) continue;
      if (hash(readFileSync(resolve(root, migrations, file.name))) !== file.sha256)
        errors.push(`Reporting migration checksum changed: ${file.name}`);
    }
  } catch (error) {
    errors.push(`Reporting dependency manifest check failed: ${error.message}`);
  }
  return errors;
}
