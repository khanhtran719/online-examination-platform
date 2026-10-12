import { dirname, relative, resolve, sep } from "node:path";

import ts from "typescript";

// A narrow emit transform for this CommonJS application, using the compiler's
// own module resolver. Source maps are emitted in the same compiler pass.
export function compileProject(configFile, report = (message) => process.stderr.write(message)) {
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  const parsed = config.error
    ? { errors: [config.error] }
    : ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        dirname(resolve(configFile)),
        undefined,
        resolve(configFile),
      );
  const format = (diagnostics) =>
    report(
      ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => "\n",
      }),
    );
  if (parsed.errors.length) {
    format(parsed.errors);
    return false;
  }
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    format(diagnostics);
    return false;
  }
  const { rootDir, outDir, paths = {} } = parsed.options;
  if (!rootDir || !outDir || parsed.options.module !== ts.ModuleKind.CommonJS)
    throw new Error("API compilation requires explicit rootDir/outDir and CommonJS");
  const emittedPath = (file) => {
    const local = relative(rootDir, file);
    if (local.startsWith(`..${sep}`) || local === "..")
      throw new Error("Alias target escapes source root");
    return resolve(outDir, local.replace(/\.tsx?$/, ".js"));
  };
  const configuredAlias = (specifier) =>
    Object.keys(paths).some((alias) =>
      alias.endsWith("*") ? specifier.startsWith(alias.slice(0, -1)) : specifier === alias,
    );
  const rewrite = (context) => (source) => {
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ((ts.isIdentifier(node.expression) && node.expression.text === "require") ||
          node.expression.kind === ts.SyntaxKind.ImportKeyword) &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0]) &&
        configuredAlias(node.arguments[0].text)
      ) {
        const argument = node.arguments[0];
        const target = ts.resolveModuleName(
          argument.text,
          source.fileName,
          parsed.options,
          ts.sys,
        ).resolvedModule;
        if (!target) throw new Error("Compiled alias could not be resolved");
        let specifier = relative(
          dirname(emittedPath(source.fileName)),
          emittedPath(target.resolvedFileName),
        )
          .split(sep)
          .join("/");
        if (!specifier.startsWith(".")) specifier = `./${specifier}`;
        const replacement = ts.setOriginalNode(
          context.factory.createStringLiteral(specifier),
          argument,
        );
        ts.setTextRange(replacement, argument);
        return context.factory.updateCallExpression(node, node.expression, node.typeArguments, [
          replacement,
        ]);
      }
      return ts.visitEachChild(node, visit, context);
    }
    return ts.visitNode(source, visit);
  };
  const result = program.emit(undefined, undefined, undefined, false, { after: [rewrite] });
  if (result.diagnostics.length) format(result.diagnostics);
  return !result.emitSkipped && result.diagnostics.length === 0;
}
