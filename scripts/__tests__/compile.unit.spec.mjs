import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { compileProject } from "../compile.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "exam-alias-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "src/nested"), { recursive: true });
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        rootDir: "src",
        outDir: "dist",
        sourceMap: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        paths: { "@shared/*": ["./src/*"], "@public/value": ["./src/value.ts"] },
      },
      include: ["src/**/*.ts"],
    }),
  );
  writeFileSync(
    join(root, "src/value.ts"),
    "export const value = 42; export interface Value { value: number }",
  );
  return root;
}

test("compiled aliases resolve static, dynamic, re-export and import-equals without a runtime hook", async (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "src/nested/main.ts"),
    `
    import { value } from '@shared/value';
    import other = require('@public/value');
    import type { Value } from '@shared/value';
    export { value as publicValue } from '@public/value';
    export const result: Value = { value: value + other.value };
    export const literal = '@shared/value';
    export const load = async () => (await import('@shared/value')).value;
  `,
  );
  assert.equal(compileProject(join(root, "tsconfig.json")), true);
  const entry = join(root, "dist/nested/main.js");
  const exported = createRequire(entry)(entry);
  assert.deepEqual(exported.result, { value: 84 });
  assert.equal(exported.publicValue, 42);
  assert.equal(await exported.load(), 42);
  assert.equal(exported.literal, "@shared/value");
  assert.doesNotMatch(readFileSync(entry, "utf8"), /require\(["']@/);
  const map = JSON.parse(readFileSync(entry + ".map", "utf8"));
  assert.deepEqual(map.sources, ["../../src/nested/main.ts"]);
  assert.ok(map.mappings.length > 0);
});

test("unresolved aliases fail compilation instead of producing a broken runnable artifact", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "src/nested/main.ts"),
    "import { missing } from '@shared/missing'; export { missing };",
  );
  assert.equal(
    compileProject(join(root, "tsconfig.json"), () => undefined),
    false,
  );
});
