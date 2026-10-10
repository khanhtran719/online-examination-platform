# REP-04 Admin best/latest subset evidence — 2026-10-10

Status: BL-01–06 COMPLETE locally. REP-04 remains SUBSET; production NOT ACCEPTED. [Plan](../../admin-candidate-results-2026-10-10.md),
[runbook](../../runbooks/admin-candidate-results.md),
[experiment](../../../experiments/admin-candidate-results/README.md).

Fail-first Domain/Application/cursor runs had three RED missing-implementation
suites.35 new units subsequently passed. Initial PG run passed12/failed3: fixture
omitted revision, named a nonexistent retention function and tried to commit
COMPLETED without a result. Fixes supplied revision, used the actual existing
purge_retained_attempt RPC and asserted the database completion guard instead of
bypassing it. No constraint/runtime recovery/grant was relaxed.15 cases then
passed; adding cardinality diagnostic yielded16 PASS. Two current-access/lock
regressions bring the new suite to18 cases. The stricter new OpenAPI nullable
branch initially failed AJV compilation; adding the required integer type fixed
the schema without weakening pending-null/completed-score semantics.

Root521 PASS (383 API/45 suites,42 tooling,96 Web); lint/typecheck/build/quality/
contracts47 operations/435 examples pass. Final complete integration361/361 in21
suites,0 skipped,220.971s. New coverage is35 unit and18 PG/HTTP cases, plus one
Identity test-harness retry regression and authorized/denied candidate-results
checks in actual compiled API/TCP composition. No browser HTTPS rerun is claimed.
`integration-completion.log` preserves final stdout, including expected opaque
fault-injection correlation IDs. No fault stack/payload/credential is emitted.

The first full run passed359/failed1 in the existing Identity SMTP capture test;
see `first-integration-failure.log`. The unchanged Identity and compiled HTTP
suites passed49/49 in `smtp-unchanged-reproduction.log`; the original provider/
capture absence cause remains unconfirmed. Deterministic first-send failure then
reproduced a separate harness defect: it stopped on runOnce=false while the job
awaited durable backoff (`smtp-retry-red.log`,1 failed/22 deliberately deselected).
The helper now polls within a six-second window, closes the SMTP fixture in
finally and checks retry then acceptance plus durable delivered_at/attempt count.
The corrected focused Identity suite passed23/23 (`smtp-retry-green.log`) and all
23 pass in the final complete run. Production worker/transport/retry/lease policy
is unchanged. This is test-harness evidence, not a production SMTP reliability fix.

Final-full raw diagnostic:
[diagnostic-a30daaf4-8a58-4d4d-971f-950e89119a3f.json](diagnostic/diagnostic-a30daaf4-8a58-4d4d-971f-950e89119a3f.json).
Earlier35cf5d82 and2fa8d0b2 runs remain development/first-regression artifacts.
Post-format diagnostics are a separate verification run, never an optimization
baseline or a replacement for the full-run population. `assessment-regression/`
contains fresh broader diagnostic artifacts without overwriting archived evidence.

| Local population | p50 ms | p95 ms | p99 ms | Achieved RPS | SQL calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| First20 query,40 sequential samples | 3.176 | 3.508 | 6.522 | 306.755 | 1 |
| Maximum100 query,40 sequential samples | 8.054 | 8.644 | 12.565 | 122.920 | 1 |
| Continuation after5,000,40 sequential samples | 8.012 | 8.444 | 8.506 | 126.588 | 1 |
| Maximum100 HTTP inject,30 paced samples | 39.170 | 46.380 | 50.591 | 6.815 | 8 |

Fixture: one frozen version,10,000 synthetic candidates and100,000 complete
attempts/results with100k section/question aggregate rows,10 attempts/candidate.
All18 migrations, deferred completion/result/FK guards and restricted runtime
permissions remain enabled. Producer inbox/outbox/statistic/leaderboard effects
are not bulk-seeded: this is cardinality evidence, not100k actual grading jobs.
Separate cases exercise real grader/duplicates/recovery/replay/retention and
concurrent committed visibility. Natural plans use existing attempts_history,
attempts_limit and result identity indexes; candidate limit precedes two lateral
selections. Grouping still scans eligible version attempts and skew/other-exam
population remains unmeasured. No forced index, new index/cache/resource or matched
optimization winner is claimed.

Maximum response44,604bytes is below128KiB. HTTP includes real current Identity,
admission, primary restricted PostgreSQL, transaction and mandatory version audit;
inject excludes TCP/TLS/ALB.110ms pace is outside latency and inside achieved RPS.
Transaction p95/p99≈29.443/31.769ms, acquisition p95/p99≈0.137/0.254ms. Combined
harness CPU≈15.454ms/request includes Jest; process RSS≈482MB is not allocation/
request. Short30-sample zero-error windows do not establish an error-rate SLO.
DB CPU/IOPS/utilization, allocation, saturation/headroom, sustainable RPS/concurrent
users/jobs, AWS cost per hour/1M requests and cost-curve selection remain null.
Percentile variance across runs is preserved. No AWS deployment/cost/SLO accepted.

All493 prior migration/evidence files match `protected-before-sha256.json`; all18
source/built migration hashes match `validation.json`. Reporting/test/contract
hashes cover56 files in `source-sha256.json` at the full/post-format checkpoint;
current hashes are in `source-final-sha256.json` with `final-verification.json`. Final format-only test SQL
preserves51 query-literal token sequences and adjacent bindings/statement order;
post-format focused PG suite passes18/18 in32.443s (`post-format-validation.json`
and `post-format-integration.log`). No SQL improvement is claimed from formatting.
Other databases, extra LOGIN roles, other client connections and temporary key
directories are0. Test PostgreSQL55435 and both Mailpit containers are stopped with
volumes retained; development PostgreSQL55432 was untouched. No new migration,
index, grant, key, package, event or AWS resource. Independent privacy ledger/deletion/restore, audit browsing/
retention, Web integration and AWS gates remain open; roadmap84/216 checked,132
pending. REP-04 remains unchecked and SUBSET.


Final SQL comma-spacing correction changes only the new integration fixture, not
runtime SQL or its diagnostic hash. The51 literal token sequences, bindings and
statement order remain identical. The affected permission/audit regression passed
1/1 in2.548s with17 deliberately deselected cases; this does not replace the full
361/361 run with0 skips or the18/18 post-format suite. Its first extra run failed
ECONNREFUSED because the fixture had already been stopped; that sequencing error
is retained in `sql-spacing-fixture-stopped.log`, followed by the passing ready
run in `sql-spacing-completion.log`. Final cleanup was checked again as0 before
stopping PostgreSQL55435. Both Mailpit fixtures remain stopped; volumes retained.
