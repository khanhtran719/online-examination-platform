# ATT-07 local measurement

Generated from append-only raw JSON. A baseline is only a separately captured run with matching dataset/configuration; the raw file does not invent one.
Acceptance lag ends at post-lock acceptance. Commit-ack-observed lag ends after successful COMMIT acknowledgement, calibrated to DB UTC with uncertainty/drift recorded in raw files. Both include seeded overdue age; neither measures SQS dispatch or results.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Acceptance p50/p95/p99 ms | Commit ACK observed p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-10-08T14:44:39.515Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 13228.0 | 151.19 | 38234.0 / 58230.0 / 60266.0 | 38237.0 / 58232.0 / 60268.0 |
| 2026-10-08T14:44:12.519Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 13476.9 | 148.40 | 38040.0 / 58240.0 / 60262.0 | 38042.0 / 58244.0 / 60265.0 |
| 2026-10-08T14:44:25.871Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 12933.0 | 154.64 | 38037.0 / 58303.0 / 60267.0 | 38039.0 / 58306.0 / 60269.0 |
| 2026-10-08T14:43:58.609Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 951.7 | 210.15 | 27533.0 / 57141.0 / 60074.0 | 27535.5 / 57145.5 / 60082.5 |
| 2026-10-08T14:44:52.925Z | worker-burst2000-batch50-pool2 | compiled worker | 2000 | 2000 |  | 12411.1 |  | drained true; duplicates false; SIGTERM 0 | unmeasured |

Natural and forced claim plans are retained separately in each raw file; use natural EXPLAIN ANALYZE and its Index Cond/rows/blocks to assess access. Manual HTTP counts are statement counts, not scheduler throughput.
Historical v1 deadlineToCommitLagMs was acceptance lag; its raw bytes remain unchanged and cannot establish durable commit latency.
