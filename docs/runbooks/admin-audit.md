# Audit browse and retention operations

[ADR-015](../adr/015-audit-browse-and-fixed-retention.md),
[plan and local checks](../admin-audit-2026-10-10.md),
[evidence](../evidence/admin-audit-2026-10-10/README.md).

## Browse

GET /v1/admin/audit uses a verified/enabled session with audit.read. Default20,
max100; cursor/pageSize only. Use the returned opaque cursor with the same user and
page size within15min. On expiry restart from the first page. Records are live,
descending time/UUID; late commits/backdating/purge can change later pages. No
repeatable forensic export, hidden total or arbitrary filter is promised.

Each successful response, including empty, commits one reporting.audit.read access
audit before response. It becomes visible on a fresh read. No recursive audit;
repeated GET accesses each leave a record. Reason/operator identity are redacted;
unknown labels/field names are suppressed. USER/OPERATOR/SYSTEM can have nullable
actor/target IDs; do not invent an identity. FAILURE storage maps to FAILED output.
No keys/answers/body/password/token/SQL text. Envelopes are no-store and below256KiB;
8 SQL calls including auth/admission/transaction/current permission/access audit.

401/403 release no data;400 means invalid/cross-scope/expired cursor or query.
Respect429/Retry-After; bounded backoff on safe503. Investigate correlation IDs,
pool/lock/query duration, audit insert/commit failure and source validity. Never
return an unaudited partial page or guessed empty success. The live Web currently
keeps Admin pages blocked until explicit capability discovery is implemented;
parser/demo compatibility and focused Chromium checks do not open that gate.

## Provision and rollout

1. Apply the idempotent infra/database/roles.sql bootstrap through the trusted
   deployment identity before migration0019. Retain all prior migration checksums.
   Run the standard migration process and verify19 source/build entries match.
2. Provision a separate service LOGIN with INHERIT/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/
   NOREPLICATION/NOBYPASSRLS and membership examination_audit_maintenance only.
   Use a deployment-managed credential secret/TLS; never copy the local placeholder
   password into production, print credentials or add membership to API/operator.
   This repository does not provision an AWS secret/schedule/account yet.
3. Verify PUBLIC/normal runtime cannot execute platform.prune_audit(integer,uuid),
   the maintenance identity cannot SELECT/INSERT/UPDATE/DELETE/TRUNCATE the audit
   table, SELECT Identity data, SET ROLE owner or execute other maintenance RPCs.
   Trusted owner/superuser authority is outside those runtime grant boundaries.
4. Deploy the compatible API/Web DTO before enabling maintenance; inspect local
   restricted-role/upgrade/rollback evidence and run staged mixed workload checks.
   New function/role is additive; rollback app image may retain migration0019.
   Disable maintenance before rolling back. Never drop applied history to roll back.
5. Start with AUDIT_RETENTION_ENABLED=false. After reviewed policy/backup/hold and
   measured batch/cadence approval, set true and AUDIT_RETENTION_BATCH=500
   (1–1000). npm run audit:retention:local is a local example only. Scheduled
   production execution must inject the separate database credential and existing
   verified TLS config; scheduler IAM/cadence/cost remain unimplemented gates.

## Execute, observe and stop

Each process checks function authority, acquires at most1 DB connection and runs
one batch. Fixed server UTC cutoff is statement time truncated to milliseconds
minus365days; equality/young/future/nonfinite timestamps remain. Oldest-first
SKIP LOCKED allows overlapping jobs; a locked row may wait for a later run.
Delete and one SYSTEM audit share COMMIT; no-op adds no audit. There is no public
purge API, caller cutoff or arbitrary IDs. Do not bypass the function with table DML.

Monitor eligible backlog/oldest age, purgedRows/duration, DB I/O/locks/vacuum/storage,
API p95/p99 and errors. Logs contain only event/tick/count/duration. Observe audit.prune
with bounded metric labels; no actor/resource/row IDs as metric dimensions. A purge
adds one retained audit row, so include that small write/storage cost in scheduling.
Existing statement/lock/pool bounds apply; this job does not choose optimal pool
sizes or a sustainable job rate. Repeat measured mixed-load checks before changing
batch/cadence. No new long-lived service or AWS resource is required by this code.

SIGTERM/SIGINT stops admission and drains one in-flight bounded transaction; the
process has a30s final deadline. Crash before COMMIT rolls back. Commit ACK loss is
uncertain: use a fresh authorized audit browse/operations connection to inspect the
tick's safe durable record. Do not rapidly replay an ambiguous tick as an exact same
batch: there is no receipt. A later scheduled invocation processes remaining old
rows. Disable the flag/schedule on repeated failures; investigate with correlations.

## Restore

Keep restored deployment closed. Restore schema/data/owners/grants into an isolated
target. Verify19 migrations, role membership, append-only runtime restrictions and
function authority. Reapply the fixed policy in bounded batches to old resurrected
records and verify young rows survive; policy does not remove future/nonfinite rows.
Never substitute a new cutoff, globally TRUNCATE audit, or treat the restored dump
as evidence the original durable purge never committed.

Separate account-deletion/opt-out ledger, session revocation, stale email cancellation,
leaderboard reconciliation, RDS backups/PITR and measured RPO/RTO remain required
before reopening public traffic. Local dump/restore timing is not RDS RTO. Current
fixture uses synthetic rows and in-memory dump bytes; no production PII was copied.
