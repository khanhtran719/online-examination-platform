# REP-08 local evidence,2026-10-12

RE-01–06 COMPLETE locally. [Plan/review](../../reporting-evaluation-2026-10-12.md),
[experiment](../../../experiments/reporting-evaluation/README.md).
Roadmap88/216 checked,128 pending. Production NOT ACCEPTED.

644 root tests =492 API/53 suites +53 tooling +99 Web/24 files PASS. Full
PostgreSQL/SMTP/compiled HTTP integration:427 tests/24 suites,0 skipped,375.875s.
The complete expanded candidate suite passed27; the final monitor suite passed18
after adding missing raw sample arrays to its test-only artifact. No production
API source, SQL, query Port, migration, grant, dependency or resource changed.
Lint/typecheck/API build/quality/contracts48 operations/445 examples pass; static
checks were repeated after the evidence-only monitor change and closure docs.
No Web source changed; browser/HTTPS/Web build was not rerun. No deploy/commit/PR.

Nine new real PostgreSQL/HTTP cases cover exact exam/version isolation and
deliberate Admin/public visibility, a real grader blocked at deferred COMMIT after
its writes, fresh atomic completion, and7 routes whose inserted access audit
fails at COMMIT. Report body release fails closed with503/no-store/null-data,
no durable audit/pool leak, and recovery succeeds after fault removal. Existing
fixtures retain current permission, admission, native completion and timeout controls.
The expanded100k candidate diagnostic adds8 natural plans for a separate3-attempt
target exam; global metrics/audit have intentional global scopes.

| Evidence | Result / scope |
| --- | --- |
| [First new-case run](cross-report-first.txt) |8 pass/1 fixture failure/18 deliberately deselected: serial110ms pacing exceeded the500ms grading lock deadline. |
| [Second run](cross-report-second.txt) |8 pass/1 fixture failure/18 deselected: start fell outside the default24h metric cohort. |
| [Corrected selection](cross-report-third.txt) |9 pass/18 deliberately deselected; no runtime change. |
| [Complete candidate suite](candidate-complete-first.txt) |27 pass/0 skipped, including its own100k foreign fixture and mixed-scope plans. |
| [Root checks](root-tests.txt), [full integration](integration-full.txt) |644 root/427 integration PASS. Safe exception/correlation events are intentional fault-handler output. |
| [Final monitor](monitor-final.txt), [raw verification](monitor-raw-verification.json) |18 pass/0 skipped;7 summaries recompute exactly from raw arrays and all HTTP SQL counts equal8. |
| [Build](build.txt), [typecheck](typecheck.txt), [lint](lint.txt), [final typecheck](typecheck-final.txt), [final lint](lint-final.txt) |PASS. Full suite preceded monitor raw-array addition; affected suite/static checks followed it. |
| [Initial closure-link check](lint-closure-initial.txt), [setup preflight](preflight.txt) |First closure check preceded creation of source-hashes/summary files; final link check reran after materialization. Setup initializes fresh paths and refuses reuse/nonfixture endpoints. |
| [Query review](query-review.json) |Per-route populations/percentiles/budgets and8 mixed-scope plan summaries; reference raw artifacts for full plans. |
| [Environment](environment.json), [artifact provenance](artifact-provenance.json), [source hashes](source-hashes.json), [summary](summary.json) |Baseline commit/runtime/container facts, exact copied diagnostic hashes and final source provenance. |
| [Integrity](integrity.json), [protected receipts](protected-before.json) |633 historical evidence/migration files unchanged;19 source/build migrations match; all API runtime source and7 adapters unchanged. |
| [Cleanup](cleanup.json), [container stop](container-stop.txt) |Final0 disposable databases/logins/connections; test55435/11025 stopped, volumes retained; dev55432 untouched. |

[Final container inventory](container-state.json): scoped stop commands succeeded;
the named test containers were absent at the final read-only check, and PostgreSQL
test/development volumes remained. The removal cause is not attributed. No
development-container or unrelated-container action was issued by this increment.

Fresh diagnostic populations,14 copied JSON artifacts:

- [Active candidates full checkpoint](active-candidates-full.json) and
  [final monitor raw capture](active-candidates-final.json):100k attempts,20 exams,
  2k active; existing temporary-index A/B/A removed afterward, no runtime index accepted.
- [Submissions and Admin result](submissions.json):100k attempts, first/continuation/
  version-filtered plans, bounded pages and one graded score.
- [Question statistics](question-statistics.json):10k frozen questions/100k options,
  synthetic counters; real grading/replay/purge correctness is tested separately.
- [Candidate full/mixed scope](candidate-results-full.json) and
  [earlier complete-suite diagnostic](candidate-results-focused.json):100k attempts,
  10k candidates/10 attempts each; synthetic foreign completion rows do not seed
  inbox/statistics/ranking. Three target attempts use real grading for completion.
- [Business metrics](business-metrics.json):100k/1M attempt scans and independent
  cohort/global backlog samples.1M local inject p95/p99≈899.825/978.318ms.
- [Audit query](audit-query.json), [finite retention](audit-retention.json) and
  [local dump/restore](audit-restore.json):100k natural browse plans; fixed365day
  cleanup and existing local restore regression. These do not prove RDS PITR/RPO/RTO
  or an independent privacy-ledger restore policy.
- [Ranking](ranking.json):100k tied candidates/results/entries,3 SQL/read,
  local inject p95/p99≈332.357/350.602ms. Comparison array is empty in this run.
- [Schema consumers](reporting-schema.json), [compiled TCP fault records](compiled-http.json)
  and [Assessment diagnostic](assessment.json):existing complete-suite regressions,
  not new performance/cost/recovery-time acceptance.

The report table uses the final monitor run and full-suite artifacts for other
routes. Individual populations and run timings differ; do not combine them into
a matched optimization comparison. Nearest-rank p99 is the maximum for20–40
samples. Fastify injection excludes socket/TLS/ALB; paced achieved RPS is not
sustainable capacity. CPU includes the Jest harness and RSS is not allocation/
request. Native plans include disposable synthetic IDs; old audit diagnostics
retain fixture-only keyset bindings for reproduction. No production data is used.

Reproduce from the current source with Node24/locked dependencies, local
PostgreSQL17 fixture55435 and Mailpit11025, actual19 migrations and disposable
administrator. Run root/static/build checks, then integration with fresh evidence
paths. The [setup helper](reproduction-setup.cjs) requires `TEST_DATABASE_ADMIN_URL`
at127.0.0.1:55435 and `REP08_EVIDENCE_DIR` as an absolute directory that **does not
exist**, under an existing writable parent. It clears historical evidence settings
and never writes to this archive. Preflight behavior was checked separately.

```sh
npm run lint
npm run typecheck
npm run build
npm test
node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --config jest.integration.cjs --runInBand \
  --globalSetup "$PWD/docs/evidence/reporting-evaluation-2026-10-12/reproduction-setup.cjs"
```

The setup creates fresh output subdirectories; tests create/drop random fixture
databases and logins. Never use a shared/production database. The full suite also
runs local dump/restore and timeout/crash tests. Cleanup and stop the test containers
with volumes retained; do not stop the separate development database.

Decision: retain current pg/ports/UoW/SQL/indexes; no correctness defect found in
this bounded review. Global metrics, unversioned submissions and large ranking
visibility remain query risks for matched concurrent primary-workload experiments.
No new AWS resource/cache/index/pool size or performance winner is justified here.
Sustainable RPS, concurrency, saturation, headroom, DB CPU/IOPS, allocation/request,
AWS costs/ratios and the performance-cost curve remain unmeasured. REP-04 independent
privacy ledger/deletion/restore and live Web/AWS acceptance remain open.
