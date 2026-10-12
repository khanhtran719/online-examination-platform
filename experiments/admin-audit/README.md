# Audit browse and bounded retention local baseline

Hypothesis: existing audit_retention(time,id) can serve bounded first/deep primary
browse and oldest-first age purge without another index or permanent service.
[Raw evidence and results](../../docs/evidence/admin-audit-2026-10-10/README.md),
[ADR-015](../../docs/adr/015-audit-browse-and-fixed-retention.md).

Disposable PostgreSQL17, Node24 ARM64, restricted API pool2 and maintenance pool1.
Synthetic100k audit rows, page100+lookahead, first/deep keyset at the10000th oldest
row. Natural exact-query EXPLAIN ANALYZE BUFFERS,3 warmups/20 sequential query samples,
3 warmups/20 paced local Fastify inject calls per stage. No forced index or OFFSET.
Report raw p50/p95/p99/payload/SQL/transaction/pool/harness CPU/RSS; DB CPU/IOPS,
allocation/request, saturation and AWS cost remain null. CPU/RSS include the test
process and driver, not isolated task/request allocation. Deep cursor means90k rows
precede its tuple; no90k-row OFFSET is used. Plans are diagnostic snapshots and not
an asserted planner contract across data distributions or prepared generic plans.

Separate36000 eligible-row cohort measures500/1000-row batches,3 warmups/20 samples,
sequential max1 connection. Includes BEGIN/function/COMMIT and one safe count audit.
Populations are measured in succession, not randomized matched experiments; do not
claim1000 is better or default500 optimal. Lock overlap, fault rollback, no-op,
cutoff/young/nonfinite protection, SIGTERM and real dump/restore are correctness
experiments, not throughput/cost benchmarks.

No AWS resources, cost/hour, cost/1M requests, sustainable RPS, optimal pool,
Performance–Cost curve or production SLO result was measured. Retain existing index
and default500 pending sustained mixed-load/storage/cadence evidence. No before/after
architecture optimization claim. See the runbook for replay/restore limitations.
