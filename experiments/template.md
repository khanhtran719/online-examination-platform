# Experiment: <ID and title>

Status: PLANNED | RUNNING | MEASURED | INCONCLUSIVE. A template is not a completed experiment.

- Hypothesis and decision to resolve:
- Hard gates: correctness/security/durability/SLO/reliability/capacity:
- Configuration A/B and only changed variables:
- Date/region/AZs/account environment; operator/isolated blast radius:
- Commit/image digest/runtime architecture/schema version:
- Dataset seed/counts/distribution/storage and known result oracle:
- AWS resources/sizing/min-max/Spot/endpoints/network/telemetry policies:
- Traffic: scenario/arrival rate/VUs/duration/payload/save/poll/retry pattern:
- Warmup/repetition/soak/load generator capacity:
- Preconditions, rollback, stop conditions and maximum experiment spend:
- Raw artifacts and provenance links:

| Observation | A | B | Source |
| --- | --- | --- | --- |
| Offered/achieved RPS and dropped iterations | unmeasured | unmeasured | |
| p50/p95/p99, samples and errors by route | unmeasured | unmeasured | |
| Candidate concurrency / jobs/sec/task | unmeasured | unmeasured | |
| CPU/request, allocation/GC, RSS/peak memory | unmeasured | unmeasured | |
| Queries/round trips, pool wait, query/lock/transaction latency | unmeasured | unmeasured | |
| RDS CPU/IOPS/connections/WAL/locks | unmeasured | unmeasured | |
| Outbox/SQS age/depth, retries/DLQ/scoring duration | unmeasured | unmeasured | |
| Cache hit/latency/DB reduction if enabled | not applicable | not applicable | |
| Utilization/headroom/saturation/recovery | unmeasured | unmeasured | |
| Full cost/hour; estimate vs billed basis | unmeasured | unmeasured | |
| Cost/1M requests; cost/users/attempts/jobs | unmeasured | unmeasured | |
| All hard gates pass? | unverified | unverified | |

Result, limitations/variance, decision/ADR, next hypothesis and rollback completion:

Do not replace unmeasured cells with assumed wins. Compare using [performance protocol](../docs/performance.md).
