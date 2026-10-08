# ATT-07 local measurement

Generated from append-only raw JSON. Scheduler throughput has no before value.
Deadline-to-commit lag includes the seeded overdue age, up to 60 seconds before the sweep starts. It is not SQS dispatch or result latency.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Lag p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-10-08T04:10:42.082Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 13239.0 | 151.07 | 38197.0 / 58388.0 / 60339.0 |
| 2026-10-08T04:10:13.612Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 14809.3 | 135.05 | 39301.0 / 58596.0 / 60326.0 |
| 2026-10-08T04:10:28.318Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 14174.5 | 141.10 | 39178.0 / 58554.0 / 60283.0 |
| 2026-10-08T04:09:58.231Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 1648.7 | 121.30 | 27913.0 / 57116.0 / 60061.0 |
| 2026-10-08T04:10:53.914Z | worker-burst2000-batch50-pool2 | compiled worker | 2000 | 1440 |  | 10766.6 |  | drained false; duplicates false; SIGTERM 0 |
| 2026-10-08T04:12:39.457Z | worker-burst2000-batch50-pool2 | compiled worker | 2000 | 2000 |  | 11784.3 |  | drained true; duplicates false; SIGTERM 0 |

The unconstrained claim plan at this sample size is a sequential scan. `attempts_deadline` appears when sequential scan is disabled. Manual HTTP query counts are statement counts, not scheduler throughput.
