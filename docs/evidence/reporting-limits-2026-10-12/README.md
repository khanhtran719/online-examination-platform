# REP-07 local evidence,2026-10-12

RL-01–05 COMPLETE locally. [Plan/review](../../reporting-limits-2026-10-12.md),
[ADR-016](../../adr/016-bounded-report-responses-and-source-review.md),
[runbook](../../runbooks/reporting-limits.md).

Final result: **644 root tests** =492 API/53 suites +53 tooling +99 Web/24 files;
**418 full PostgreSQL/SMTP/compiled HTTP integration tests in24 suites**,0 skipped,
343.413s. Lint/typecheck/API build/quality and48 operations/445 contract examples
PASS. No Web source changed; fresh browser/HTTPS or Web build was not rerun.
No deploy, commit or PR; production NOT ACCEPTED.

New coverage:17 Application tests exercise accidental nested/top-level PII and key
expansion, forced review null, pending null scores, oversized query projections,
max20 sections/max10 options/max100 output with101 lookahead.11 tooling cases
exercise source/Port/migration/column mutations and nested adapter inventory bypass.
7 real PG cases compare15 consumed table signatures/134 columns, detect5 physical
drifts and restore via rollback, then execute all7 adapters/8 projections under
the restricted API role with1 SQL each.1 additional compiled TCP case covers all7
Admin report routes: unsupported export/PII/OFFSET400, permission403/session401,
page overflow/duplicate400, bounded100 JSON and no-store. Existing report suites
retain nonempty join/scoring/privacy/freshness/audit rollback and8-statement
auth/admission-inclusive budgets. Independent synthetic Admin actors keep the new
case below actual rate-admission burst; no production control is bypassed.

| Evidence | Result / scope |
| --- | --- |
| [Initial unit RED](unit-red.txt), [initial GREEN](unit-green-initial.txt) | Initial13 cases:12 fail/1 pass before fix, then13 pass. Four maximum-page cases were added later; final root includes all17. |
| [Tooling behavioral RED](tooling-behavior-red.txt), [nested adapter RED](nested-adapter-red.txt), [GREEN](tooling-green.txt) | Stub check lacked change detection; later nested-folder regression failed before recursive inventory fix. Final11 pass; final root reran the formatted implementation. |
| [Root tests](root-tests.txt) | All644 pass. |
| [First focused PG/TCP](integration-focused-initial.txt) |34 pass/1 fixture failure: display_name already nullable, so DROP NOT NULL made no change. No production bug; test corrected to nonnullable enabled. |
| [Final schema](integration-schema-final.txt), [physical schema](schema-final.json) |7 pass; every drift rolled back and complete signature rechecked. |
| [Full integration](integration-full.txt) |418/24 suites PASS; deliberate fault tests emit safe exception/correlation logs. |
| [Focused TCP records](compiled-http-focused.json), [full TCP records](compiled-http-full.json) | Existing TCP/restart/timeout/recovery diagnostic records; no sustainable capacity or latency SLO inference. |
| [Build](build.txt), [typecheck](typecheck.txt), [lint/quality/contracts](lint.txt) | PASS; no new public operation or envelope change. |
| [Integrity](integrity.json), [protected hashes](protected-before.json) |609 prior evidence/migration files unchanged,19 source/build migration bytes match. All7 SQL adapters unchanged against baseline commit. |
| [Source hashes](source-hashes.json), [summary](summary.json) |100 final source/contract fingerprints and baseline commit provenance. Early RED logs precede final formatting/additional tests and are not represented as final source snapshots. |
| [Cleanup](cleanup.json), [container stop](container-stop.txt) |0 disposable databases/logins/connections. Test PostgreSQL55435 and Mailpit11025 stopped with volumes retained; dev PostgreSQL55432 untouched. |

Reproduction: Node24, current locked dependencies, existing PostgreSQL17-alpine
test container atlocalhost55435 with disposable administrator, real19 migrations
and restricted API/owner groups. Full integration also uses existing local Mailpit
at11025. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, then
`npm run test:integration` with `TEST_DATABASE_ADMIN_URL` set to the disposable
fixture. Set `REPORTING_SCHEMA_EVIDENCE_FILE` and `TEST_ASSESSMENT_HTTP_EVIDENCE`
to fresh output paths; set `ASSESSMENT_EVIDENCE_DIR` to a fresh directory. Clear
other historical evidence environment variables to avoid overwriting archives.
Integration fixtures create/drop random databases and logins; never use production.

Limits: correctness/contract checks only, not a before/after performance experiment.
No SQL/index/pool/resource change, AWS traffic/cost/saturation/headroom measurement,
HTTP p95/p99 acceptance or RDS restore/PITR. The manifest deliberately fingerprints
full table column/type/typmod/nullability shape, not constraints/triggers/grants/
plans/semantics. Checksums record reviewed changes; tests and human review still
own correctness. Paged live JSON is the implemented extraction contract; CSV/XLSX
and consistent bulk export are not implemented or accepted. REP-08 wider read
evaluation, REP-04 independent privacy lifecycle and AWS/Web acceptance remain open.
