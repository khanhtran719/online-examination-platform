import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectImports, localLinks, headingAnchors } from "../quality.mjs";

test("finds forbidden external, dynamic and re-export imports while ignoring comments", () => {
  const code = `// import { Client } from 'pg';\nexport { Client } from 'pg';\nconst driver = import('@aws-sdk/client-sqs');`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code)
      .length,
    2,
  );
});
test("detects module-private and same-module infrastructure access from application", () => {
  const path = "apps/api/src/modules/assessment/application/save.ts";
  assert.equal(
    inspectImports(
      path,
      `import x from '../../catalog/infrastructure/catalog.repository';`,
    ).length,
    2,
  );
  assert.equal(
    inspectImports(
      path,
      `import x from '../infrastructure/attempt.repository';`,
    ).length,
    1,
  );
});
test("permits a public application capability and infrastructure driver adapter", () => {
  assert.deepEqual(
    inspectImports(
      "apps/api/src/modules/assessment/application/start.ts",
      `import x from '../../catalog/application/catalog.facade';`,
    ),
    [],
  );
  assert.deepEqual(
    inspectImports(
      "apps/api/src/modules/assessment/infrastructure/sql.ts",
      `import { Pool } from 'pg';`,
    ),
    [],
  );
});
test("extracts real local links but excludes fenced examples and external URLs", () => {
  assert.deepEqual(
    localLinks(
      "[profile](docs/profile.md#scope)\n```md\n[example](missing.md)\n```\n[web](https://example.com)",
    ),
    ["docs/profile.md#scope"],
  );
});
test("resolves repeated headings and ignores code-fence pseudo-headings", () => {
  assert.deepEqual(
    [...headingAnchors("# Scope\n## Scope\n```\n# Fake\n```")],
    ["scope", "scope-1"],
  );
});

test("checks TypeScript import types and import-equals dependencies", () => {
  const code = `type Client = import('pg').Pool; import sqs = require('@aws-sdk/client-sqs');`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code)
      .length,
    2,
  );
});

test("rejects Node network imports with or without node prefix", () => {
  const code = `import http from 'http'; import https from 'node:https';`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code)
      .length,
    2,
  );
});

test("checks technical folder barrel imports without a trailing slash", () => {
  const code = `import sql from '../infrastructure'; export { adapter } from '../presentation';`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code)
      .length,
    2,
  );
});

test("keeps domain independent of application orchestration", () => {
  const code = `import { SubmitAttemptUseCase } from '../application/submit-attempt.use-case';`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/domain/attempt.ts", code)
      .length,
    1,
  );
});
