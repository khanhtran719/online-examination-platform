# REP-06 Audit lifecycle — 2026-10-10

Status: AU-01–06 COMPLETE locally; production NOT ACCEPTED. Scope REP-06 only.

Reporting owns READ GET /v1/admin/audit with audit.read, primary read-only source
platform.audit_logs, occurred_at DESC/id DESC,20 default/100 maximum items,
opaque actor/page-size bound15min keyset and statement-clock watermark. This is
a live bounded browse: late commits/backdated inserts may be omitted or appear
below the cursor; it is not an immutable forensic export or repeatable snapshot.
No filters/export/OFFSET/source writes or new index without evidence. Authentication,
permission and admission precede query mapping; locked current Identity access,
one query and mandatory reporting.audit.read access audit commit before response.
No automatic auditing of the audit INSERT and no recursive handler. Access rows
remain browsable on fresh reads; each successful call writes exactly one row.

Return opaque IDs/timestamps, actorType USER/OPERATOR/SYSTEM, allowlisted actions,
resource types/changed-field names and outcome. Raw reason/operator_identity are
not selected; reason is explicitly null. Unknown labels become UNRECOGNIZED or
UNSPECIFIED; unknown field names are removed. FAILURE maps to existing DTO FAILED,
resourceId may be null as permitted by the database. Update OpenAPI and strict
Web DTO/parser/demo compatibility and focused Chromium demo check; live Admin
capability discovery/HTTPS/business integration remain a separate gate.
Invalid source identity/time/outcome fails closed.8 auth-inclusive SQL calls and
256KiB response budget; natural100k first/deep plans and paced diagnostics.

Audit retention is an existing cross-cutting technical capability, not a new
table-based business module. Shared pure Application workflow/Port owns bounded
invocation; global observability/audit Infrastructure implements it. Reporting
never deletes audit rows. Forward migration0019 supplies a private fixed-policy
SECURITY DEFINER function, normal runtime EXECUTE limited to dedicated NOLOGIN audit-maintenance
group; trusted DDL owners/superusers retain administrative authority. No direct SELECT/INSERT/UPDATE/DELETE/TRUNCATE privilege to that group;
runtime/operator/mail/grading/Assessment maintenance cannot invoke it. Purge only
finite occurred_at strictly older than365 days at server UTC clock,1–1000 rows,
oldest-first FOR UPDATE SKIP LOCKED. Delete and one SYSTEM safe count audit share
one transaction; no-op writes no audit. Young/exact-boundary/nonfinite rows protected.
No caller age/cutoff/resource ID override; concurrent jobs cannot delete a row twice.

Finite scheduler entry point is opt-in/default-off, one bounded batch, max1 DB
connection, graceful SIGTERM/SIGINT drain and safe aggregate-only logs. Existing
timeouts/back-pressure apply, no network call inside transaction. Restore from a
local disposable database dump must retain grants/young audit rows, demonstrate
old deleted rows reappearing and reapply the same policy. This is not live RDS
backup/PITR/RPO/RTO or independent privacy-ledger recovery acceptance. Production
runbook keeps public access closed until separate privacy/recovery gates pass.

- [x] AU-01 Inspect contracts/source/rules; record ownership, redaction, live paging,
  fixed retention, privilege/restore policy and protected historical hashes.
- [x] AU-02 Fail-first Domain/Application/cursor/retention and Web contract tests.
- [x] AU-03 Private Reporting read flow and shared technical retention workflow,
  migration/role/worker/config, OpenAPI/ADR/source-dependency documentation.
- [x] AU-04 Restricted-PG/HTTP/compiled TCP, append-only/least-privilege, audit rollback,
  cursor/permission/races, retention bounds/concurrency/rollback and local restore.
- [x] AU-05 Natural100k first/deep plans and raw query/payload/CPU/pool/transaction
  diagnostics, retention batch measurements; no optimization/capacity/cost winner.
- [x] AU-06 Full relevant checks/self-review, immutable history/build migrations,
  fixture cleanup, runbook/evidence and checklist closure.

REP-04 independent privacy ledger/deletion/restore, REP-07 exports, REP-08 broader
source dependency review, Web integration and AWS/FinOps gates remain open. A local
REP-06 check accepts the named audit browse/fixed retention controls only.


## Review closure

[Evidence](evidence/admin-audit-2026-10-10/README.md),
[ADR-015](adr/015-audit-browse-and-fixed-retention.md),
[operations](runbooks/admin-audit.md) and
[experiment](../experiments/admin-audit/README.md) close this named local increment.
616 root cases (475 API/42 tooling/99 Web),410 full integration/23 suites,58 final
Audit/compiled TCP and31 final Audit pass with0 skipped;1 focused Chromium demo
case verifies USER/SYSTEM/null resource/focus compatibility. API/live/demo builds,
lint/Web lint/typecheck/quality/contracts48 operations/445 examples pass.54 API
unit cases plus3 Web cases are new.19 source/build migration bytes match and556
historical files are unchanged. Runtime scans0 advisories; fixtures0 databases/
logins/connections, test containers stopped, volumes retained. No commit/deploy/PR.

R-58/R-59/workflow47–48 review: Reporting READ uses current Identity public access,
private safe projection/cursor/DTO and explicit audit UoW; no source write or private
module import. No source row locks; existing actor lock/permission order retained.
Infrastructure owns SQL/crypto. Cross-cutting technical purge goes through pure
Application/Port, function-only private adapter and thin scheduler composition.
No ORM/framework/Redis/AWS SDK/HTTP leak into business layers. No Outbox/event/cache
needed for same-DB audit transaction or bounded purge. No network in UoW; no implicit
retry after uncertain COMMIT. No new runtime dependency/index/AWS resource, secrets
or raw reason/operator metadata in output/logs. Source-label allowlist matches
existing writer types; schema/write-label changes require query-consumer review.

Missing demo actorType and legitimate source labels were caught and fixed; tests
retain RED→GREEN. An added privilege-test group name did not exist and was corrected
to actual mail/expiry/dispatch groups; no runtime privilege was relaxed. Runtime
and maintenance direct table writes/maintenance source reads/other RPCs/owner
impersonation are denied. Trusted DDL owners/superusers remain administrative.

Local100k first/deep query p95≈2.310/3.830ms, HTTP inject p95≈33.751/32.223ms,
8 SQL/≤37,810bytes in final run; natural existing-index plans.20-sample p99 is
empirical max; no TCP/TLS/ALB/sustained concurrency.36000 eligible-row500/1000 batch
commit diagnostics and four real dump/restore runs preserve raw observations, not a
matched sizing/cost winner or RDS PITR/RTO. Keep default500/default-off scheduling
until workload/storage/policy evidence supports activation. Roadmap86/216 checked,
130 pending; next proposed REP-07. Independent privacy ledger/deletion/restore,
live Admin permissions/Web integration and AWS security/recovery/capacity/cost remain
separate open gates. No Performance–Cost curve or production readiness claim.
