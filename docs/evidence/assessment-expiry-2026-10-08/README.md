# ATT-07 deadline sweep evidence — 2026-10-08

Local closure for the deadline sweep. No capacity, SLO, or AWS cost acceptance. Database commit lag is not SQS dispatch or result latency.

| Artifact | Meaning |
| --- | --- |
| [baseline hashes](baseline-hashes.json) | Source, migration, contract, and historical evidence hashes captured before the edit |
| [manual hot path](manual-hot-path.json) | Auth-inclusive statement counts before (AR-05) and after the shared core |
| [measurement summary](measurement-summary.md) | Generated from the raw files below |
| [raw](raw/) | Append-only in-process and compiled-worker runs |

Scheduler throughput has no before value: no scheduler existed. The first measured batch-50 burst is `burst2000-batch50-pool2-run1`. `run2` repeats that config. `burst2000-batch10-pool2` is a different batch size. The earlier compiled-worker file stopped its 10 second drain window with 1440 committed rows and no duplicate outbox aggregate. The later compiled-worker file drained all 2000 after SIGTERM and restart, still with no duplicate.

`0001`–`0010` match the baseline hashes. `0011_submission_kind.sql` is new. The long-lived development database was not migrated. Historical evidence directories were not overwritten.

Reproduce with a disposable PostgreSQL 17 that preloads `pg_stat_statements` and sets `log_parameter_max_length_on_error=0`, plus Mailpit on 127.0.0.1:11025 and 18025 for the Identity SMTP case. Do not use port 55432. Set `TEST_DATABASE_ADMIN_URL` only for that process.

```sh
npm test
npm run typecheck
npm run lint
npm run build
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.integration.cjs --runInBand --testTimeout=180000
node scripts/assessment-expiry-measure.mjs
```

`npm run lint` includes quality and contracts. Identity HTTPS was not rerun: this increment does not change Identity composition or the shared HTTP adapter.
