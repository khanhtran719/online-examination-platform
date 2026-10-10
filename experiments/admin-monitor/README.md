# REP-01 active monitor query index experiment

Hypothesis: an exam/start/ID partial index materially improves primary Admin
monitor latency over existing attempt indexes and justifies write/storage/operations
overhead. No hypothesis of AWS savings without AWS measurements.

Environment: local PostgreSQL17 Docker on isolated55435; real migrations/grants,
restricted runtime pool2, real verified Admin session/permissions/rate controls.
100,000 synthetic users/attempts,20 exams,98,000 FAILED/2,000 IN_PROGRESS (100 live
per exam); one complete frozen question per exam. Small1000-row transactions,
deferred guards and constraints enabled. This is a scoped query fixture, not the
required500k-question/millions-of-answer production dataset.

A/B/A: natural current plan; create disposable partial index
`(exam_id, started_at DESC, id DESC) WHERE status='IN_PROGRESS' AND purged_at IS NULL`;
drop trial index. Same exact adapter SQL and dataset, first page and continuation
after51 rows,21-row lookahead,5 warmups/40 sequential queries each. Natural EXPLAIN
ANALYZE/BUFFERS JSON using restricted credentials; no planner hint/seqscan disabling.
HTTP population separately uses Fastify inject + actual Identity/primary SQL,
5 warmups/30 measured requests,110ms admission pacing (outside latency population,
inside achieved RPS window). It includes no TCP/TLS/ALB latency. Compiled TCP route
regressions verify wiring separately.

Initial sample query p95 (ms), first/deep: existing2.048/2.233; trial1.967/2.184;
after removal2.152/1.992. Trial p99 first/deep2.213/4.661, existing2.160/2.435.
Natural planner selected `one_active_attempt` before and the trial index while
present. HTTP p50/p95/p99≈27.518/33.430/33.441ms, page20=4626bytes,8 SQL calls;
transaction p95≈16.574ms, acquire p95≈0.108ms. Subsequent full-regression diagnostic
is another raw sample, not a matched improvement claim or suppressed variance.

Decision: **retain existing schema/indexes**. Tail differences in this small warm
sample do not establish meaningful performance/cost benefit or an unmet SLO;
trial index is removed. Write/storage impact was not benchmarked, so no cost saved
is claimed. Revisit with active skew, more versions, concurrent Admin polling,
mass-start/save/submit and long-lived DB statistics.

[Raw files and checks](../../docs/evidence/admin-monitor-2026-10-10/README.md).
Query RPS is short sequential throughput, not sustainable capacity. Query/HTTP CPU
is the combined Jest/harness process, not isolated container CPU; RSS is process
RSS, not allocation/request. DB CPU/IOPS/utilization/headroom, allocation, AWS
resources/cost/hour/cost1M/worker effects and capacity remain unmeasured/null.
No AWS resource or migration was accepted. Production remains NOT ACCEPTED.

Reproduce: build, start `infra/identity-https/compose.yaml` PostgreSQL fixture,
provide TEST_DATABASE_ADMIN_URL for that55435 administrator and optional
ADMIN_MONITOR_EVIDENCE_DIR pointing to a **new** directory, then run
`npm run test:integration -- --runTestsByPath apps/api/tests/integration/admin-monitor.spec.ts`.
The test creates/drops only its own database/logins/index and never migrates55432.
Never point output overrides at archived evidence.
