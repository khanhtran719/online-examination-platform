# REP-03 local question-statistics diagnostic

Hypothesis: existing frozen Catalog and Assessment counter indexes can serve a
bounded question/option report without scanning attempt answers, creating a cache
or adding schema overhead. This is a first diagnostic, not an optimization A/B or
capacity experiment. No AWS resource or price/performance winner is accepted.

Configuration: local Node 24 on ARM64, compiled API composition plus separate
Fastify inject timings, disposable PostgreSQL 17 database with all 18 migrations
and the restricted runtime role. Real grading/replay/retention tests are separate
from the synthetic cardinality fixture. The latter contains 20 frozen versions,
500 questions/20 sections/10 options each: 10,000 frozen questions, 100,000 options,
10,000 question counters and 100,000 option counters. Counter magnitudes are
synthetic; the diagnostic does **not** contain one million real exam attempts.

Traffic: first page20, maximum page100 and continuation after question301. Each
exact production query has 5 warmups, 40 sequential samples and natural
EXPLAIN (ANALYZE, BUFFERS) JSON after ANALYZE; no planner setting forces an index.
Maximum-page HTTP has 5 warmups and 30 samples paced by 110ms to respect live read
admission. Pace is excluded from latency and included in achieved HTTP RPS.
Eight SQL calls/request and response under 128 KiB are asserted. Full API/TCP
behavior is checked separately; inject timings exclude TCP, TLS and ALB.

Raw artifacts and final measured percentiles are indexed in
[evidence](../../docs/evidence/admin-question-statistics-2026-10-10/README.md).
CPU observations include the combined Jest harness, and RSS is not allocation per
request. DB CPU/IOPS/utilization, saturation/headroom, sustainable RPS, concurrent
capacity, jobs throughput, AWS resources/cost per hour and cost per million
requests remain unmeasured/null. A short zero-error sample is not a production
error-rate SLO. See the [performance protocol](../../docs/performance.md).

Natural plans restrict frozen questions by version and section, then sort at most
500 candidates. Existing frozen option-order and option-counter primary indexes
serve bounded lateral lookups. PostgreSQL may scan the small version relation or
choose a hash join over the 10,000-row question counter relation for page100.
This plan choice alone does not justify a new index or forced planner setting.
Larger/skewed catalogs and concurrent reports must be tested before extrapolating.

Decision: retain existing schema/indexes and no cache for this increment. The
correctness and bounded-query evidence permits local feature delivery. Future
tuning needs a matched baseline/candidate/repeat under representative load,
including grading/purge contention, pool use and complete cost attribution. AWS
SLO, failover/restore and Performance–Cost Curve acceptance remain open.
