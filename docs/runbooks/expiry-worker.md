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

Due work is `status = IN_PROGRESS` and `deadline <= clock_timestamp()`, ordered by deadline then id. The partial index is `attempts_deadline`. At a few thousand rows the planner may still sequential-scan; the index is eligible and is the intended access path. Do not add a second index without a measured plan change on a realistic table.

Logs are one JSON object per tick: `expiry.sweep` with processed, skipped, failed, due, oldest due age, and duration. They do not contain attempt ids, answers, tokens, SQL, or candidate data. `due: null` means the backlog read failed after the commits; it does not submit again. Counters are in-memory and move only after commit. The attempt row and outbox are the source of truth.

A row that is locked by a manual submit is skipped and retried on a later tick. A row whose outbox insert fails stays `IN_PROGRESS` and is excluded only until that tick ends. The next tick tries it first because it is still the oldest due row.

## Failure recovery

1. Read `/live` and `/ready`. `/live` ok with `/ready` error means the process is up and the database tick is failing.
2. Read the latest `expiry.sweep` or `expiry.poll.failed` line. `expiry.poll.failed` has no error text and no SQL.
3. Confirm the role can `SELECT` and column-`UPDATE` `assessment.attempts` and `INSERT` into `platform.outbox`. It must not read `identity.sessions`, `identity.verification_challenges`, `catalog.published_answer_keys`, `assessment.answers`, `assessment.answer_selections`, or `assessment.results`.
4. Do not run a second repair that inserts an event. Restart the worker. An attempt that already has `submitted_at` is not claimed again.
5. If the process dies after commit and before it logs success, the row is already `EXPIRED` or the manual winner's state. Restart must not add a second outbox row.

Column `UPDATE` on `status` can set `FAILED`. The application does not. A hostile login using this role could. Keep the login off the API and off operator tooling.

## Migration 0011

`0011_submission_kind.sql` is forward-only. It adds `assessment.attempts.submission_kind`, backfills accepted rows to `MANUAL`, checks that kind is absent exactly when `submitted_at` is absent, and requires `DEADLINE` to be expired. A trigger rejects a kind change after acceptance. It also replaces `assessment.validate_completion()` with the same predicate as 0004, `SECURITY DEFINER` and `search_path=pg_catalog`, so the expiry role can commit an `EXPIRED` attempt without `SELECT` on `assessment.results`.

Do not edit `0001`–`0010`. There is no down migration. A reviewed rollback, only before deadline submissions must be retained, is:

```sql
REVOKE ALL ON FUNCTION assessment.guard_submission_kind() FROM PUBLIC;
DROP TRIGGER IF EXISTS immutable_submission_kind ON assessment.attempts;
DROP FUNCTION IF EXISTS assessment.guard_submission_kind();
ALTER TABLE assessment.attempts DROP CONSTRAINT IF EXISTS attempts_submission_kind_check;
REVOKE UPDATE (submission_kind) ON assessment.attempts FROM examination_runtime;
REVOKE INSERT ON platform.outbox FROM examination_expiry_worker;
REVOKE UPDATE (
  status, submitted_at, submission_id, submission_event_id, expired, revision, submission_kind
) ON assessment.attempts FROM examination_expiry_worker;
REVOKE SELECT ON assessment.attempts FROM examination_expiry_worker;
REVOKE USAGE ON SCHEMA assessment, platform FROM examination_expiry_worker;
ALTER TABLE assessment.attempts DROP COLUMN IF EXISTS submission_kind;
```

Leave `validate_completion()` as the 0011 definition unless a later reviewed migration restores the invoker copy. Restoring the invoker copy makes an expiry-role commit fail again with permission denied on `assessment.results`. Dropping `submission_kind` while accepted rows exist removes the only durable MANUAL/DEADLINE distinction; the event payload is not a substitute.

This increment did not migrate a long-lived development database.
