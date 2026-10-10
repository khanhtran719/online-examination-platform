# REP-02 evidence — 2026-10-10

Status: COMPLETE locally. Production NOT ACCEPTED.
[Closure](../../admin-submissions-2026-10-10.md),
[runbook](../../runbooks/admin-submissions.md),
[experiment](../../../experiments/admin-submissions/README.md).

Fail-first Application/cursor run found missing SubmissionsService and
SubmissionsCrypto before implementation (two RED suites). Initial PG attempt
was blocked by sandbox loopback EPERM, then rerun with permitted local access.
Initial fixture omitted its audit helper and violated the retention-age constraint;
fixture defects were corrected without relaxing constraints.21 PG/HTTP cases
subsequently passed.33 new unit cases pass in the final root run.

Final root:314 API/39 suites,42 tooling and96 Web =452 PASS. Full integration:
320 cases/19 suites,0 skipped PASS,174.323s; includes21 new restricted-PG/HTTP
cases, extended diagnostic and actual compiled API/TCP composition for both new
endpoints. Lint/typecheck/build/quality/contracts46 operations/425 examples PASS.
`integration-completion.log` records the final completion output, not the entire
stdout stream; expected fault-injection exceptions contain opaque correlation IDs.
`validation.json` records exact checks, population counts and limitations.

Final extended raw run:
[diagnostic-3a86dd3e-2e2f-4958-91a6-34a4814b47ee.json](diagnostic/diagnostic-3a86dd3e-2e2f-4958-91a6-34a4814b47ee.json).
100k attempts/20 exams, real constrained/restricted primary projections. Raw samples,
natural plans and bounded query/payload/CPU/RSS observations are included. The
first development JSON is retained separately; it lacks later version/detail/raw
extensions and is not a matched comparison baseline. No index A/B was performed.
`assessment-regression/` holds this increment's broader diagnostic output; no
historical artifact was overwritten.

| Local measured population | p50 ms | p95 ms | p99 ms | Achieved RPS | SQL calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| List query, first,40 samples | 16.327 | 18.175 | 19.454 | 59.946 | 1 |
| List query, continuation after51,40 samples | 16.833 | 18.391 | 21.170 | 58.382 | 1 |
| Version-filtered list query,40 samples | 1.329 | 2.565 | 4.283 | 634.678 | 1 |
| Auth-inclusive list inject,30 paced samples | 45.267 | 52.515 | 52.710 | 6.605 | 8 |
| Auth-inclusive score inject,30 paced samples | 26.048 | 40.505 | 41.744 | 7.164 | 8 |

Version filter uses existing attempts_admin. All-version first/continuation perform
scan/join/sort work, a candidate for future concurrent/skew experiments. List page20
is5910bytes/page10027575bytes; score521bytes on1 frozen section/question. Query RPS
is short sequential throughput, not sustainable capacity.110ms pacing is outside
latency and inside HTTP RPS windows. Combined harness CPU/list9.440ms/detail9.650ms
per request includes Jest; RSS is not allocation/request. No TCP/TLS/ALB in inject
latency. DB CPU/IOPS/utilization/headroom, allocation, concurrency/saturation, jobs,
AWS cost/hour/month/cost1M and cost-curve selection are unmeasured/null. No claim
of an optimization winner or production SLO.

472 prior files match `protected-before-sha256.json`;18 source/built migration
hashes match in validation.json.33 runtime/test/contract source hashes are captured
in `source-sha256.json`. No new migration/index/grant/key/package/AWS resource.
Own databases, extra LOGIN roles, other DB clients and temporary key directories
are0 after the complete run. Test PostgreSQL/Mailpit containers stopped, volumes
retained; long-lived development55432 untouched.

No fresh browser HTTPS run is claimed; Identity/Web behavior is unchanged and
compiled API/TCP tests verify composition here. Prior REP-01 HTTPS evidence remains
historical. Web integration, Admin keys/review, REP-03/remaining REP-04/audit retention
and AWS load/failure/restore/capacity/cost acceptance remain separate open gates.
