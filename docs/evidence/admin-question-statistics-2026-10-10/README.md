# REP-03 evidence — 2026-10-10

Status: COMPLETE locally. Production NOT ACCEPTED.
[Closure](../../admin-question-statistics-2026-10-10.md),
[runbook](../../runbooks/admin-question-statistics.md),
[experiment](../../../experiments/admin-question-statistics/README.md).

Fail-first Domain/Application/cursor runs found missing implementations (three
RED suites). An additional exact-version audit assertion failed against EXAM
scope and drove EXAM_VERSION/resourceId=versionId. Initial restricted-PG checks
passed17 cases before expanded replay/permission/diagnostic coverage. The expanded
run passed21 and failed1 because its test expected recovery outcome `failed`
instead of the public `terminal` outcome; the fixture assertion was corrected,
without changing production recovery or relaxing database constraints.

The first full run passed341 and failed1 in the existing Identity SMTP capture
test (expected message absent). Mailpit SMTP NOOP/EHLO were subsequently250;
the unchanged Identity suite passed22/22 alone. The cause of the earlier absence
was not confirmed, and it is not claimed as a Reporting fix. A fresh complete
run then passed342/342 in20 suites,0 skipped,213.968s. Final root passed348 API
cases/42 suites,42 tooling and96 Web =486. Lint/typecheck/build/quality/contracts
46 operations/425 examples PASS. New coverage:34 unit cases and22 PG/HTTP cases,
plus authorized/denied question-statistics checks in actual compiled API/TCP
composition. `integration-completion.log` contains the retained final completion
output, not a claim to preserve all earlier stdout. Expected injected exceptions
log only opaque correlation IDs. `validation.json` records exact checks/limits.

Final raw diagnostic:
[diagnostic-23f7fcd3-df32-4944-b2cc-d3c26ec183b3.json](diagnostic/diagnostic-23f7fcd3-df32-4944-b2cc-d3c26ec183b3.json).
The earlier36bdd96c and815c36a9 runs remain historical development/first-regression
artifacts. None is a matched optimization baseline. `assessment-regression/`
contains this increment's broader fresh diagnostics, without overwriting older
accepted evidence. The fixture has20 frozen versions,10k questions/100k options
and10k/100k counter rows, with synthetic counter magnitudes and **no million-real-
attempt claim**. Actual grading, replay and purge are separate correctness tests.

| Local population | p50 ms | p95 ms | p99 ms | Achieved RPS | SQL calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| First20 query,40 sequential samples | 2.976 | 3.782 | 11.130 | 327.748 | 1 |
| Maximum100 query,40 sequential samples | 5.685 | 7.776 | 8.962 | 161.083 | 1 |
| Continuation after301,40 sequential samples | 6.822 | 9.125 | 11.312 | 144.693 | 1 |
| Maximum100/10-option HTTP inject,30 paced samples | 33.194 | 39.297 | 39.854 | 7.101 | 8 |

Maximum response is92,313bytes, below128KiB. Natural plans limit the question page
before bounded option joins; existing section/question/option order and counter
primary indexes remain. Sorting up to500 candidates and the planner's possible
10k question-counter hash/scan are visible in raw plans, not disguised by forced
index settings. No index A/B, cache comparison or optimization win is claimed.
HTTP includes current Identity access/admission/UoW/audit with real restricted PG;
inject timings exclude TCP/TLS/ALB.110ms pace is outside latency and inside HTTP
RPS. Transaction p95/p99≈20.409/20.923ms. Combined harness CPU≈16.691ms/request
includes Jest; RSS is not allocation/request. The30-sample zero-error window is
not a committed error-rate SLO. DB CPU/IOPS/utilization, allocation, saturation/
headroom, sustainable capacity/concurrent users/jobs, AWS cost and cost curve
remain unmeasured/null. Percentile variance across these short runs is preserved.

All481 prior files match `protected-before-sha256.json`; all18 source/built
migration hashes match `validation.json`. Runtime/test/contract hashes are in
`source-sha256.json`. No new migration/index/grant/key/package/AWS resource.
After full validation, other databases, extra LOGIN roles, other client connections
and temporary key directories are0. Test PostgreSQL55435 and both Mailpit fixture
containers are stopped with volumes retained; development PostgreSQL55432 was
untouched. No new browser HTTPS run is claimed; prior REP-01 HTTPS evidence stays
historical. Web/Admin best/latest, independent privacy ledger/deletion/restore,
audit browsing/retention, load/AWS and production gates remain open. REP-03 alone
closes; roadmap84/216 checked,132 pending; REP-04 remains SUBSET.
