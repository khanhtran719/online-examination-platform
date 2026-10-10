# REP-05 evidence — 2026-10-10

Status: COMPLETE locally; production NOT ACCEPTED.
[Plan](../../admin-business-metrics-2026-10-10.md),
[ADR](../../adr/014-business-metrics-snapshot.md),
[runbook](../../runbooks/admin-business-metrics.md),
[experiment](../../../experiments/admin-business-metrics/README.md).

Two fail-first missing-implementation suites were RED;36 units then passed.
An additional requested-window mismatch check was RED because the adapter could
return a different valid cohort. Application now verifies exact explicit bounds.
Review reproduced a year-zero mismatch: JavaScript accepts0000 but PostgreSQL
timestamps do not. The additional RED test now passes; canonical UTC windows
accept years0001–9999 and invalid year0000 returns400 before SQL. All38 new units
PASS in the559-case root run (421 API/47 suites,42 tooling,96 Web).

Initial real PG suite passed15/failed1: its fixture asserted submittedAt in
event.payload although the stable contract stores accepted time in occurredAt.
Correcting the fixture field changes no runtime event/policy. Expanded17 PG cases
passed before the extra year-zero request case; the final suite now contains18.
First full run passed377/failed1 across22 suites/378 cases in339.582s. An existing
SQS publisher happy-path local HTTP test returned QUEUE_UNAVAILABLE; its original
cause is unconfirmed. The focused7-case reproduction attempt passed, but source
loading overlapped the fixture edit and cannot prove an unchanged-source rerun.

The SQS test fixture now gives happy-path SDK initialization1000ms. The dedicated
slow-send test recreates the adapter with100ms, still asserting return<400ms and
one SDK attempt against a500ms delayed server. Exact payload/ACK/MD5/queue failure
checks remain. No production SQS adapter, retry or timeout configuration changed.
Raw failures, RED tests and final-root logs are retained here; none are erased by
the later pass. Final full integration and post-format PG recheck passed; fixture cleanup is zero. Containers stopped with volumes retained.

## Architecture and correctness review

Reporting owns the additive route/DTO/private query/service. Domain validates
canonical time, exact integer count bounds, subsets and empty-backlog nulls;
Application revalidates the locked current Identity capability, checks actor and
explicit projection bounds, projects and audits in the same UnitOfWork. Presentation
authenticates/authorizes/admits before mapping. There are no Nest/driver/SDK imports
in business layers, private source repositories, Assessment writes or new exports.
One primary statement snapshot supplies the cohort and global backlog; audit or
commit failure returns no report. No result hydration, N+1 or external network call.

Tests cover half-open cohorts, CREATED/future exclusion, disabled/opt-out/archive
population, terminal failure/replay generation, actual duplicate grading, payload
purge preserving completed identities, committed visibility during a blocked
grader, malformed/year-zero/future windows, current permission revocation, audit
outage and bounded actor-lock recovery. The compiled AppModule/TCP fixture tests
the actual route, no-store/envelope,401/403 and year-zero400.

No migration, index, grants, cache, key, package, resource or event change. The
combined HTTP/SQS metrics specification and Web parser remain unchanged; providers
are still missing. This business backlog is not a SQS queue-depth measurement.

## Measurement protocol and limits

Local Node24 ARM64/PostgreSQL17,18 migrations, restricted API pool max2. Each
population has10 attempts per synthetic candidate:9 SUBMITTED,1 IN_PROGRESS,
source FK/status/submission guards enabled, one frozen version. Supporting fixture
users are additional. No bulk answers/inbox/outbox/results/statistics/ranking writes;
1M rows are not1M actual scoring jobs. Real lifecycle behavior is tested separately.

After ANALYZE,3 warmups and20 sequential exact production queries, record natural
EXPLAIN (ANALYZE, BUFFERS) JSON. HTTP uses3 warmups/20 samples paced110ms; Identity,
admission,current permission, UoW and audit included,8 SQL calls, payload<4KiB.
Pace is outside latency but inside achieved RPS. Inject excludes TCP/TLS/ALB.
Harness CPU includes Jest/application work; RSS is a point observation, not bytes
allocated/request, steady utilization or PostgreSQL memory. Pool acquisition has60
samples, request/query/transaction each20. These populations are not interchangeable.

The first focused raw run is [bc08a609](diagnostic/diagnostic-bc08a609-80be-4a2f-a723-bbcd5c685107.json):
query p95/p99 at100k≈59.640/59.740ms and1M≈603.858/636.575ms; HTTP p95/p99
≈90.631/98.688ms and623.633/656.212ms. Subsequent independent samples are retained;
variance is not an optimization because no runtime query/config change was tested.

Natural plans use an attempts sequential scan. A7day semantic cohort does not bound
physical I/O because the global backlog and compact history still require work.
The primary aggregate is O(N) with constant-size count state. Actor/current-access
locks persist through the query/audit transaction, so report load can delay other
operations; a low page query count and tiny payload do not remove that concern.

DB CPU/IOPS/utilization, allocation/request, saturation, optimal pool, sustainable
RPS/concurrent capacity/headroom, worker throughput, AWS cost/hour/unit costs and
Performance–Cost Curve remain unmeasured/null. No production SLO acceptance,
capacity, saving, improved index or performance/cost winner is asserted.

Decision: retain the existing-index baseline for the named local feature. Manual
refresh or>=30s+jitter/pause hidden is operator guidance, not a new server-enforced
interval. Before production polling, measure skewed/longer history and reports
mixed with autosave/submit/grading, including actor locks, primary I/O and failures;
compare any proposed counters/index/cache at equal traffic and full cost. Web,
technical providers, independent privacy ledger/deletion/restore, audit lifecycle,
export and AWS acceptance stay open.

## Final full-run measurements

[Raw full-regression run](diagnostic/diagnostic-90744966-806b-4096-8a88-153aa7c28ebe.json) generated in the313.296s
379-case/22-suite full pass. All twenty samples in each request/query population
succeeded; this is no sustained error-rate estimate. Values below are milliseconds
unless stated; RPS is sequential achieved throughput, not maximum capacity.

| Attempts  | Query p50 / p95 / p99       | Query RPS | Inject HTTP p50 / p95 / p99 | Paced HTTP RPS | Max bytes |
| --------- | --------------------------- | --------- | --------------------------- | -------------- | --------- |
| 100,000   | 56.428 / 57.659 / 58.551    | 17.745    | 78.707 / 85.462 / 85.919    | 5.413          | 507       |
| 1,000,000 | 537.923 / 544.616 / 544.729 | 1.854     | 559.527 / 571.073 / 572.928 | 1.502          | 511       |

| Attempts  | Transaction p95 / p99 | Acquire p95 / p99 (60 samples) | Harness CPU/query / request ms | Observed RSS bytes |
| --------- | --------------------- | ------------------------------ | ------------------------------ | ------------------ |
| 100,000   | 74.824 / 75.193       | 0.126 / 0.229                  | 1.115 / 10.598                 | 429473792          |
| 1,000,000 | 562.934 / 564.518     | 0.140 / 0.161                  | 2.148 / 11.011                 | 109182976          |

At1M rows the transaction p99≈564.518ms holds
current-access locks through the scan and audit. That is material to mixed-load
capacity and remains a follow-up, even though the20 sequential requests passed.
SQL/source hashes and plans are in the raw artifacts and preservation snapshots.

## Validation progression

- Root559 cases (421 API/47 suites,42 tooling,96 Web) PASS.
- Full restricted-PG/SMTP/SDK-local-HTTP/TCP regression379 cases/22 suites,0 skipped
  PASS in313.296s, including18 new business-metrics PG/HTTP cases.
- Lint/typecheck/build/quality/contracts48 operations/445 examples PASS before
  whitespace-only SQL predicate normalization.
- Predicate normalization preserves435 SQL tokens and adjacent bindings/adapter
  code; [comparison](sql-spacing-review.json) records both SQL texts/hashes.
  Build after formatting and18 focused PG cases PASS in99.838s; cleanup zero.
- 18 source/build migrations match,521 prior migration/evidence files unchanged.
  [Preservation](preservation.json), [prior hashes](protected-before-sha256.json),
  [full-run source hashes](source-full-run-sha256.json). Final source snapshot
  includes all Reporting source, the business/TCP/SQS fixture and OpenAPI.
- No browser HTTPS rerun, image/deploy/live AWS acceptance or production sizing.

Independent [post-format raw](diagnostic/diagnostic-0512b881-e868-49df-afc5-30c6bbab0117.json):
query p95/p99≈58.334/60.489ms at100k and591.200/608.454ms at1M; HTTP
p95/p99≈91.039/241.397ms and645.738/682.557ms. The100k tail outlier is retained,
not removed. Same semantics/435 tokens, different whitespace SQL hash; small
sequential sample variability is no before/after optimization result.

[Validation](validation.json), [final source hashes](source-final-sha256.json),
[cleanup counts](fixture-cleanup.json), [final verification](final-verification.json)
record local closure. Fixture containers stopped with volumes retained;55432
development DB untouched. Local branch codex/rep05-business-metrics preserves
prior changes; no commit/PR/deploy. Roadmap85/216 checked,131 pending; REP-05 only
newly checked. REP-04 privacy ledger/deletion/restore, REP-06–08, Web and AWS remain
open. No other implementation is running.
