# REP-02 primary report diagnostic

Hypothesis: the existing pg projection and indexes can serve a bounded Admin
attempt page and completed score detail with one reporting statement each and8
auth-inclusive SQL calls, without a new cache/resource. This is a local diagnostic,
not a sustainable capacity, SLO or performance/cost comparison.

Environment/configuration: local Docker PostgreSQL17 on isolated55435, all18
migrations, real constraints/deferred guards and restricted runtime pool2. Real
verified Admin session/admission/current revalidation/audit. No AWS resources or
region/cost selection; no runtime index, cache, secret or dependency is added.
100,000 synthetic users/attempts across20 exams,2,000 IN_PROGRESS/98,000 FAILED,
one frozen section/question per version. Small1000-row fixture commits and natural
ANALYZE. This is not the required production500k-question/millions-answer dataset.

Traffic: same exact parameterized list SQL, first page, continuation after51 rows
and one version-filtered page;5 warmups/40 sequential reads per case,21-row
lookahead. Restricted-role natural EXPLAIN ANALYZE/BUFFERS JSON, no planner hint.
No index A/B experiment or claimed optimization. HTTP list uses Fastify inject
with5 warmups/30 samples; detail30 samples on one completed one-question result.
110ms admission pacing is excluded from latency, included in achieved RPS window.
Compiled TCP separately tests actual composition. No TLS/ALB/network measurement
is inferred from inject timing.

Raw records include latency samples, p50/p95/p99, RPS/window, payloads, query counts,
process CPU/request, RSS and list transaction/acquisition samples. CPU is combined
Jest/harness CPU, RSS is not allocation/request. DB CPU/IOPS/utilization, allocation,
concurrency/saturation, jobs, AWS cost/hour/month/cost1M/headroom remain null or
unmeasured. Error rate refers only to successful measured populations; injected
failure tests are separate correctness checks, not an availability measurement.

Measured final run: list HTTP p50/p95/p99 45.267/52.515/52.710ms,6.605 paced
RPS; score26.048/40.505/41.744ms,7.164 paced RPS. Both8 SQL/read; list query
first/continuation/version-filtered p95 18.175/18.391/2.565ms. Existing attempts_admin
is used for the version filter; all-version query scans/joins/sorts. CPU/list9.440ms
and detail9.650ms per request are combined harness observations. No cost/hour,
cost1M, DB saturation, utilization or marginal performance/USD result is available.

Decision: retain current schema/resources until required concurrent Admin traffic,
more versions, skew, write overhead and AWS measurements justify an alternative.
Do not label local short sequential throughput as sustainable RPS. Query plans
must be reviewed alongside those workloads before deploying the report at scale.

[Evidence and validation](../../docs/evidence/admin-submissions-2026-10-10/README.md).
Reproduce: build, start disposable PostgreSQL, provide its55435
TEST_DATABASE_ADMIN_URL and optional ADMIN_SUBMISSIONS_EVIDENCE_DIR pointing to a
**new** output directory, then run:

```sh
npm run test:integration -- --runTestsByPath apps/api/tests/integration/admin-submissions.spec.ts
```

Own database/logins are dropped; shared development55432 is untouched. Never point
any output environment override at historical accepted evidence.
