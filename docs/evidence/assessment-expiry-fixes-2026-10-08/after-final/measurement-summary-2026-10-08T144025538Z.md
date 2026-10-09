# ATT-07 local measurement

Generated from append-only raw JSON. A baseline is only a separately captured run with matching dataset/configuration; the raw file does not invent one.
Acceptance lag ends at post-lock acceptance. Commit-ack-observed lag ends after successful COMMIT acknowledgement, calibrated to DB UTC with uncertainty/drift recorded in raw files. Both include seeded overdue age; neither measures SQS dispatch or results.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Acceptance p50/p95/p99 ms | Commit ACK observed p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-10-08T14:41:08.671Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 12868.3 | 155.42 | 37984.0 / 58188.0 / 60263.0 | 37987.0 / 58191.0 / 60265.0 |
| 2026-10-08T14:40:41.242Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 13715.5 | 145.82 | 38772.0 / 58475.0 / 60325.0 | 38775.5 / 58477.5 / 60327.5 |
| 2026-10-08T14:40:55.360Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 13638.8 | 146.64 | 38564.0 / 58413.0 / 60362.0 | 38566.5 / 58418.5 / 60366.5 |
| 2026-10-08T14:40:27.090Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 1094.8 | 182.69 | 27681.0 / 57158.0 / 60079.0 | 27683.5 / 57166.5 / 60088.5 |
| 2026-10-08T14:41:22.285Z | worker-burst2000-batch50-pool2 | compiled worker | 2000 | 2000 |  | 12625.8 |  | drained true; duplicates false; SIGTERM 0 | unmeasured |

Natural and forced claim plans are retained separately in each raw file; use natural EXPLAIN ANALYZE and its Index Cond/rows/blocks to assess access. Manual HTTP counts are statement counts, not scheduler throughput.
Historical v1 deadlineToCommitLagMs was acceptance lag; its raw bytes remain unchanged and cannot establish durable commit latency.
