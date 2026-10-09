# ATT-07 local measurement

Generated from append-only raw JSON. Scheduler throughput has no before value.
Acceptance lag ends at post-lock acceptance. Commit-ack-observed lag ends after successful COMMIT acknowledgement, calibrated to DB UTC with uncertainty/drift recorded in raw files. Both include seeded overdue age; neither measures SQS dispatch or results.
These runs do not establish capacity, an SLO, or AWS savings.

| Captured | Scenario | Harness | Due | Processed | Failed | Wall ms | Processed/s | Acceptance p50/p95/p99 ms | Commit ACK observed p50/p95/p99 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-10-08T14:15:21.472Z | burst2000-batch10-pool2 | in-process | 2000 | 2000 | 0 | 16613.8 | 120.38 | 39789.0 / 58350.0 / 60294.0 | 39793.5 / 58352.5 / 60298.5 |
| 2026-10-08T14:14:48.949Z | burst2000-batch50-pool2-run1 | in-process | 2000 | 2000 | 0 | 15403.6 | 129.84 | 39296.0 / 58601.0 / 60304.0 | 39299.5 / 58604.5 / 60306.5 |
| 2026-10-08T14:15:04.382Z | burst2000-batch50-pool2-run2 | in-process | 2000 | 2000 | 0 | 14762.6 | 135.48 | 39338.0 / 58486.0 / 60277.0 | 39341.0 / 58490.0 / 60280.0 |
| 2026-10-08T14:14:32.934Z | mixed-batch50-pool2 | in-process | 200 | 200 | 0 | 1258.3 | 158.94 | 27598.0 / 57145.0 / 60073.0 | 27602.0 / 57150.0 / 60086.0 |

Natural and forced claim plans are retained separately in each raw file; use natural EXPLAIN ANALYZE and its Index Cond/rows/blocks to assess access. Manual HTTP counts are statement counts, not scheduler throughput.
Historical v1 deadlineToCommitLagMs was acceptance lag; its raw bytes remain unchanged and cannot establish durable commit latency.
