# Test inventory

No legacy baseline or skipped/disabled tests.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 20 | restored status/expiration provenance, CREATED/start, deadline, submit duplication, expiration, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Scoring unit](../apps/api/src/modules/assessment/domain/__tests__/scoring.unit.spec.ts) | 8 | exact match/order/cardinality, duplicates, membership, unanswered questions, invalid scoring definitions | Jest / pure TypeScript |
| [Quality tooling unit](../scripts/__tests__/quality.unit.spec.mjs) | 9 | import-type/import-equals, bare Node networking, technical barrels, Domain→Application, external/dynamic/re-export imports, module-private dependencies, public capability, links/anchors/fences | Node test |
| [Contract tooling unit](../scripts/__tests__/contracts.unit.spec.mjs) | 16 | OpenAPI/examples, event identity/time/schema/secret rejection, candidate leak rejection, save bounds/clear, auth public-path allowlist, Origin/CSRF/idempotency/owner/cursor metadata, verification schema/POST, signed-token purpose/authority metadata and raw-token/username/ASCII negatives | Node test |
| [Database config unit](../apps/api/src/platform/infrastructure/database/__tests__/database-config.unit.spec.ts) | 13 | bounded pool/timeouts, TLS/URL overrides, arithmetic connection budget | Jest / pure validation |
| [Migration guard unit](../apps/api/src/platform/infrastructure/database/__tests__/migration-runner.unit.spec.ts) | 6 | top-level transaction/session rejection and allowed quoted/function bodies | Jest / trusted-file guard |
| [PostgreSQL integration](../apps/api/tests/integration/database.spec.ts) | 30 | schema/privileges/frozen membership/category/completion/submission identity, ALS/joined rollback, async isolation, locks/pool/server timeouts, safe observations/pg_stat_statements, atomic/checksum/concurrent migrations and zero-connection cleanup | PostgreSQL 17 / real restricted logins |

Inventory:72 unit/tooling +30 integration =102 cases, none skipped. Latest auth amendment ran **72 unit/tooling PASS**;30 integration cases last passed in Phase03 and were **not rerun** for unchanged DB source/schema. Technical PostgreSQL fixtures verify persistence primitives, not implemented start/save/submit/UUIDv7 receipt workflows, session authentication, SQS effects or production SLO. Required business scenarios in [contract test matrix](contract-tests.md) remain ATT-10/ASYNC-11/Identity work. See [Phase03 review](phase-03-review.md) and [auth amendment review](phase-04-contract-review.md).
