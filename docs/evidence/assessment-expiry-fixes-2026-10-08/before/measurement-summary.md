# ATT-07 local measurement

Generated from append-only raw JSON. Scheduler throughput has no before value.
Deadline-to-commit lag includes the seeded overdue age, up to 60 seconds before the sweep starts. It is not SQS dispatch or result latency.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Lag p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-10-08T14:07:58.426Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 15748.3 | 127.00 | 39847.0 / 58602.0 / 60299.0 |
| 2026-10-08T14:07:25.912Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 17684.5 | 113.09 | 39979.0 / 58471.0 / 60331.0 |
| 2026-10-08T14:07:42.198Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 15821.6 | 126.41 | 39730.0 / 58453.0 / 60286.0 |
| 2026-10-08T14:07:07.706Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 2097.3 | 95.36 | 28169.0 / 57126.0 / 60068.0 |

The unconstrained claim plan at this sample size is a sequential scan. `attempts_deadline` appears when sequential scan is disabled. Manual HTTP query counts are statement counts, not scheduler throughput.
