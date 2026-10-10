# Public leaderboard SQL experiment —2026-10-09

Hypothesis: applying page LIMIT before window ranking/formatting reduces sort and
CPU work, while a conditional same-snapshot prefix count preserves exact live
sequential ranks after privacy changes. Do not enlarge RDS or add Redis to solve
an unmeasured problem. [ADR-012](../../docs/adr/012-public-ranking-projection.md)
records the chosen shape and its remaining scan complexity.

Configuration: Node24/darwin/arm64, local PostgreSQL17 Docker, runtime pool2,
statement timeout2s/lock timeout500ms. The raw artifact records actual PostgreSQL
version/work_mem/shared_buffers/max_connections and source hashes.100k synthetic
verified opted-in candidates,100k completed attempts/results/best rows, one enabled
version; all100-point scores/tied submit timestamps. Seed1000 per transaction
with every FK/completion trigger active, ANALYZE before planning. This is a read
projection dataset, not the full production1000-exam/500k-question/million-answer
dataset. No ECS/RDS/Redis/AWS resources, instance price or cost allocation.

Traffic: exact frozen before/after SQL through the same restricted pg connection
pool/database/data/settings. Two warmups per shape/case,40 alternating pairs for
first101 rows and20 pairs after rank50,000. Every pair asserts equal rows. Plans
use EXPLAIN(ANALYZE,BUFFERS,JSON), no planner setting/hint forcing. HTTP diagnostic
is separate:40 successful Fastify-injected default20-row requests, one current
Identity actor,110ms pacing and real rate admission. No socket/TLS or concurrency
load generator; this is neither k6 saturation nor an AWS SLO run.

| Same-fixture SQL case | Shape | p50 ms | p95 ms | p99 ms | Samples |
| --- | --- | ---: | ---: | ---: | ---: |
| First101 | Before |293.499|299.972|305.841|40|
| First101 | After |244.182|248.200|255.571|40|
| After rank50,000 /101 | Before |349.096|355.036|357.019|20|
| After rank50,000 /101 | After |267.695|271.157|276.420|20|

Result: p95 decreases17.26%/23.63% locally; matched rows and permission/privacy/
epoch regressions pass. The original window sort spills to disk; chosen bounded
page sort is in memory. Planner-selected joins still examine large populations.
The live prefix count grows with traversal depth. No new index, hidden total,
OFFSET, per-candidate round trip or normal grading epoch write is introduced.
Choose this query locally; production feasibility and pool choice remain unproven.

Separate HTTP sample: p50≈262.040/p95≈269.468/p99≈270.484ms,3 SQL calls/request
including authentication/admission,3131-byte response. CPU includes harness and
idle; RSS is reported separately and allocation/request is null. DB plan timings
include EXPLAIN overhead and are not HTTP percentiles. Successful sample errors0;
offered/sustainable RPS, concurrent capacity, DB saturation/utilization, worker
throughput, AWS cost/hour/cost1M/Performance–Cost Curve are unmeasured, not zero.

Decision: keep pg/ports and this SQL shape for the delivered read capability.
Follow with varied opt-in/score distributions, deep-page concurrency and the real
2000-candidate k6 lifecycle before selecting AWS compute/pool/cache or claiming
SLO/cost gains. No AWS winner is selected.

[Raw matched comparison](../../docs/evidence/leaderboard-2026-10-09/local-comparison.json),
[frozen before](../../docs/evidence/leaderboard-2026-10-09/ranking-before.txt),
[frozen after](../../docs/evidence/leaderboard-2026-10-09/ranking-after.txt),
[test log](../../docs/evidence/leaderboard-2026-10-09/lb-comparison.log),
[full evidence index](../../docs/evidence/leaderboard-2026-10-09/README.md).
