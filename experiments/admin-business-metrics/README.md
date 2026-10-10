# Business metrics full-scan baseline

Hypothesis: one consistent PostgreSQL aggregate can deliver bounded cohort/global
backlog output without a new index, event counter, cache or AWS resource. This is
a local baseline, not a matched optimization or production capacity experiment.

Configuration: Node24 ARM64, local PostgreSQL17 with18 unchanged migrations and
restricted runtime pool max2. Staged100k then1M attempt identities,10k then100k
synthetic candidates,10 attempts/candidate in one frozen version. Nine accepted
SUBMITTED and one IN_PROGRESS per candidate satisfy the unique-active constraint;
source FK/status/submission guards remain enabled. Synthetic credentials, starts/
submissions and IDs are fixture-only. No answers/inbox/outbox/results/projections
are bulk-seeded; this is not a million actual scoring jobs or realistic load run.
Separate cases exercise real grading/duplicates/failure/replay/purge transactions.

Each population receives ANALYZE,3 warmups/20 sequential exact production queries
and natural EXPLAIN (ANALYZE, BUFFERS) JSON. No forced indexes. HTTP uses3 warmups/
20 paced110ms samples with real Identity/admission/current permission/UoW/audit,
8 SQL calls and4KiB budget. Pace is outside latency and inside achieved RPS.
Query timings and HTTP timings are separate populations; inject excludes TCP/TLS/
ALB. Compiled API/TCP composition is checked separately. Current co-located Jest
CPU includes harness work; RSS is not allocation/request or PostgreSQL memory.

Record raw latency/payload/transaction/acquisition, plans, source/SQL hash, achieved
sequential RPS and CPU/RSS. DB CPU/IOPS/utilization, saturation/headroom, concurrent
capacity/sustainable RPS, jobs, AWS cost/hour/cost1M requests and cost curve remain
unmeasured/null. Local zero-error samples don't establish production error/SLOs.

Result and decision: [evidence](../../docs/evidence/admin-business-metrics-2026-10-10/README.md)
records final full/post-format raw samples, failure history and local closure. Retain the existing-index baseline for bounded local
feature delivery. Measure longer/skewed history, pending density and reports mixed
with autosave/submit/grading before accepting poll/admission policy, an index,
materialized counters/cache, RDS size or any performance/cost winner.
