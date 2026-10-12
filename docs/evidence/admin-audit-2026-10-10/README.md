# REP-06 Audit lifecycle evidence — 2026-10-10

Local AU-01–06 deliverables complete; production NOT ACCEPTED.
[Plan/review](../../admin-audit-2026-10-10.md),
[ADR-015](../../adr/015-audit-browse-and-fixed-retention.md),
[runbook](../../runbooks/admin-audit.md),
[experiment](../../../experiments/admin-audit/README.md).
No deployment/commit/PR, new dependency/index/cache/AWS service or capacity winner.
Forward migration0019/NOLOGIN group supplies fixed online retention; job default-off.

## Validation and provenance

- [Root616 tests](checks/root-final.log):475 API/52 suites,42 tooling,99 Web/24 files;
 54 new API unit cases and3 new Web cases relative to REP-05. Fail-first paths
 include pure projection/Application/cursor/config/retention, Web parser/demo,
 future/unsorted projection and existing source labels. Source-label redaction was
 corrected for actual QUESTION_IMPORT/SUBMISSION_EVENT/RETENTION_BATCH labels.
- [Full410 integration cases/23 suites](checks/integration-full-final.log),0 skipped;
 [58 final audit/compiled TCP cases](checks/integration-final-subset.log),0 skipped;
 [31 final audit cases](checks/pg-final.log),0 skipped, after expanded role checks.
 Includes current audit.read, auth-before-parse, audit/lock rollback, strict
 paging/redaction, append-only/API/maintenance isolation, age/batch/correlation/
 rollback/no-op/concurrent SKIP LOCKED, one-shot/default-off and admitted SIGTERM.
- [Chromium demo1 case](checks/browser.log):320px table navigation, USER/SYSTEM,
 null target, detail focus restoration and preserved replay/capability behavior.
 This is focused demo verification; live Admin/HTTPS/end-to-end business APIs stay
 gated. [Live build](checks/web-build-final.log) and
 [demo build](checks/web-demo-build.log) pass.
- [API build](checks/build-final.log),[typecheck](checks/typecheck-final.log),
 lint/Web lint, quality boundaries/links and contracts48 operations/445 examples
 are recorded in checks/validation. Runtime dependency scans report0 advisories
 for [API](checks/runtime-audit.json) and [Web](checks/web-runtime-audit.json).
 This scan is neither image/IaC/penetration nor production security acceptance.
- [Formatting proof](checks/sql-format-final.json):40 embedded queries/768 tokens,
 identical literals and parameter order; prior18 migration bytes and556 protected
 historical files unchanged.19 source/build migrations match. Subsequent additional
 privilege assertions are new behavior checks, not a whitespace optimization.
 [Manifest](validation.json) records immutable history, final source hashes and
 [cleanup](checks/cleanup-before-stop.json):0 disposable DBs/logins/connections;
 [test containers stopped](checks/container-stop.log), volumes retained. Dev55432
 was not used. Compiled HTTP fixture removes its ephemeral key directory.

Early failures are preserved, not omitted: missing new modules in unit RED, new
Web DTO parser RED, missing actorType in one initial demo sample/build, unknown
source labels, unavailable retention RPC before migration, relative Jest globalSetup
path resolution and one test-only nonexistent role name. Fixes are bounded to this
increment. Mandatory-audit fault logs containing only event/correlation are expected.
The role fixture was corrected to real mail/expiry/dispatch groups; final31 all pass.
No intentional deselection in accepted full/final suites. Fail-first/filter-only
runs retain their own skipped populations and do not count as full acceptance.

## Measurements

[Raw browse/retention/restore files](diagnostic/) and [generated summary](summary.json)
retain all samples/plans/bindings; no overwritten prior evidence. PostgreSQL17,
Node24 ARM64, API pool2, maintenance pool1, no AWS. Synthetic100k records, page100
plus lookahead, first/deep keyset;3 warmups/20 sequential query and20 HTTP inject
samples per stage,110ms pacing. Existing audit_retention backward Index Scan
naturally supplies101 rows, with deep tuple condition in Index Cond; no forced
plan/OFFSET or new index. Work still depends on data skew/generic plans/dead tuples.

Final audit-only run diagnostic-3c843d04 records:

| Population | p50 ms | p95 ms | p99 ms | SQL calls | Payload bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| First query only | 1.909 | 2.310 | 3.034 | 1 | — |
| Deep query only | 2.429 | 3.830 | 4.127 | 1 | — |
| First local HTTP inject | 29.191 | 33.751 | 34.927 | 8 | 37,797–37,807 |
| Deep local HTTP inject | 27.246 | 32.223 | 33.775 | 8 | 37,810 |

Other independent local run tails remain in raw files/summary. Do not average their
percentiles or label them before/after matched optimizations. Empirical p99 of20
samples is the maximum, not a statistically reliable production tail. Inject excludes
TCP/TLS/ALB; paced sample RPS is not sustainable capacity. Harness CPU/DB pool/
transaction and process RSS are recorded; isolated task CPU/allocation, DB CPU/IOPS,
concurrent users, saturation, optimal pool and cost remain unmeasured/null.

Final retention-51fa7832 records36000 eligible rows, sequential500/1000 batches,
3 warmups/20 committed samples each,3 SQL calls per batch (BEGIN/RPC/COMMIT).500
batch p50/p95/p99≈4.987/5.535/5.838ms;1000≈3.886/4.635/4.927ms. Populations ran in
succession with changing table state; these are bounded commit diagnostics, not a
matched sizing comparison or sustainable jobs/sec. Other run1000 p99≈12.973ms remains
visible. Retain default500; no optimal batch/cadence/AWS jobs/USD claim.

Four real pg_dump/pg_restore runs store bytes/timings and verify old-row resurrection,
fixed-policy reapplication, young-row survival and restored owners/grants/runtime
DELETE denial. Dump stays in memory, uses synthetic data and is never exported.
Local restore time is not RDS RTO; RPO/RTO are null. Independent privacy ledger,
session/mail/leaderboard reconciliation and managed backup/PITR remain open.

## Reproduce

Use an isolated fresh shell to avoid inherited evidence-output variables. Never
point these administrator fixtures at production. The committed tests require
localhost55435 and create/drop their own random databases/logins.

```sh
docker compose -f infra/identity-https/compose.yaml up -d --wait postgres
docker compose up -d mailpit
npm run build
export TEST_DATABASE_ADMIN_URL=postgres://examination_https:local-https-only-password@127.0.0.1:55435/examination_https
export SMTP_HOST=127.0.0.1
export SMTP_PORT=11025
export ADMIN_AUDIT_EVIDENCE_DIR=.local/audit-rerun
export ASSESSMENT_EVIDENCE_DIR=.local/audit-assessment-rerun
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run web:lint
npm run web:build
npm run web:build:demo
```

For focused audit/compiled TCP use --runTestsByPath with the two spec paths. Start
npm --prefix apps/web run preview:demo in a separate terminal, then run
npm --prefix apps/web run test:e2e -- --grep 'audit restores focus'; stop preview
and only the test containers afterwards, retaining volumes. The reviewed test-only
.local setup used for these captured runs redirects new evidence and clears older
output variables; it is not a runtime dependency or deployment configuration.
