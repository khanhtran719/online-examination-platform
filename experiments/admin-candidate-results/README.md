# Admin best/latest local diagnostic

Hypothesis: existing candidate/exam and attempt/result indexes can serve a bounded
exact-version best/latest pair without a new projection, cache, index or source
write. This is a baseline diagnostic, not a matched optimization A/B or capacity
experiment. No AWS resource or price/performance winner is selected.

Configuration: local ARM64/Node24, PostgreSQL17 disposable fixture with all18
unchanged migrations and restricted runtime role, pool max2. The cardinality
fixture contains one frozen version,10,000 synthetic candidates,10 submissions
per candidate and100,000 complete attempt/results with section/question aggregates.
Alternating scores make best and latest different. Deferred result/status/FK
guards remain enabled. Producer inbox/outbox/statistic/leaderboard projections
are not seeded: this is not a100k lifecycle or jobs-throughput run. Separate tests
exercise actual grader/recovery/replay and maintenance authority.

Traffic: first20, maximum100 and continuation after candidate5,000. Each exact
production query has5 warmups,40 sequential samples and natural
EXPLAIN (ANALYZE, BUFFERS) JSON after ANALYZE. No index is forced or added. Maximum
HTTP page has5 warmups/30 samples paced110ms through real Identity, admission,
transaction and audit. Pace is outside latency and inside achieved RPS. Tests
assert8 SQL calls and payload under128KiB. Actual compiled API/TCP composition is
checked separately; inject latencies exclude TCP/TLS/ALB.

Raw samples, final percentiles, SQL/source hashes and failure history are in
[evidence](../../docs/evidence/admin-candidate-results-2026-10-10/README.md).
Plans use existing attempts_history/attempts_limit and result identity indexes.
Scanned work depends on population/distribution and candidates' other exams;
this single-version fixture does not establish performance under those skews.
Measure concurrent reports alongside grading/purge and pool utilization later.

CPU includes the combined Jest harness; RSS is not allocation/request. DB CPU/
IOPS/utilization, sustainable RPS, concurrent capacity, saturation/headroom,
jobs throughput, AWS resources/cost per hour/cost1M requests and cost-curve choice
remain unmeasured/null. Short zero-error samples do not establish a production
error-rate SLO. Full measurement requirements are in the
[performance protocol](../../docs/performance.md).

Decision: keep existing indexes and no cache for local feature delivery. No
optimization improvement is asserted without a matched comparison. Larger or
skewed datasets, managed failover/restore, sustained load and complete cost
attribution are required before selecting production capacity or resources.
