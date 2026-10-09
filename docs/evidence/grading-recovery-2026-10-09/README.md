# Grading recovery evidence — 2026-10-09

Local ASYNC-10 delivery; [closure](../../grading-recovery-2026-10-09.md),
[runbook](../../runbooks/grading-recovery.md),
[decision](../../adr/009-grading-recovery-generations.md).
No live AWS, deploy, capacity/cost or production acceptance.

| Artifact | Meaning |
| --- | --- |
| [recovery-red](recovery-red.log), [generation-red](generation-red.log) | Missing recovery use case and stale/future generation guard RED |
| [pg-role-red](pg-role-red.log), [pg-first-failure](pg-first-failure.log) | Restricted role/migration failures before grant/source fixes |
| [dlq-config-red](dlq-config-red.log), [dlq-transport-red](dlq-transport-red.log) | Missing DLQ mode/metadata transport RED |
| [cli-red](cli-red.log), [terminal-duplicate-red](terminal-duplicate-red.log) | Missing operator CLI and known FAILED redelivery guard RED |
| [use-cases-green](use-cases-green.log), [pg-transport-green](pg-transport-green.log) | Intermediate targeted GREEN; final runs supersede |
| [root-final](root-final.log) |327 PASS:190 API,41 tooling,96 Web |
| [integration-first-fixture-failure](integration-first-fixture-failure.log) | First full run:210 PASS/4 FAIL; minimal outbox fixture missing generation column |
| [integration-final](integration-final.log) |214 PASS/14 suites/0 skipped including fixture fix and restricted dispatch generation propagation |
| [build-final](build-final.log), [lint-before-docs](lint-before-docs.log), [typecheck-before-docs](typecheck-before-docs.log) | Compiled checks before closure documents; final documentation checks recorded separately |
| [lint-final](lint-final.log), [typecheck-final](typecheck-final.log), [documentation-final](documentation-final.log) | Final lint/typecheck/links/contracts and clean diff check |
| [transaction-local](transaction-local.json), [maximum-local](maximum-local.json) | Final short3/500-question normal-grading diagnostics,15 statements/job; no capacity/percentile/AWS inference |
| [transaction-before-final](transaction-before-final.json), [maximum-before-final](maximum-before-final.json) | Prior run observations kept separately, no causal comparison |
| [sql-format-preservation](sql-format-preservation.json) | Offline token/literal comparison for the formatting step; not schema/performance equivalence proof |
| [preservation-before](preservation-before.json), [preservation-final](preservation-final.json) |254 protected hashes unchanged:15 applied migrations/239 evidence;16 source/built assets match |
| [evidence-path-correction](evidence-path-correction.json) | Earlier diagnostic setup path mistake, original files restored to baseline hashes |
| [setup-path-error transaction](setup-path-error-transaction-boundary-final.json), [setup-path-error maximum](setup-path-error-maximum-boundary-final.json) | New observations displaced by the path mistake; retained here without altering prior evidence |
| [self-review](self-review.json), [checks](checks.json) | Architecture/transaction/authority/transport review and measured acceptance scope |
| [source-final](source-final.json), [cleanup](cleanup.json) | Final owned source/config/test/document provenance and disposable fixture/service cleanup |

Environment: macOS ARM64/Node24.17, PostgreSQL17 disposable databases on55435,
synthetic users/exams/questions/answers, loopback Mailpit and SQS SDK HTTP fixtures.
Temporary PG LOGINs inherit actual worker/recovery/operator/dispatch groups;
fixture seeding uses separate administrator authority. Development DB55432 is
explicitly rejected and was not migrated.

Reproduction: build, start the isolated HTTPS-compose PostgreSQL and root Mailpit,
then run `npm run test:integration -- --globalSetup <local-setup.cjs>`. Local setup
must set TEST_DATABASE_ADMIN_URL to the disposable administrator and diagnostic
paths GRADING_EVIDENCE_FILE/GRADING_MAX_EVIDENCE_FILE to a **new** evidence directory.
Never reuse historical artifact paths. Tests create/drop their DBs/logins without
DROP FORCE; save raw outputs before cleanup. Root `npm test`, lint/typecheck/build
are separate checks. No synthetic secrets/DB credentials are production secrets.

Authoritative final counts/checks, source hashes, cleanup and self-review are
recorded alongside these artifacts after closing validation. Intermediate RED/
GREEN files are historical steps, not additional independent capacity runs.
