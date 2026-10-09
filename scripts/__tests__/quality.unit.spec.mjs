import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectImports, inspectPlacement, localLinks, headingAnchors } from "../quality.mjs";

test("finds forbidden external, dynamic and re-export imports while ignoring comments", () => {
  const code = `// import { Client } from 'pg';\nexport { Client } from 'pg';\nconst driver = import('@aws-sdk/client-sqs');`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code).length,
    2,
  );
});
test("detects module-private and same-module infrastructure access from application", () => {
  const path = "apps/api/src/modules/assessment/application/save.ts";
  assert.equal(
    inspectImports(path, `import x from '../../catalog/infrastructure/catalog.repository';`).length,
    2,
  );
  assert.equal(
    inspectImports(path, `import x from '../infrastructure/attempt.repository';`).length,
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
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code).length,
    2,
  );
});

test("rejects Node network imports with or without node prefix", () => {
  const code = `import http from 'http'; import https from 'node:https';`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code).length,
    2,
  );
});

test("checks technical folder barrel imports without a trailing slash", () => {
  const code = `import sql from '../infrastructure'; export { adapter } from '../presentation';`;
  assert.equal(
    inspectImports("apps/api/src/modules/assessment/application/save.ts", code).length,
    2,
  );
});

test("keeps platform technical and presentation independent of infrastructure", () => {
  assert.equal(
    inspectImports(
      "apps/api/src/platform/infrastructure/security/runtime-config.ts",
      `import { JwtSessionTokens } from '../../../modules/identity/infrastructure/security/identity-crypto';`,
    ).length,
    1,
  );
  assert.equal(
    inspectImports(
      "apps/api/src/modules/identity/presentation/http/identity.controller.ts",
      `import { HttpSession } from '../../infrastructure/http/http-session';`,
    ).length,
    1,
  );
  assert.deepEqual(
    inspectImports(
      "apps/api/src/main.ts",
      `import { IdentityService } from './modules/identity/application/identity.service';`,
    ),
    [],
  );
});

test("keeps domain independent of application orchestration", () => {
  const code = `import { SubmitAttemptUseCase } from '../application/submit-attempt.use-case';`;
  assert.equal(inspectImports("apps/api/src/modules/assessment/domain/attempt.ts", code).length, 1);
});

test("rejects outer helpers, config and workers in business layers, including barrels and type imports", () => {
  const path = "apps/api/src/modules/identity/application/services/identity.service.ts";
  for (const dependency of [
    "../../../../shared/common",
    "../../../../config",
    "../../../../workers",
  ]) {
    assert.ok(inspectImports(path, `type X = import('${dependency}').X;`).length > 0, dependency);
  }
  assert.ok(inspectImports(path, "import models = require('sequelize');").length > 0);
});

test("keeps all global technical roots independent from business modules", () => {
  for (const group of [
    "shared/common",
    "shared/application/ports",
    "infrastructure/health",
    "config",
  ]) {
    const path = `apps/api/src/${group}/adapter.ts`;
    assert.ok(
      inspectImports(
        path,
        "import x from 'apps/api/src/modules/identity/application/facades/identity.facade';",
      ).length > 0,
      group,
    );
  }
});

test("permits explicit public capabilities while rejecting private application imports", () => {
  const path = "apps/api/src/modules/assessment/application/commands/start.ts";
  assert.ok(
    inspectImports(path, "import x from '../../../identity/application/services/identity.service';")
      .length > 0,
  );
  assert.deepEqual(
    inspectImports(path, "import x from '../../../identity/application/facades/identity.facade';"),
    [],
  );
  const worker = "apps/api/src/workers/outbox/verification.main.ts";
  assert.ok(
    inspectImports(
      worker,
      "import x from '../../modules/identity/infrastructure/mail/verification-mail';",
    ).length > 0,
  );
  assert.deepEqual(
    inspectImports(worker, "import x from '../../modules/identity/identity-worker.factory';"),
    [],
  );
});

test("requires module composition to use explicit public capabilities of another module", () => {
  const path = "apps/api/src/modules/assessment/assessment.module.ts";
  assert.ok(
    inspectImports(path, "import x from '../identity/application/services/identity.service';")
      .length > 0,
  );
  assert.deepEqual(inspectImports(path, "import x from '../identity/identity.module';"), []);
  // A public composition factory is not an inbound application capability for controllers.
  for (const [caller, dependency] of [
    [
      "apps/api/src/modules/assessment/presentation/http/assessment.controller.ts",
      "../../../identity/identity-worker.factory",
    ],
    [
      "apps/api/src/modules/identity/presentation/http/identity.controller.ts",
      "../../identity-worker.factory",
    ],
  ])
    assert.ok(inspectImports(caller, `import x from '${dependency}';`).length > 0);
});

test("rejects legacy placement after normalization closes", () => {
  for (const file of ["platform/application/security.ts", "worker.ts", "operator-admin.ts"])
    assert.ok(inspectPlacement(`apps/api/src/${file}`).length > 0);
  assert.deepEqual(inspectPlacement("apps/api/src/workers/outbox/verification.main.ts"), []);
});

test("prevents business dependencies hidden behind shared root barrels or unsupported aliases", () => {
  const path = "apps/api/src/modules/identity/application/services/identity.service.ts";
  for (const dependency of [
    "../../../../shared",
    "../../../../shared/index",
    "@shared/common",
    "jose",
    "argon2",
    "nodemailer",
  ])
    assert.ok(inspectImports(path, `import x from '${dependency}';`).length > 0, dependency);
});
test("allows only the reviewed Catalog worker composition boundary", () => {
  const worker = "apps/api/src/workers/sqs/grading.main.ts";
  assert.deepEqual(
    inspectImports(worker, "import x from '../../modules/catalog/catalog-worker.factory';"),
    [],
  );
  assert.notDeepEqual(
    inspectImports(
      "apps/api/src/modules/assessment/application/services/grading.ts",
      "import x from '../../../catalog/catalog-worker.factory';",
    ),
    [],
  );
  assert.notDeepEqual(
    inspectImports(
      worker,
      "import x from '../../modules/catalog/infrastructure/persistence/postgres-catalog.query';",
    ),
    [],
  );
});
