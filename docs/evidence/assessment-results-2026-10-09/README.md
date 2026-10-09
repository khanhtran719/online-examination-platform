# Candidate result/history/review local evidence —2026-10-09

[Closure](../../assessment-results-2026-10-09.md) accepts ATT-08 locally, with
344 root/224 integration PASS,0 skipped; lint/typecheck/build/contracts46/425 PASS.
No sustainable capacity, AWS cost, SLO or production acceptance is inferred.

## Artifact inventory

| Artifact | Meaning |
| --- | --- |
| unit-red.log / policy-red.log | Missing Application/Domain capability before implementation |
| http-red.log |3 actual HTTP routes returned404 before wiring |
| fixture-first-regressions.log / fixture-next-regressions.log | Test setup errors: byte-limited question traversal, logout token kind, absent revision and wrong rate-table name; corrected fixtures |
| unit-green-initial.log / http-green-initial.log / targeted-green.log / plans-green.log | Earlier scoped GREEN checks; deselected tests are not final acceptance |
| root-before-domain-guard.log / integration-before-domain-guard.log |335/224 intermediate checks before explicit pure Domain rule |
| root-green.log / integration-green.log | Final344 root and224 integration/14 suites, no skip |
| lint-green.log / lint-docs-green.log / typecheck-green.log / build-green.log | Runtime checks and final repeated lint/links/contracts after documentation changes |
| read-local.json | Final20 raw latency/query/byte samples per route, nearest-rank percentiles, observed sequential rate, CPU and RSS delta |
| plans-local.json | Final natural100k history head/deep plans and denied review key gate |
| read-targeted.json / plans-targeted.json / read-before-domain-guard.json / plans-before-domain-guard.json | Preserved earlier diagnostics; not the final measurements |
| grading-transaction-control.json / grading-maximum-control.json | Full-suite grading regression output at new paths; historical grading evidence untouched |
| preservation-before.json / preservation-final.json |289 protected files unchanged:16 migrations +273 prior evidence;16 built bundles match |
| source-final.json / checks-final.json / self-review.json / cleanup.json | Final provenance, checks, architecture/security review and owned-service cleanup |

The first lint attempt also caught two technical adapter imports in an Application
unit test. They were replaced with port fakes; no checker exemption was added.
HMAC signature and actual complete HTTP byte encoding remain real integration
tests. Test-setup failures are recorded as fixture failures, not runtime fixes.

## Reproduction and environment

Use Node24, PostgreSQL17 from infra/identity-https/compose.yaml on port55435 and
the root Mailpit service. This increment used an isolated test admin connection;
never target the long-lived development database on55432 or a production account.
Integration creates restricted temporary databases/logins, applies the immutable
16-migration bundle and drops its own fixtures afterward.

Run npm test, npm run lint, npm run typecheck and npm run build. For integration,
set TEST_DATABASE_ADMIN_URL to the isolated local test administrator URL and run
npm run test:integration. To collect a fresh diagnostic, choose a **new** evidence
directory and set RESULTS_EVIDENCE_FILE to its read-local.json,
GRADING_EVIDENCE_FILE and GRADING_MAX_EVIDENCE_FILE to separate new JSON files.
plans-local.json is written beside read-local.json. Do not overwrite this accepted
directory or point grader output at historical evidence paths.

The final invocation supplied these environment variables via a temporary Jest
globalSetup file and used --runInBand. Logs preserve the invocation. Only PG55435
and Mailpit were started/stopped; volume data, shared NOLOGIN groups and the
development database were preserved. Cleanup observed0 temporary databases,
0 extra LOGIN roles and0 connections to other databases before stopping services.

## Measurement limits

Latency is sequential Fastify injection through current auth/rate admission and
the real restricted PG adapter, not TLS/socket/network end-to-end load. Each
series has20 samples on3 questions; p99 is its maximum. CPU includes the test
process. RSS delta can be negative after GC and is not memory allocated/request.
No warmup/soak/saturation/cross-AZ/cost or before/after optimization claim exists.

History plans use100.000 synthetic FAILED attempts for one actor/version; this
is not the complete target dataset. Key nodes with Actual Loops0 prove the local
denied plan skips lookup. Exact clock equality is a pure Domain test; the PG close
test uses fixture-only immutable-trigger control to move frozen close into the
past, reenables it and observes actual HTTP release. Runtime never changes policy.
Review payload tests traverse escaped maximum content with real HMAC cursors and
measure the entire encoded envelope≤262144 bytes without skipped rows. SQL may
still construct up to101 large rows before clipping; allocations/concurrent
pressure need a later measured experiment.
