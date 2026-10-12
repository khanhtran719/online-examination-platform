import assert from "node:assert/strict";
import { test } from "node:test";

import { ESLint } from "eslint";

test("autofix preserves the order of side-effect initialization imports", async () => {
  const source = `import './fonts.css';\nimport './tokens.css';\nimport './global.css';\nimport { resolve } from 'node:path';\nexport const value = resolve('.');\n`;
  const [result] = await new ESLint({ fix: true }).lintText(source, {
    filePath: "apps/api/src/fixture.ts",
  });
  const output = result.output ?? source;
  assert.equal(result.errorCount, 0);
  assert.ok(output.indexOf("fonts.css") < output.indexOf("tokens.css"));
  assert.ok(output.indexOf("tokens.css") < output.indexOf("global.css"));
});

test("type-import autofix retains value imports used in Nest decorator metadata", async () => {
  const source = `import { Injectable } from '@nestjs/common';\nimport { Service } from './service';\n@Injectable()\nexport class Controller { constructor(readonly service: Service) {} }\n`;
  const [result] = await new ESLint({ fix: true }).lintText(source, {
    filePath: "apps/api/src/fixture.ts",
  });
  assert.equal(result.errorCount, 0);
  assert.doesNotMatch(result.output ?? source, /import type.*Service/);
  assert.match(result.output ?? source, /import \{ Service \}/);
});
