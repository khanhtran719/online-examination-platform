# Local grading diagnostic

Hypothesis: bounded exact-match compute (≤500 questions,≤10 options) is small enough
to keep within one grading transaction; adding leased compute/fencing has no
demonstrated benefit at this stage. This is a provisional architecture assessment,
not a comparative leased-worker benchmark or a production capacity acceptance.

Configuration: Node24 ARM64 on Apple M1 Pro; disposable PG17-alpine on local Docker;
dedicated grading DB role; pool2; stable SQL projection locking; no Redis/ORM/new AWS
resource. Traffic: pure100/500-question fully selected multiple choice,300 warmups
and2,000 samples;10 sequential synthetic3-question PG jobs; one500-question/
5,000-selection persistence check. Local SQS SDK HTTP fixtures validate transport
semantics and do not measure managed SQS latency or cost.

| Measurement | Observed local result | Interpretation |
| --- | --- | --- |
| Pure100-question p50/p95/p99 |0.239/0.297/0.349ms|compute only|
| Pure500-question p50/p95/p99 |1.263/1.448/1.694ms|compute only|
| CPU/grade100/500 |≈251/1,298µs|whole diagnostic process delta/sample|
|3-question10-job elapsed, two runs|≈91.7/112.2ms / observed≈109/89jobs/s|short sequential diagnostics, not sustained throughput|
|500-question transaction, two runs|≈151.5/216.7ms|two individual observations, not a percentile|
|500-question attempt-lock call, two runs|≈1.05/1.19ms|uncontended local observations|
| SQL statements/job |15 at3 and500 questions|includes BEGIN/COMMIT, no per-question round trips|
| End-to-end RPS/concurrent users/SQS age |unmeasured|requires workload/generator/telemetry|
| CPU/RSS under sustained load, RDS saturation/IOPS |unmeasured|requires representative contention/load|
| Cost/hour, cost/1M requests, jobs/USD |unmeasured|no deployed/tagged AWS resources or bill|

Result: local correctness checks persist all effects atomically; bounded compute
does not explain most of the observed500-question transaction duration. Decision:
retain transaction-local processing provisionally, continue ASYNC-08/12 with
concurrency/section/question distribution, lock contention, retry/queue-age and
cost curves before selecting production pools/tasks/scaling. Do not infer an
optimal pool, performance improvement over a nonexistent prior grader, or AWS
savings from this diagnostic.

Both full-suite runs are retained. Timing variance is visible; there is no
before/after performance improvement claim for the transaction-boundary fix.

[Raw evidence/source hashes](../../docs/evidence/grading-consumer-2026-10-09/README.md),
[review](../../docs/grading-consumer-2026-10-09.md),
[worker operations](../../docs/runbooks/grading-worker.md).
