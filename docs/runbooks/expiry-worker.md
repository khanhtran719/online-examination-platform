# Deadline sweep worker

The expiry worker submits an `IN_PROGRESS` attempt when its deadline has arrived. It uses the same Assessment acceptance path as manual submit, with `submission_kind=DEADLINE`. It does not score, publish to SQS, or require a live candidate session.

Build first. The process reads only its own environment file. That file has no JWT, CSRF, or email key.

```sh
npm run build
npm run expiry:local
```

`npm run expiry:local` starts `dist/workers/scheduler/expiry.main.js` with `.env.expiry.example`. Point `DATABASE_URL` at a login that inherits `examination_expiry_worker`. `npm run db:local` creates `examination_expiry_local` for the Compose database. Do not point this process at another project's database.

Stop with SIGTERM or SIGINT. The process stops taking a new attempt, finishes or rolls back the current transaction, closes the health server, and closes the pool. A 30 second timer exits 1 only if that stop does not finish. SIGKILL drops the connection; PostgreSQL rolls back the open transaction. The attempt stays `IN_PROGRESS` and the next process retries it.

## Health

| Path | Meaning |
| --- | --- |
| `/live` | Process is up. It stays ok while the database is down. |
| `/ready` | The latest tick was not a connection failure and was not a tick that only failed rows. |
| any other path | 503 |

Both responses are `{ "status": "ok" }` or `{ "status": "error" }` with `cache-control: no-store`. They are outside the API envelope. Startup runs `SELECT 1`. If that fails, the process logs `expiry.startup.failed` and exits 1. It does not retry in a tight loop.

When the database returns, the next successful tick sets `/ready` back to ok. A transient sweep error does not mark the attempt `FAILED`.

## Config

Database pool and timeouts use the shared `DB_*` variables. The sweep adds:

| Variable | Default | Bounds |
| --- | ---: | --- |
| `EXPIRY_POLL_INTERVAL_MS` | 5000 | 1000–60000 |
| `EXPIRY_BATCH_SIZE` | 50 | 1–200 |
| `EXPIRY_JITTER_PERCENT` | 20 | 0–50 |
| `EXPIRY_BACKOFF_INITIAL_MS` | 200 | 50–60000 |
| `EXPIRY_BACKOFF_MAX_MS` | 30000 | 50–120000, and at least the initial backoff |
| `EXPIRY_HEALTH_PORT` | 3017 | 0–65535; 0 asks the OS for a port |

One process runs one loop. A full batch starts the next attempt immediately. An idle database waits about 5 seconds, plus or minus jitter. A connection error, or a tick whose every claimed row failed, backs off and clears `/ready`. Several processes are safe: each claim is `FOR UPDATE SKIP LOCKED`, so a locked row is not a barrier for the rest of the backlog.

Each attempt is one short transaction: lock, read `clock_timestamp()` after the lock, recheck status and deadline, then write the attempt and the outbox row. There is no lease table. The worker does not call Identity and does not take the user lock.

## Backlog

Discovery uses `status = IN_PROGRESS` and `deadline <= statement_timestamp()`, ordered by deadline then id, and ignores rows whose `expiry_retry_after` is still in the future. The stable discovery bound permits an index range on the existing `attempts_deadline` partial index. Acceptance still reads `clock_timestamp()` after the row lock and rechecks the deadline. A deadline crossed during discovery can wait until the next tick; it cannot be accepted early. Natural plans on a small, mostly-due table may reasonably use a sequential scan. Do not force the planner or add another index merely to make an index appear.

Logs are one JSON object per tick: `expiry.sweep` with processed, skipped, failed, due, oldest due age, and duration. They do not contain attempt ids, answers, tokens, SQL, or candidate data. `due: null` means the backlog read failed after the commits; it does not submit again. Counters are in-memory and move only after commit. The attempt row and outbox are the source of truth.

A row locked by manual submit is skipped and retried on a later tick. If acceptance/outbox fails, that transaction rolls back first. A separate short UoW locks the still-`IN_PROGRESS` attempt and persists `expiry_retry_count` and `expiry_retry_after`. It does not change status, revision, answers, accepted identity or outbox. A concurrent winner or currently locked row is left alone. If the retry transaction itself fails, the error reaches the loop's connection backoff.

Retry delay is exponential from 1 second, with ±20% jitter and a hard 30 second cap; the count saturates at 16. This caps metadata/backoff, not the lifetime number of retries: poison work continues to retry until acceptance or reviewed repair. Normal polling can add an idle interval before the next retry. The schedule survives process replacement and is shared by workers; it is not authoritative local memory. Manual submit remains eligible during cooldown. Metadata stays on the attempt row after acceptance and adds no separate retention table.

The `due`/oldest-age projection includes cooling rows so poison work is visible. `empty` means no currently eligible claim, not necessarily zero overdue attempts. Readiness can recover during cooldown; use overdue age and failure observations when diagnosing persistent poison rows. A finite failed prefix no longer consumes every successive batch while healthy rows wait behind it. These local regressions do not establish fairness under an unbounded arrival stream or AWS capacity.

## Failure recovery

1. Read `/live` and `/ready`. `/live` ok with `/ready` error means the process is up and the database tick is failing.
2. Read the latest `expiry.sweep` or `expiry.poll.failed` line. `expiry.poll.failed` has no error text and no SQL.
3. Confirm migrations through `0013` are applied and the role can `SELECT`, column-`UPDATE` submission/retry fields on `assessment.attempts`, and `INSERT` into `platform.outbox`. It must not read `identity.sessions`, `identity.verification_challenges`, `catalog.published_answer_keys`, `assessment.answers`, `assessment.answer_selections`, or `assessment.results`.
4. Do not run a second repair that inserts an event. Restart the worker. An attempt that already has `submitted_at` is not claimed again.
5. If the process dies after commit and before it logs success, the row is already `EXPIRED` or the manual winner's state. Restart must not add a second outbox row.

Column `UPDATE` on `status` can set `FAILED`. The application does not. A hostile login using this role could. Keep the login off the API and off operator tooling.

## Forward migrations 0011–0013

`0011_submission_kind.sql` adds provenance and worker privileges, backfills accepted rows to `MANUAL`, and makes accepted kind immutable. Its original CHECK admitted SQL UNKNOWN for accepted NULL; it is preserved byte-for-byte as migration history. It also replaces `assessment.validate_completion()` with the 0004 predicate, `SECURITY DEFINER` and `search_path=pg_catalog`, so the expiry role can commit without reading results.

`0012_required_submission_kind.sql` replaces that CHECK atomically with an explicit non-NULL accepted branch. It accepts valid `MANUAL`/`DEADLINE` values, requires DEADLINE to be expired, and keeps unsubmitted kind NULL. It does not infer or overwrite a missing winner. Before upgrading an existing database, run this read-only preflight through the authorized migration/operator connection:

```sql
SELECT
  count(*) AS invalid_accepted_provenance
FROM
  assessment.attempts
WHERE
  submitted_at IS NOT NULL
  AND submission_kind IS NULL;
```

If nonzero, `0012` fails validation and rolls back, retaining the prior constraint and migration receipts. Recover provenance only through a separately reviewed and audited repair using verified accepted-event evidence; do not blindly label all NULL rows MANUAL. This increment supplies no automated repair for an already-corrupt database.

`0013_expiry_retry_schedule.sql` adds bounded retry metadata and grants column UPDATE only to `examination_expiry_worker`. The API runtime role cannot update those fields. Apply migrations before launching the corrected scheduler. There is no down migration; a reviewed application rollback retains schema, checksums and accepted provenance. Restoring the old scheduler also restores its starvation/query defects, so pause that scheduler and repair forward if required. Keep the `0011` SECURITY DEFINER completion check: reverting it reintroduces the results permission failure.

Do not edit applied `0001`–`0011` or archived evidence. This increment did not migrate a long-lived development database.

## Local measurement

After building, run `scripts/assessment-expiry-measure.mjs` with `TEST_DATABASE_ADMIN_URL` pointing to a disposable test cluster. `EXPIRY_EVIDENCE_DIR` selects a new directory; the default is `.local/assessment-expiry-diagnostics`. `EXPIRY_MEASURE_ONLY=sweep`, `worker` or `index` limits the run. Index mode records three natural EXPLAIN ANALYZE/BUFFERS observations of claim/backlog versus the old volatile discovery predicate on the same 100,000-future-row fixture. It does not force an index.

Schema-v2 in-process evidence separates `deadlineToAcceptanceLagMs` from `deadlineToCommitAckObservedLagMs`. The latter records successful UoW COMMIT acknowledgement at the caller, calibrated to DB UTC, with calibration round-trip uncertainty and before/after offset drift. It is an estimate of observed durable acknowledgement, not the physical WAL commit timestamp. Both distributions include seeded overdue age. Collector failure cannot retry a committed attempt; compiled-process mode leaves this observation unmeasured.

Historical v1 `deadlineToCommitLagMs` actually ended at `submitted_at` before persistence and must be interpreted as acceptance lag. Preserve those raw bytes and use the correction/closure report; neither old nor new lag establishes SQS dispatch, scoring, result latency or a production SLO.
