import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

function withoutFences(markdown) {
  let fence = null;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = marker[1];
        else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
        return "";
      }
      return fence ? "" : line;
    })
    .join("\n");
}

export function localLinks(markdown) {
  return [
    ...withoutFences(markdown).matchAll(/\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g),
  ]
    .map((match) => match[1] ?? match[2])
    .filter((link) => !/^[a-z][a-z0-9+.-]*:/i.test(link));
}

export function headingAnchors(markdown) {
  const seen = new Map();
  const result = new Set();
  for (const match of withoutFences(markdown).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1]
      .replace(/<[^>]+>/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  return result;
}

export function inspectImports(path, code) {
  const source = ts.createSourceFile(path, code, ts.ScriptTarget.Latest, true);
  const module = path.match(/\/modules\/([^/]+)\//)?.[1];
  const protectedLayer = /\/(domain|application)\//.test(path);
  const domainLayer = /\/domain\//.test(path);
  const errors = [];
  const dependencies = [];
  const globalTechnical = /^apps\/api\/src\/(?:shared|config|infrastructure)(?:\/|$)/.test(path);
  const workerRoot = /^apps\/api\/src\/workers\//.test(path);
  const compositionCaller =
    workerRoot ||
    /^apps\/api\/src\/(?:main|app\.module)\.ts$/.test(path) ||
    /^apps\/api\/src\/modules\/[^/]+\/[^/]+\.(?:module|factory)\.ts$/.test(path);
  // Reviewed public entry points; never permit arbitrary private application imports.
  const publicApplication = new Set([
    "catalog/application/catalog.facade",
    "catalog/application/facades/catalog.facade",
    "identity/application/facades/identity.facade",
  ]);
  const publicComposition = new Set([
    "identity/identity.module",
    "identity/identity-worker.factory",
    "identity/identity-operator.factory",
  ]);
  const forbidden =
    /^(?:@nestjs\/|@aws-sdk\/|@opentelemetry\/|@fastify\/|(?:pg|typeorm|sequelize|jose|argon2|nodemailer|redis|ioredis|kafkajs|aws-sdk|axios|express|fastify)(?:\/|$)|(?:node:)?(?:http|https|net|tls)(?:\/|$))/;
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier))
        dependencies.push(node.moduleSpecifier.text);
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      dependencies.push(node.argument.literal.text);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const dependency = node.moduleReference.expression;
      if (dependency && ts.isStringLiteralLike(dependency)) dependencies.push(dependency.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) dependencies.push(argument.text);
      else if (protectedLayer || globalTechnical || workerRoot)
        errors.push("Non-literal runtime dependency cannot be checked statically");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const dependency of dependencies) {
    if (/^@(?:shared|config|infrastructure|modules|workers|platform)(?:\/|$)/.test(dependency))
      errors.push(`Source alias is not configured for boundary resolution: ${dependency}`);
    const target = dependency.startsWith(".")
      ? posix.normalize(posix.join(posix.dirname(path), dependency))
      : dependency;
    if (
      protectedLayer &&
      (forbidden.test(dependency) ||
        /\/(infrastructure|presentation|config|workers)(?:\/|$)/.test(target) ||
        /\/shared\/common(?:\/|$)/.test(target) ||
        /\/shared(?:$|\/index(?:\.[^/]*)?$)/.test(target))
    ) {
      errors.push(`Protected business layer imports technical dependency: ${dependency}`);
    }
    if (domainLayer && /\/application(?:\/|$)/.test(target)) {
      errors.push(`Domain imports application orchestration: ${dependency}`);
    }
    if (/\/presentation\//.test(path) && /\/infrastructure(?:\/|$)/.test(target)) {
      errors.push(`Presentation imports infrastructure: ${dependency}`);
    }
    if ((/\/platform\//.test(path) || globalTechnical) && /(?:^|\/)modules\//.test(target)) {
      errors.push(`Platform imports a business module: ${dependency}`);
    }
    const moduleTarget = target.match(/(?:^|\/)modules\/(.+)/)?.[1]?.replace(/\.(?:ts|js)$/, "");
    const targetModule = moduleTarget?.split("/")[0];
    if (publicComposition.has(moduleTarget) && !compositionCaller)
      errors.push(
        `Module composition factory is not an inbound application capability: ${dependency}`,
      );
    if (moduleTarget && ((module && module !== targetModule) || workerRoot)) {
      const permitted =
        publicApplication.has(moduleTarget) ||
        (compositionCaller && publicComposition.has(moduleTarget));
      // Private domain/infra/presentation are reported by the existing rule below.
      if (!permitted && !/\/(domain|infrastructure|presentation)(?:\/|$)/.test(target))
        errors.push(`Private module contract is not a public entry point: ${dependency}`);
      if (workerRoot && !permitted && /\/(domain|infrastructure|presentation)(?:\/|$)/.test(target))
        errors.push(`Worker imports a private module adapter: ${dependency}`);
    }
    if (
      module &&
      targetModule &&
      module !== targetModule &&
      /\/(domain|infrastructure|presentation)(?:\/|$)/.test(target)
    ) {
      errors.push(`Module-private cross-capability import: ${dependency}`);
    }
  }
  return errors;
}

export function inspectPlacement(path) {
  return /^apps\/api\/src\/(?:platform(?:\/|$)|(?:worker|operator-admin)\.ts$)/.test(path)
    ? ["Legacy source placement is closed; use shared/config/infrastructure/workers"]
    : [];
}

function filesIn(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".git", "dist", ".terraform"].includes(entry.name)) return [];
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

export function checkRepository(root) {
  const errors = [];
  const files = filesIn(root);
  for (const file of files.filter((path) => path.endsWith(".md"))) {
    const content = readFileSync(file, "utf8");
    for (const link of localLinks(content)) {
      const [target, fragment] = link.split("#");
      const destination = target ? resolve(dirname(file), decodeURIComponent(target)) : file;
      if (!existsSync(destination)) errors.push(`${relative(root, file)}: missing link ${link}`);
      else if (
        fragment &&
        destination.endsWith(".md") &&
        !headingAnchors(readFileSync(destination, "utf8")).has(decodeURIComponent(fragment))
      ) {
        errors.push(`${relative(root, file)}: missing anchor ${link}`);
      }
    }
  }
  const core = [
    "AGENTS.md",
    ".ai/rules.md",
    ".ai/architecture.md",
    ".ai/conventions.md",
    ".ai/workflow.md",
    ".ai/overview.md",
  ];
  for (const name of core) {
    const content = readFileSync(resolve(root, name), "utf8");
    if (
      /pos-icool|Redis cache is wired for every app|repository currently has no schema migration|three.*modular monoliths.*central/i.test(
        content,
      )
    ) {
      errors.push(`${name}: stale local project policy`);
    }
    const sections = [...content.matchAll(/^#{1,2}\s+(\d+[A-Z]?)\.\s/gm)].map((match) => match[1]);
    if (new Set(sections).size !== sections.length)
      errors.push(`${name}: duplicate numbered section`);
  }
  const architecture = readFileSync(resolve(root, ".ai/architecture.md"), "utf8");
  const rules = readFileSync(resolve(root, ".ai/rules.md"), "utf8");
  for (let section = 76; section <= 85; section += 1) {
    if (!new RegExp(`^# ${section}\\. `, "m").test(architecture))
      errors.push(`Missing examination architecture section ${section}`);
  }
  for (let rule = 63; rule <= 76; rule += 1) {
    if (!rules.includes(`(R-${rule})`)) errors.push(`Missing project rule R-${rule}`);
  }
  for (const file of files.filter((path) => /\.(?:ts|mjs)$/.test(path))) {
    const name = relative(root, file);
    if (name.startsWith("apps/api/src/"))
      errors.push(
        ...inspectPlacement(name),
        ...inspectImports(name, readFileSync(file, "utf8")).map((error) => `${name}: ${error}`),
      );
    if (/\.unit\.spec\.(?:ts|mjs)$/.test(name) && !name.includes("/__tests__/"))
      errors.push(`${name}: unit test must be in __tests__`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkRepository(process.cwd());
  if (errors.length) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      "Quality passed: local Markdown links/anchors, project context/section IDs, source import boundaries and unit-test placement. Static checks do not prove runtime consistency.\n",
    );
  }
}
