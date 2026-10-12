import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import { ESLint } from "eslint";

const lint = new ESLint({ cwd: resolve("apps/web") });
async function violations(filePath, code) {
  const [result] = await lint.lintText(code, { filePath: resolve("apps/web/src", filePath) });
  return result.messages.filter((message) => message.ruleId === "web-boundaries/imports");
}

test("Web shared code cannot reach feature/app/adapter code through any import syntax", async () => {
  for (const code of [
    'import { value } from "@web/features/catalog/value";',
    'export { value } from "../../features/catalog/value";',
    'export * from "@web/shared/../../src/app/runtime";',
    'const value = import("@web/demo/api");',
    'import type { Value } from "@web/app/runtime";',
  ])
    assert.equal((await violations("shared/ui/fixture.ts", code)).length, 1, code);
});

test("Web features only use their owner, shared code and explicit app facades", async () => {
  for (const target of [
    "@web/demo/api",
    "@web/live/create-http-api",
    "../admin/gate",
    "@web/app/router",
    "@web/app",
  ]) {
    assert.equal(
      (await violations("features/catalog/fixture.ts", `import { value } from "${target}";`))
        .length,
      1,
      target,
    );
  }
  for (const target of [
    "./dashboard-model",
    "@web/shared/api/dto",
    "@web/app/runtime",
    "@web/app/session",
  ]) {
    assert.equal(
      (await violations("features/catalog/fixture.ts", `import { value } from "${target}";`))
        .length,
      0,
      target,
    );
  }
});

test("Web live adapter cannot import demo, and shared UI cannot own transport", async () => {
  assert.equal((await violations("live/fixture.ts", 'import "../demo/mount";')).length, 1);
  assert.equal((await violations("shared/ui/fixture.ts", 'import "../api/http";')).length, 1);
  assert.equal(
    (await violations("shared/ui/fixture.ts", 'const value = fetch("/v1/exams");')).length,
    1,
  );
});

test("Web composition remains allowed while internal traversal out of src is rejected", async () => {
  assert.equal(
    (await violations("app/fixture.ts", 'import "@web/features/catalog/catalog-pages";')).length,
    0,
  );
  assert.equal(
    (await violations("features/catalog/fixture.ts", 'import "@web/../../api/src/main";')).length,
    1,
  );
  assert.equal(
    (await violations("features/catalog/fixture.ts", 'const path = "../admin/gate"; import(path);'))
      .length,
    1,
  );
});
