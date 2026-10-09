# ATT-07 local measurement

Generated from append-only raw JSON. A baseline is only a separately captured run with matching dataset/configuration; the raw file does not invent one.
Acceptance lag ends at post-lock acceptance. Commit-ack-observed lag ends after successful COMMIT acknowledgement, calibrated to DB UTC with uncertainty/drift recorded in raw files. Both include seeded overdue age; neither measures SQS dispatch or results.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Acceptance p50/p95/p99 ms | Commit ACK observed p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-10-08T14:48:18.348Z | deadline index range | natural EXPLAIN | 0 |  |  |  |  | 12 plans / 100000 future rows | unmeasured |
| 2026-10-08T14:49:50.513Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 13837.6 | 144.53 | 38455.0 / 58278.0 / 60262.0 | 38458.0 / 58281.0 / 60264.0 |
| 2026-10-08T14:49:20.275Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 13950.3 | 143.37 | 38688.0 / 58317.0 / 60272.0 | 38691.5 / 58320.5 / 60274.5 |
| 2026-10-08T14:49:36.217Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 15537.3 | 128.72 | 39946.0 / 58181.0 / 60244.0 | 39948.5 / 58183.5 / 60245.5 |
| 2026-10-08T14:49:05.888Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 943.5 | 211.97 | 27497.0 / 57113.0 / 60070.0 | 27500.0 / 57115.0 / 60076.0 |
| 2026-10-08T14:50:05.343Z | worker-burst2000-batch50-pool2 | compiled worker | 2000 | 2000 |  | 13805.3 |  | drained true; duplicates false; SIGTERM 0 | unmeasured |

Natural and forced claim plans are retained separately in each raw file; use natural EXPLAIN ANALYZE and its Index Cond/rows/blocks to assess access. Manual HTTP counts are statement counts, not scheduler throughput.
Historical v1 deadlineToCommitLagMs was acceptance lag; its raw bytes remain unchanged and cannot establish durable commit latency.
