# ADR-015: Audited primary browse and fixed online audit retention

Status: accepted locally2026-10-10 for REP-06; production NOT ACCEPTED.
[Implementation and evidence](../admin-audit-2026-10-10.md).

## Context and ownership

Reporting owns authorized, bounded operational reads of platform.audit_logs. The
platform already appends safe audit records atomically with privileged effects;
normal runtime identities cannot update/delete them. Audit browsing must itself
be audited. Online365day retention requires a distinct privilege without granting
API/operator/mail/grading/Assessment-maintenance accounts arbitrary purge rights.

Architecture §§5,13C,28–29 allow optimized private query adapters; §§54–56 allow
thin technical workers. Audit lifecycle is cross-cutting operational policy, not
a new business module named after a table. Shared pure Application workflow/Port
owns bounded invocation; global observability/audit Infrastructure implements it;
workers/scheduler composes these. Reporting never deletes source records. This
specializes placement without weakening the official Architecture Contract.

## Browse contract

GET /v1/admin/audit requires current audit.read, independently of reporting.read.
HTTP authenticates/authorizes/admits before query mapping. Application revalidates
through Identity's public capability under the existing actor lock, executes one
private primary projection and writes exactly one reporting.audit.read access
record in the same UnitOfWork. Commit must complete before any payload escapes.
The audit INSERT does not invoke a recursive audit handler. Ordinary GET retries
may produce another access audit; each successful read remains one recorded access.

Only cursor/pageSize are supported,20 default/100 maximum. Descending occurred_at/
id keyset uses primary statement-clock watermark and a15min AES-GCM opaque cursor
bound to actor/pageSize and a distinct purpose derived from the existing CSRF root.
No OFFSET/count/filter/export/aggregate hydration/cache/network call/new index.
This is live paging: late/backdated commits and retention can change populations;
it is not a forensic snapshot or an immutable export.

Declared physical source: id,occurred_at,actor_id,actor_type,action,resource_type,
resource_id,outcome,correlation_id,changed_fields. Never select reason or
operator_identity. DTO reason is always null; actorType is USER/OPERATOR/SYSTEM,
actorId/resourceId can be null. Unknown action/type labels become safe constants,
unknown changed-field names are removed and duplicates collapsed. Stored FAILURE
maps to v1 FAILED. Invalid identity/time/outcome/actor type, oversized/unsorted/
future projection or audit/commit failure returns safe503 without a partial page.
The actorType addition is required; Web DTO/parser/demo are updated together.
Admin live Web capability discovery remains blocked by the existing separate gate.

## Retention and privilege

Forward migration0019 adds platform.prune_audit(integer,uuid), SECURITY DEFINER
owned by examination_owner, trusted pg_catalog/pg_temp search_path and UTC timezone.
Only a separately provisioned LOGIN member of NOLOGIN examination_audit_maintenance
has the normal runtime EXECUTE capability. That group gets schema USAGE and function
EXECUTE only; no table DML/SELECT or Identity access. Trusted DDL owners/superusers
inherently retain administrative authority; append-only grants are not cryptographic
protection from a database administrator. REVOKE PUBLIC executes in the migration
transaction. Bootstrap roles.sql must run before the forward migration.

No caller cutoff/age/target override. Fixed cutoff is primary statement time
truncated to milliseconds minus365days; delete only finite timestamps strictly
older than cutoff. Batch1–1000, oldest time/id first, FOR UPDATE SKIP LOCKED. Delete
and one SYSTEM count audit commit atomically; empty batch emits no audit. The safe
reason records policy/count/cutoff, private operator_identity stores session_user,
and public browse excludes both. Existing audit_retention(occurred_at,id) supports
age selection and backward browse. Nonfinite timestamps are preserved for separate
operator investigation. Scheduling is default-off and needs measured arrival,
eligible backlog, storage, vacuum/I/O, mixed-load latency and reliability review.

One finite job uses max1 connection, bounded queue/timeouts, safe aggregate logs,
SIGTERM/SIGINT drain≤30s and no automatic loop/ambiguous-commit retry. A subsequent
scheduled run operates on remaining eligible rows and may delete a different batch;
the tick is correlation, not a durable exact-retry receipt. A lost commit ACK is
uncertain: investigate durable purge audit with a fresh authorized connection.

## Recovery, alternatives and evidence limits

Local pg_dump/pg_restore preserves ownership/grants, proves old deleted records can
resurrect and reapplies the same cutoff while keeping young rows. Production restore
stays closed until independent privacy ledger/session/mail/leaderboard recovery and
RDS PITR/RPO/RTO gates pass.365days is this product's online baseline, not a legal
compliance claim or automatic legal-hold feature; holds require an explicit new
contract before enabling this job in such an environment.

Giving API DELETE or accepting arbitrary cutoffs would bypass durable retention.
A Reporting delete use case or table-named business module would misplace technical
ownership. A permanent service/new AWS resource/cache/index is unnecessary for the
bounded invocation contract. Benchmark scheduling/partitioning/archive alternatives
only if measured primary pressure or recovery requirements justify them. Current
100k browse and bounded purge diagnostics establish local behavior, not sustainable
RPS/jobs, optimal pools/sizes, AWS cost savings or a Performance–Cost winner.
