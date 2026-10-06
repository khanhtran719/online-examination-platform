# Test inventory

No legacy baseline or skipped/disabled tests.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 20 | restored status/expiration provenance, CREATED/start, deadline, submit duplication, expiration, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Scoring unit](../apps/api/src/modules/assessment/domain/__tests__/scoring.unit.spec.ts) | 8 | exact match/order/cardinality, duplicates, membership, unanswered questions, invalid scoring definitions | Jest / pure TypeScript |
| [Quality tooling unit](../scripts/__tests__/quality.unit.spec.mjs) | 9 | import-type/import-equals, bare Node networking, technical barrels, Domain→Application, external/dynamic/re-export imports, module-private dependencies, public capability, links/anchors/fences | Node test |
| [Contract tooling unit](../scripts/__tests__/contracts.unit.spec.mjs) | 11 | OpenAPI/examples, event identity/time/schema/secret rejection, candidate leak rejection, save bounds/clear, auth public-path allowlist, Origin/CSRF/idempotency/owner/cursor metadata | Node test |

These cases test helper/static-check behavior. They do not verify PostgreSQL transactions, request/receipt idempotency, session security, SQS delivery or production SLO. Required application integration scenarios are in [contract test matrix](contract-tests.md) and remain unimplemented.
