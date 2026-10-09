# ATT-09 local retention evidence —2026-10-09

Owner: Assessment WRITE maintenance; no live AWS, browser HTTPS, production
capacity/SLO/cost or complete privacy purge claim. [Closure](../../assessment-retention-2026-10-09.md),
[ADR](../../adr/011-assessment-retention-compaction.md),
[runbook](../../runbooks/assessment-retention.md).

## Runs

| Raw artifact | Scope/result |
| --- | --- |
| rt-domain-red.log | Missing new Domain implementation, expected RED |
| rt-app-red.log | Missing new Application plus2 compact-identity grading/recovery failures |
| rt-unit-green.log |41 focused unit cases PASS |
| rt-pg-red.log | Baseline0001–0016 lacks maintenance function;1 failed/12 deselected |
| rt-pg-initial.log / rt-pg-next.log | Fixture revision/causationId mistakes, retained original failures |
| rt-pg-next2.log | Draft deferred COMMIT guard42501,9 failed/7 passed; no broad grant fix |
| rt-pg-fixed.log |10 payload cases PASS; plan fixture/teardown timeout failure retained |
| rt-plan-final.log | Isolated natural plan PASS/15 deselected; final full suite has no skip |
| rt-integration-final.log | First full239 PASS/1 Catalog timing failure |
| rt-catalog-check.log | Isolated Catalog6/6 PASS before stored-boundary fixture strengthening |
| rt-integration-green.log | Intermediate240 PASS/15 suites, before final finite-time review |
| rt-finite-red.log | Direct RPC incorrectly purges nonfinite completion,1 failed/16 deselected |
| rt-integration-complete.log | Intermediate241 PASS/15 suites, including ±infinity |
| rt-timezone-red.log | Direct RPC prunes receipt167.5hours old under DST,1 failed/17 deselected |
| rt-integration-accepted.log | Final242 PASS/15 suites,0 skipped;18 retention cases including ±infinity/DST |
| rt-root-complete.log | Final375 PASS:238 API/33 suites,41 tooling,96 Web |
| rt-type-accepted.log / rt-build-timezone.log | Final typecheck/build PASS |
| rt-lint-accepted.log / final-doc-checks.log | Final lint/quality/contracts46/425 and closure-document checks PASS |

Run integration with a disposable administrator using port55435, never the
long-lived development55432. Per-suite random databases/dedicated logins are
created, migrations applied by owner-bound login, runtime work performed by
restricted API/grader/recovery/maintenance credentials, then closed/dropped.
An isolated temporary global setup routed new grading/retention diagnostics here;
old accepted result/evidence artifacts were not regenerated. Credentials are fake
local fixtures; no production secret was read/stored. Do not reuse administrator
fixture URLs as application credentials.

Root invocation: `npm test`. Integration invocation:
`npm run test:integration -- --globalSetup /private/tmp/retention-validation-env.cjs`.
The temporary setup selects TEST_DATABASE_ADMIN_URL on55435 and redirects
RETENTION_EVIDENCE_FILE/GRADING_EVIDENCE_FILE/GRADING_MAX_EVIDENCE_FILE to this
new directory. It does not set RESULTS_EVIDENCE_FILE. Source/provenance records
are in source-hashes.json/verification.json; no raw secret env file is archived.

## Measurements

maximum-local.json is one500-question/5000-selection purge job.7 observed client
SQL calls include2BEGIN/2COMMIT and3 function RPCs; functions execute more internal
statements. 63.438ms is one local elapsed sample, not p95/p99/throughput/capacity/cost.
plan-local.json runs the exact applied discovery SELECT under its owner role,
without forced planner options, on100k synthetic FAILED rows plus an eligible
completed row. The due partial index is selected; execution 2.115ms. It does not
cover100k blocked completed candidates, saturation or RDS. Fixture ANALYZE runs
before deferred bulk-seed guards; existing guard/FK enforcement stays enabled.

grading-control.json and grading-maximum-control.json are fresh normal-grading
controls emitted by existing integration tests. They belong to this run; prior
accepted grading evidence is unchanged. No before/after optimization is claimed.
Real observed locks, counter contention, two-maintainer fencing, audit rollback,
source/DLQ duplicates and compiled worker SIGTERM/default-off are assertions in
the new integration suite. Lost COMMIT ACK is a synthetic post-commit wrapper
throw, not a physical network interruption.

## Preservation and cleanup

preservation-before.json covers322 protected files (16 applied migration source
files +306 historical evidence files). verification.json records unchanged hashes
and17 matching source/build migrations. No old migration/checksum/report/evidence
is rewritten. New forward0017 is tested only in disposable fixtures; no development
or AWS migration. New bootstrap NOLOGIN group carries no login password.
cleanup.json/cleanup.log record0 temporary databases/logins/other-DB connections
and stopping only the PG55435 and Mailpit dependencies started for this increment,
with volumes preserved. The first timed-out fixture was separately cleaned using
its exact generated names after it had no active connections; no DROP FORCE.

No commit/stage/deploy is part of this increment. Final source hashes describe
working-tree code; Git revision alone is not its complete provenance. Full AWS,
restore/deletion-ledger, pool/utilization/saturation/storage cost and rollout-image
validation remain separate acceptance gates.
