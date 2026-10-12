# REP-08 — primary Reporting query and correctness evaluation

Status2026-10-12: MEASURED in the named local scope; no AWS performance/cost acceptance.
[Plan/review](../../docs/reporting-evaluation-2026-10-12.md).

Hypothesis: bounded primary Reporting reads preserve exact source scope and
committed freshness, fail closed if access-audit COMMIT fails, and can serve a
small target exam without scanning100k foreign attempts on its scoped paths.
Global metrics/audit intentionally have a different scope. Review current natural
plans before considering any index, cache, projection or database size change.

Configuration: existing Node24/NestJS/pg API, PostgreSQL17 local disposable
container, actual19 migrations, restricted API role, pool2 for measured reads and
production timeout/admission controls. Real graders produce the small target
result/counters/ranking. The foreign100k-attempt/10k-user fixture is synthetic
cardinality with native completion guards; no complete lifecycle or producer
projection load is claimed. Separate fixtures cover100k monitor/submissions,
10k frozen questions/100k options,100k audit/ranking rows, and100k/1M metric attempts.

Traffic: existing sequential warm query diagnostics and paced Fastify injection,
one actor/no TCP/TLS/ALB. Per-route sample counts and raw data remain separate;
offered arrival-rate load,2,000-candidate capacity, worker jobs/sec, saturation,
headroom, recovery SLOs and AWS costs are unmeasured. CPU includes the Jest harness;
RSS is not allocation/request. Small-sample p99 can be the maximum observation.

Hard gates in this local scope: exact exam/version isolation, pending null scores,
current permissions and public visibility, bounded data, one SQL per projection,
8 total per successful Admin read/3 per ranking read, old committed reads during
late grading COMMIT, audit-COMMIT rollback and recovery. Production availability,
latency/load/security/recovery gates require their separate acceptance evidence.

No resource A/B or runtime optimization is adopted. The existing
monitor test's temporary-index A/B/A remains a diagnostic and removes its index;
no applied migration or runtime index is changed. All failure triggers are confined
to disposable databases and removed in finally. Full fixtures drop their databases
and login roles. No AWS service or account is used; experiment spend attribution,
cost/hour, normalized cost, RPS/USD and the performance-cost curve stay unmeasured.

Decision: retain existing runtime/SQL/indexes. Exact scoped paths use existing
indexes in the small target fixture; global metrics scan all attempts, unversioned
submissions scan their synthetic population, and large tied ranking visibility
work needs concurrent-load investigation. These are risks, not a measured production
bottleneck. Business metrics1M local inject p95/p99≈899.825/978.318ms and ranking100k
tied p95/p99≈332.357/350.602ms do not establish production SLO or sustainable capacity.
Both populations are synthetic and independently paced, not the2,000-user lifecycle.

[Fresh evidence/provenance](../../docs/evidence/reporting-evaluation-2026-10-12/README.md),
[raw-linked query review](../../docs/evidence/reporting-evaluation-2026-10-12/query-review.json)
and [closure](../../docs/reporting-evaluation-2026-10-12.md) retain per-route
observations, natural plans, corrected fixture failures and final verification.
644 root/427 integration24 suites and18 final monitor tests pass. Monitor raw-array
capture is the only additional evidence-harness change; no production API source,
query, grant, migration, resource or dependency changes. Fixtures are clean and
test containers stopped with volumes retained. Performance/cost and failure-recovery
production gates remain explicitly unmeasured.
Historical evidence is immutable. A future optimization requires matched workload,
correctness, query/write overhead, concurrent primary traffic, pool/DB telemetry
and total cost evidence under [performance protocol](../../docs/performance.md).
