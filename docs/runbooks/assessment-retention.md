# Assessment retention job

Local implementation: ATT-09 / [ADR-011](../adr/011-assessment-retention-compaction.md).
Default is disabled. No AWS scheduler, production SLO, PITR or storage savings have
been accepted from the local tests.

## Enablement checklist

1. Review organization retention policy, unresolved incident/legal holds and
   privacy/restore requirements. This job covers completed Assessment payloads.
2. Bootstrap `examination_assessment_maintenance` via the administrator-owned
   [roles script](../../infra/database/roles.sql). Give a dedicated non-superuser
   LOGIN membership only in that group, and ordinary database CONNECT. Keep it
   separate from API, grader, recovery, owner/migrator and operator credentials.
   Provision actual passwords with the secret manager; examples are local only.
3. Apply forward0017 using the normal owner-bound migration login. Keep applied
   0001–0016 checksums. No business credential gets DDL or broad table DML.
4. Deploy purged-aware API, source grader and DLQ recovery images everywhere.
   Verify database/function access and image versions before enabling any purge.
   Include any overlap/scheduler connection in the total pool budget.
5. Build, configure the dedicated URL/TLS and opt in. Do not point test/admin URLs
   or local example credentials at production. Start with a small batch and
   examine effect counts/audit/latency/error before changing schedule/batch.

```sh
npm run build
# Prepare .env.retention.example for an isolated local database/dedicated LOGIN.
# ASSESSMENT_RETENTION_ENABLED=true explicitly opts in to irreversible payload removal.
npm run retention:local
```

Production invokes `node dist/workers/scheduler/assessment-retention.main.js` with
platform-injected settings/secrets. `.env.retention.example` is a local example,
not production provisioning. `db:local` does not automatically create this LOGIN.
No scheduler resource is provisioned in this increment. Maintenance functions pin UTC themselves; caller timezone/DST cannot shorten the7×24hour window. Nonfinite completion timestamps remain protected for incident review.

## Settings and execution

| Setting | Default / bound |
| --- | --- |
| ASSESSMENT_RETENTION_ENABLED | false; exact true/false required |
| ASSESSMENT_RETENTION_RECEIPT_BATCH | 500;1–1000 |
| ASSESSMENT_RETENTION_ATTEMPT_BATCH | 10;1–50 |
| Receipt gate | minimum7days, fixed |
| Payload gate | minimum365days from submit AND7days from completion/recent receipt |
| Example pool |1 connection,1 waiting admission; not an optimized production pool |
| Example DB bounds | statement10s,lock1s,idle transaction15s |
| SIGTERM/SIGINT | no further UoWs; drain current,30s process deadline |

A finite job has no HTTP liveness/readiness endpoint. Disabled mode exits0 without
opening a DB connection. Enabled mode verifies function EXECUTE at startup;
a failed check/DB access exits1. Process completion/exit and scheduled-job overdue
monitoring are the operational health signals. This does not replace API/queue
worker `/live`/`/ready` behavior. Bounded DB timeouts and the external job deadline
are required; schedule concurrency must stay inside the connection budget.

There is one committed receipt batch, then one committed UoW per attempt. A later
failure cannot roll back earlier committed attempts/receipt pruning. Count only
committed work. Native SIGTERM drains the current UoW; forced kill/DB timeout can
roll it back, or leave a committed effect whose ACK was lost. Rerun safely checks
marker/eligibility; do not manually rebuild deleted answers/results or inbox.
No automatic unbounded retry is built in. A scheduler retry must be bounded and
back off; persistent failures require investigation.

## Logs, audit and diagnosis

Structured events: `assessment.retention.disabled`, `.started`, `.completed`,
`.stopping`, `.failed`. Started/completed include a tickId; completion includes
receipts/attempts/answers/selections/durationMs. No actor/attempt IDs, payload,
passwords, keys, raw SQL or database errors are logged. Business audit is atomic
and unsampled; only safe field names/resource IDs/reason/correlation are recorded.
Use tickId for restricted audit correlation, never as a metric label. Retain
technical logs14days under existing policy; exporter/scheduled overdue alerts and
CloudWatch cost are future observability gates.

A successful zero count can mean no eligible data or skipped/protected locks.
Check due ages, completion grace, recent receipts, unresolved quarantine, outbox
leases/delivery/parking and replay state with an authorized diagnostic identity.
The maintenance login intentionally cannot browse tables/keys. Do not broaden its
grants to debug. A large protected completed population may consume discovery
budget even when batch size is small. Investigate plans/statement timeouts and
index selectivity; never shorten policy or remove gates to make counts rise.

If projection consistency/audit fails, the attempt UoW rolls back. Inspect the
underlying incident with restricted operator tooling and repair from authoritative
records under review. Do not mark pending/FAILED work completed or clear failure
records merely to permit purge. Delivered outbox/inbox/audit/Catalog lifecycles
are separate; no emergency table-wide delete belongs in this job.

## Rollback and recovery

Disable future job runs first. After any purge, rollback only to a purged-aware
API/source/DLQ version and retain migration0017. A code rollback does not undo data
retention. Normal Candidate reads return404/omit purged history and quota remains
consumed. Late canonical source/DLQ duplicates are acknowledged without scoring.

Restoring a backup can reintroduce payloads/old intents. Keep public access and
leaderboards closed until durable privacy/deletion ledger reconciliation and
retention verification complete under the restore runbook. The independently
durable deletion ledger/PITR/timed restore are not implemented by this increment.
Do not use a backup restore to silently reverse a fulfilled deletion request.

[Raw local validation](../evidence/assessment-retention-2026-10-09/README.md)
contains the worker/rollback/concurrency tests and explicitly limited plan/timing.
