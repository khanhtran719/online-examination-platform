// Run from the repository root. Read-only; compares normalized syntax and old artifacts.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import ts from "typescript";

const paths = JSON.parse(readFileSync("tsconfig.paths.json", "utf8")).compilerOptions.paths;
const hash = (value) => createHash("sha256").update(value).digest("hex");

function target(file, specifier) {
  if (specifier.startsWith("."))
    return posix.normalize(posix.join(posix.dirname(file), specifier));
  if (specifier.startsWith("@web/")) return "apps/web/src/" + specifier.slice(5);
  for (const [alias, [mapping]] of Object.entries(paths)) {
    if (alias.endsWith("*") && specifier.startsWith(alias.slice(0, -1)))
      return posix.normalize(mapping.replace("*", specifier.slice(alias.length - 1)));
    if (specifier === alias) return posix.normalize(mapping);
  }
  return specifier;
}

function moduleLiteral(node) {
  const parent = node.parent;
  if (!parent) return false;
  if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node)
    return true;
  if (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) return true;
  if (!ts.isCallExpression(parent) || parent.arguments[0] !== node) return false;
  const expression = parent.expression;
  return expression.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(expression) && expression.text === "require") ||
    (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) &&
      expression.expression.text === "vi" &&
      ["mock", "doMock", "unmock", "doUnmock", "importActual", "importMock"].includes(expression.name.text));
}

export function signatures(file, code) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  function signature(node) {
    if (ts.isParenthesizedExpression(node) || ts.isParenthesizedTypeNode(node))
      return signature(node.expression ?? node.type);
    const children = [];
    ts.forEachChild(node, (child) => { children.push(signature(child)); });
    return [node.kind, "text" in node
      ? (ts.isStringLiteralLike(node) && moduleLiteral(node) ? target(file, node.text) : node.text)
      : null, children];
  }
  const imports = [], exports = [], effects = [];
  for (const node of source.statements) {
    if (ts.isImportDeclaration(node)) {
      const dependency = target(file, node.moduleSpecifier.text), clause = node.importClause;
      if (!clause) { effects.push(dependency); continue; }
      if (clause.name) imports.push([dependency, "default", clause.name.text]);
      const binding = clause.namedBindings;
      if (binding && ts.isNamespaceImport(binding)) imports.push([dependency, "namespace", binding.name.text]);
      if (binding && ts.isNamedImports(binding))
        for (const element of binding.elements)
          imports.push([dependency, element.propertyName?.text ?? element.name.text, element.name.text]);
    }
    if (ts.isExportDeclaration(node)) {
      const dependency = node.moduleSpecifier ? target(file, node.moduleSpecifier.text) : "";
      if (node.exportClause && ts.isNamedExports(node.exportClause))
        for (const element of node.exportClause.elements)
          exports.push([dependency, element.propertyName?.text ?? element.name.text, element.name.text, node.isTypeOnly, element.isTypeOnly]);
      else exports.push([dependency, node.exportClause?.name?.text ?? "*", node.isTypeOnly]);
    }
  }
  const values = {
    body: source.statements.filter((node) => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)).map(signature),
    imports: imports.sort(), exports: exports.sort(), effects,
  };
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, hash(JSON.stringify(value))]));
}

if (process.argv[1]?.endsWith("verify-preservation.mjs")) {
  const before = JSON.parse(readFileSync(new URL("./preservation-baseline.json", import.meta.url), "utf8"));
  const mismatches = [];
  for (const [file, expected] of Object.entries(before.sources)) {
    const current = signatures(file, readFileSync(file, "utf8"));
    for (const key of Object.keys(current))
      if (current[key] !== expected[key]) mismatches.push({ file, key });
  }
  const changedProtected = Object.entries(before.protected)
    .filter(([file, digest]) => hash(readFileSync(file)) !== digest).map(([file]) => file);
  console.log(JSON.stringify({ checked: Object.keys(before.sources).length, mismatches,
    protectedFiles: Object.keys(before.protected).length, changedProtected }, null, 2));
  if (mismatches.length || changedProtected.length) process.exitCode = 1;
}
