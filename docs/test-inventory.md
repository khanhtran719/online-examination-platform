# Test inventory

No legacy baseline or skipped/disabled tests.

| Suite | Cases | Purpose | Runtime |
| --- | --- | --- | --- |
| [Attempt unit](../apps/api/src/modules/assessment/domain/__tests__/attempt.unit.spec.ts) | 10 | deadline, submit duplication, expiration, invalid transitions/time, defensive snapshot, grading retry | Jest / pure TypeScript |
| [Scoring unit](../apps/api/src/modules/assessment/domain/__tests__/scoring.unit.spec.ts) | 8 | exact match/order/cardinality, duplicates, membership, unanswered questions, invalid scoring definitions | Jest / pure TypeScript |
| [Quality tooling unit](../scripts/__tests__/quality.unit.spec.mjs) | 5 | external/dynamic/re-export imports, module-private dependencies, public capability, links/anchors/fences | Node test |

These cases test helper/static-check behavior. They do not verify PostgreSQL transactions, request/receipt idempotency, session security, SQS delivery or production SLO. Required application integration scenarios are in [contract test matrix](contract-tests.md) and remain unimplemented.
