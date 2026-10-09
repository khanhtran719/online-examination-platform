# ATT-10/11 HTTP fault evidence —2026-10-09

Local real HTTP/compiled API/restricted PostgreSQL proof; no AWS or production
SLO/capacity/cost acceptance. [Report](../../assessment-http-faults-2026-10-09.md),
[runbook](../../runbooks/assessment-http-recovery.md).

| Artifact | Scope/result |
| --- | --- |
| hf-initial.log | Sandbox EPERM, setup could not connect; not runtime RED |
| hf-first-network.log |13 PASS/10 fixture expectation failures (event identity/CSRF) |
| hf-corrected.log |16 PASS/7 fixture failures (unsaved answers are an empty list) |
| matrix-fixture-partial.json | Partial sanitized records from that second run |
| hf-matrix.log / matrix-local.json | Focused26/26 PASS after corrected assertions and actual pool tests |
| hf-root.log |375 PASS:238 API/33 suites,41 tooling,96 Web |
| hf-typecheck.log / hf-build.log | TypeScript/build PASS |
| hf-lint.log | lint/architecture/link/contract46/425 PASS |
| hf-final-doc-checks.log | Final lint/architecture/Markdown/contract46/425 checks after closure-document updates PASS |
| hf-integration-full.log / matrix-full.json | Final268/268/16 suites PASS,0 skipped;26 new HTTP cases |
| preservation-before.json | SHA256 of17 applied SQL +347 historical evidence files (364 protected) |
| verification.json / source-hashes.json |364 protected files unchanged;17 source/build migrations match;26 fault records,0 temporary key directories; current source hashes |
| cleanup-db.json | External read-only check:0 temporary databases/logins/other-database connections |
| cleanup-services.log / container-postgres.json / container-mailpit.json | Stopped only PG55435/root Mailpit; both State=exited, volumes preserved |

Focused invocation: `npm run test:integration -- --globalSetup
/private/tmp/assessment-http-validation-env.cjs --runTestsByPath
apps/api/tests/integration/assessment-http-faults.spec.ts`.
Full invocation: `npm run test:integration -- --globalSetup
/private/tmp/assessment-http-validation-full.cjs`.
Temporary setups select the disposable55435 administrator and route only this
suite's sanitized output into this new directory. Full setup unsets
RESULTS_EVIDENCE_FILE/RETENTION_EVIDENCE_FILE/GRADING_EVIDENCE_FILE/
GRADING_MAX_EVIDENCE_FILE/DISPATCH_EVIDENCE_FILE, so old accepted files are not
regenerated. No credential env, secret key, HTTP body or raw application log is
archived here. See report for fault/sample timing interpretation; null means
not measured. Fixture-local timeout settings are not production tuning evidence.

Each suite owns disposable databases/logins and removes them after draining.
The new suite also owns loopback proxies, compiled API processes and ephemeral
0600 key files. Final external cleanup/preservation checks PASS.
Root Mailpit11025 and test PostgreSQL55435 were started for this run; development
55432 stays untouched. No volume is deleted.
