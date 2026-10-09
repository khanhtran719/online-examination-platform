# Independent ATT-07 review evidence

2026-10-08. [Review report](../../assessment-expiry-review-2026-10-08.md). ATT-07 reopened, four findings. No runtime fix or production acceptance.

| Artifact | Meaning |
| --- | --- |
| [review-probes.mjs](review-probes.mjs) | Independent executable probes; disposable database/login, same applied migration bundle, restricted expiry role |
| [review-results.json](review-results.json) | Four RED assertions and three PASS controls |
| [query-plans.json](query-plans.json) | Natural EXPLAIN ANALYZE/BUFFERS, three repeats,100.000 future attempts, current versus stable discovery cutoff; no planner hints |
| [probes.log](probes.log) | Probe run exits1 because four intended regression assertions remain RED |
| [root-tests.log](root-tests.log) | Root249 PASS:116 API/37 tooling/96 Web |
| [integration-allowed.log](integration-allowed.log) | PostgreSQL/HTTP/SMTP122 PASS/1 historical diagnostic deselected,7 suites; includes17 expiry cases |
| [integration.log](integration.log) | Initial sandbox EPERM, not a product regression |
| [lint.log](lint.log), [typecheck.log](typecheck.log), [build.log](build.log) | Fresh supported checks, all exit0 |
| [preservation-before.json](preservation-before.json) |200 protected API/source/migration/contract/historical evidence files captured before review |
| [preservation-after.json](preservation-after.json) |200/200 unchanged,11 compiled migrations match source, roadmap69/147/216 |
| [checks.json](checks.json), [final-quality.log](final-quality.log) | PostgreSQL17.11, actual test counts/exit codes, cleanup, harness hash and final document/boundary/contract check |

Reproduction after build: start disposable PostgreSQL17 on loopback55435 with `pg_stat_statements` preloaded; never use the development database on55432. Supply `TEST_DATABASE_ADMIN_URL` for that process and run `node docs/evidence/assessment-expiry-review-2026-10-08/review-probes.mjs`. Its evidence writes use `wx`: use a fresh output directory or explicitly change destination filenames before another run. Do not overwrite this run. The isolated database and login are dropped in `finally`; pre-existing NOLOGIN project group roles are retained.

Post-lock acceptance time is the domain contract. The review's pre-commit witness supplies a lower bound, not an exact commit timestamp. SQL plan timing is local warm-data server execution, not end-to-end RPS/capacity, production p99 or AWS cost. All archived ATT-07 and earlier evidence remains unchanged.
