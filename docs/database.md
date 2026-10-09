# PostgreSQL implementation

Prior dispatch2026-10-09: [submission dispatch closure](outbox-dispatch-2026-10-08.md) adds forward0014 and administrator-bootstrapped dispatch NOLOGIN role.0001–0013 bytes preserved. API loses delivery metadata UPDATE; worker has outbox-only grants; operator-only replay/audit is atomic. Separate replay_at does not alter event time/body. ACK/failure uses post-lock DB time, with real lease-expiry/rotation/replay/grants regressions. Historical eight-migration normalization evidence below remains historical.

Scope: DB-01–11 foundation, Phase04 Identity adapters, local Catalog persistence and local Assessment attempt persistence. PostgreSQL17, parameterized pg infrastructure (ADR-001). Seventeen source migrations exist:0014 adds dispatch/replay privileges,0015 grading result/statistics/inbox ownership,0016 failure/replay generation fences and0017 retention compaction/maintenance functions.0001–0016 are immutable;0017 is the new forward file tested in disposable fixtures. Applied 0001–0011 retain their bytes; new 0012 fixes accepted provenance validation and 0013 adds scheduler retry metadata. `0009_catalog_question_points.sql` is the forward Catalog column. `0010_attempt_revision.sql` adds required `assessment.attempts.revision`. Identity real-PG/HTTP/retention tests and [local diagnostic](../experiments/identity-local/README.md) exist. Catalog draft, publication, projection and import flows have disposable-database tests. Assessment start, save and submit flows have disposable-database tests. Grading/recovery/retention persistence have local restricted-PG evidence; AWS saturation remains pending. [Foundation review](phase-03-review.md), [Identity review](phase-04-review.md), [migration runbook](runbooks/database-migrations.md), [decision](adr/004-postgresql-durability.md).

## Placement and persistence decision

Current PostgreSQL queries follow [conventions §102.1](../.ai/conventions.md#1021-postgresql-query-layout) and [rule R-77](../.ai/rules.md#77-sql-readability-and-formatting-preservation-rule-r-77): multiline clause bodies, projections, predicates and CTEs with adjacent bindings. SQL remains in Infrastructure; formatting is a source maintenance task. Prettier does not format embedded SQL. Applied0001–0016 and historical experiment sources/evidence retain their original bytes; new0017 uses the layout. The eight-migration normalization bundle described below is historical. Formatting changes do not establish a performance gain.

The commands below execute pg adapters under `src/infrastructure/database/transaction` and the compiled SQL bundle under `dist/infrastructure/database/migrations`. [ADR-006](adr/006-source-layout-normalization.md) N-06/N-09 are complete: eight source and built files match baseline checksums; the compiled CLI applied a fresh database and was rerun successfully from `/tmp` without applying a second migration. Keep SQL schema `platform`, grants, eight migration names/checksums and one migration history unchanged. Folder normalization is separate from [TypeORM/Sequelize evaluation](api-architecture-review.md#5-typeorm-và-sequelize-có-phù-hợp-không); pg is not a measured performance/cost winner. Any ORM/raw SQL implementation uses the active UoW manager/connection and the same pooling/security/timeouts/rollback-only gates.

## Local execution

```sh
npm ci
docker compose up -d --wait postgres
npm run db:local
npm run db:migrate:local
npm run test:integration:local
npm run db:budget -- infra/database/connection-budget.local.json
docker compose stop postgres
```

Local-only commands use fake example credentials. `db:local` provisions NOLOGIN owner/runtime/operator/mail-worker groups and distinct local migrator/app/operator/mail logins, revokes public CREATE and installs diagnostics. Migrator SET ROLE owner; app DML only cannot SET ROLE owner or directly mutate role grants. Worker only reads required user columns/challenges/intents and uses narrow maintenance, not passwords/JWT sessions/catalog keys. Production secret-managed logins remain pending: **never inject local/test/admin/migration/operator URLs into API/worker containers**. General db:migrate requires DATABASE_MIGRATION_URL, integration requires TEST_DATABASE_ADMIN_URL. Isolated test databases/roles are cleaned after connections close; development data is not truncated.

## Ownership and storage

| Schema | Owned storage | Important constraints |
| --- | --- | --- |
| identity | users, roles, permissions, role/user assignments, session families and hashed access/refresh credentials | normalized unique ASCII email; SHA-256 sized credential hashes; FKs; expiration ordering; privacy-disabled rows may have PII removed |
| catalog | mutable exams/sections/question bank/options/membership; immutable publications/sections/questions/options/keys | composite snapshot membership; one source question per version; bounded sizes/order/points; duration/limit/time checks; current pointer belongs to logical exam |
| assessment | attempts (including compact purged identities), answers, normalized selections, results/sections/question detail, ranking/statistic projections | one active candidate/logical exam across versions; ownership/version composite FKs; unique submission/event IDs; positive answer version; immutable accepted submission; results unique per attempt; exact integer basis points; completion/result deferred integrity with explicit purged COMPLETED exception |
| platform | migration receipts, actor/key receipts, outbox, inbox, quarantined jobs, append-only audit, bounded rate buckets, import reports | checksum history; globally actor-scoped key uniqueness; consumer/event uniqueness; leases paired; payload/report size limits; DML grants by table/column |

The initial six migrations delivered34 tables including history. 0007 expands Identity with challenges/email intents/operator bootstrap/request limits and session/user metadata;0008 adds maintenance/privileges/operational functions. 0009 adds `catalog.questions.points integer NOT NULL` with `CHECK (points BETWEEN 1 AND 1000)`. The column has no default, so new inserts must supply points. Any pre-existing row is backfilled to 1 before the constraint. Table grants from 0003 cover the new column. The runner rejects top-level transaction commands, so 0009 contains none. 0010 adds `assessment.attempts.revision integer NOT NULL` with `CHECK (revision >= 1)` and no default. Existing rows are backfilled to 1. Start inserts 1. Each committed save batch and the first submit increment it by 1. Runtime receives `GRANT UPDATE (revision)` only; 0004 still restricts the other attempt columns. 0010 contains no top-level transaction command. No per-table modules or cross-module repository access. Bank provenance is scalar historical identity/revision, not a cascading FK to mutable content. Candidate projections explicitly select authorized columns; separate key tables do not substitute authorization. Reporting remains specified, not implemented.

Frozen publication INSERTs are assembled in one transaction. A server-owned xid8 marks that transaction; child insertion guards reject later append. Runtime has SELECT/INSERT only on snapshots. A deferred constraint validates nonempty sections, total bounds, option count, key membership/cardinality and type at commit. Published metadata, including category, comes from the snapshot, not the draft. Publication trigger/validation queries are internal server work that must be included in future profiling. No optimization benefit is claimed for these guards: they protect correctness.

PROCESSING is transaction-local. Deferred constraints reject a commit leaving PROCESSING, a COMPLETED attempt without result, or a result without COMPLETED. The worker must finish both in its UoW; a lease model would require a reviewed migration/ADR. Stable accepted submitted_at/submission_id/event_id/expired cannot change. Runtime cannot change attempt owner/exam/version/start/deadline, answer membership or outbox payload/identity. Runtime can increment `attempts.revision` through the column grant in 0010. Audit, results, inbox and receipt identities are append-only for runtime. Retention is a future audited maintenance capability with ordered FK-safe batches; runtime has no blanket purge permission.

Application/domain own permissions/invariants. Identity now implements sessions/current permissions, post-lock time, UUIDv7 profile freshness/fingerprints/receipt-first retry and atomic audit; business races have real tests. Exam deadline/start/save/submit/scoring/inbox remain future use cases. Technical schema fixtures do not prove ATT-10/ASYNC-11; empty technical payloads are not production events.

## Query/index map

Primary/unique constraints provide their own indexes. Additional indexes in 0002 are query-driven candidates; 0005 removes the draft-category browse index because candidate filtering must use frozen category. No redundant category index is provisioned before evidence.

| Read/write path | Index / intended predicate/order |
| --- | --- |
| Public exam browse | exams_browse_all: published, unarchived, created_at DESC/id DESC; PK join current_version_id; category filter on frozen publication |
| Detail/current snapshot | exam/version PK and unique (exam_id,id); projection, not full aggregate |
| Bank browse / reference protection | bank_questions_cursor; draft_questions_source |
| Snapshot question page | frozen_questions_page(version_id,section_id,position,id); options/key membership PKs; bounded set query |
| Active start / attempt limit | one_active_attempt partial UNIQUE(user_id,exam_id); attempts_limit |
| Deadline sweep | attempts_deadline(deadline,id) WHERE IN_PROGRESS; stable `deadline <= statement_timestamp()` discovery range plus retry eligibility, one row `FOR UPDATE SKIP LOCKED`, then authoritative post-lock `clock_timestamp()`. Natural small mostly-due plans may still choose a scan; forced index visibility is not a range-lookup proof |
| Candidate history / admin submissions | attempts_history(user_id,started_at DESC,id DESC); attempts_admin(version_id,started_at DESC,id DESC) |
| Answer save / load | answers PK(attempt_id,question_id), selections PK prefix; attempt PK row lock |
| Result / ranking | result attempt PK, completion_sequence unique; leaderboard_order(version_id,earned DESC,submitted_at,attempt_id) INCLUDE user/sequence |
| Receipt replay / retention | receipt actor/key PK; receipts_retention |
| Assessment retention | attempts_retention_due partial completed/unpurged age; assessment_receipts_resource for scoped recent-receipt checks; underlying receipt age index |
| Outbox / inbox | outbox_ready partial available_at/created_at/event; lease/deadline filter checked at claim; outbox_aggregate; inbox consumer/event PK + inbox_attempt |
| Session / RBAC / operations | unique credential hashes; families by user; sessions_by_family/retention; role assignment reverse index; audit actor/resource/time; bucket expiry; import actor cursor |
| Identity verification / delivery | unique token hash; email-ready partial lease/available index; pending-account/material/metadata retention indexes; sessions by signing kid/family for incident revoke |

Actual adapter query plans, index selectivity/write overhead, cross-version rank/opt-out filtering and saturation require the large dataset and experiments. Small fixture success is not evidence of optimal index choice. No partitions, RDS Proxy, PgBouncer or Redis are added.

## Pool and transaction contract

The plain application port exposes only `transaction(() => Promise<T>)`. One shared PostgresDatabase infrastructure instance resolves the AsyncLocalStorage client at every query. Joined work reuses that connection; joined business/SQL errors mark rollback-only even when caught. Outer work cannot return a successful commit after rollback. Parallel request contexts do not share clients. Ended contexts reject detached work; pending unawaited queries force rollback. Every adapter/use case must await its work. No automatic transaction retry: retries require use-case idempotency and a bounded policy.

Defaults are **local candidates**, not selected production capacity: max10 connections, max20 queued admissions, acquire/connect1000ms, statement2000ms, lock500ms, idle transaction5000ms. Admission rejects excess immediately; pg bounds both connect and queued acquisition. A checkout can hold a transaction only while the owned callback runs; external I/O is forbidden. Server idle timeout protects database locks/connections, not hung JavaScript callbacks; API/worker orchestration will need its own cancellation/drain limits. TLS in production is explicit with certificate/hostname verification; URL query overrides are rejected. synchronous_commit=on is explicit; infrastructure resilience/backups still require AWS tests.

Connection gate:

`required = API maxTasks×pool + worker maxTasks×pool + rolling/scheduled surgeTasks×largest applicable pool + migration + reserved`

Use real RDS SHOW max_connections including superuser/reserved/monitoring/maintenance connections, maximum autoscaling limits and deployment surge for both services. Include dedicated scheduled retention pool and overlapping runs in the budget; no hidden maintenance exemption. Reserve includes failover/recovery access; do not consume it as ordinary traffic. The checked local example has max100, required56, remaining44; these are arithmetic limits, not utilization measurements or an AWS sizing decision. Production file/deployment gate remains to be wired in Terraform/CI. Optimize pool via measured sweep before raising RDS size.

## Observability and redaction

The adapter emits bounded-label observations for checkout, SQL elapsed time, lock-acquisition statement elapsed time, transaction elapsed/rollback and pool counts/errors. Lock elapsed includes network/server work; it is not an exact decomposition of pure server lock wait. Operator wait_event/pg_locks diagnostics complement it. SQL text, parameters, raw database messages, row IDs and credentials are absent from observations/errors. Collector failure cannot affect commits. The exporter/correlation/traces/dashboards remain OBS work, not silently enabled by the callback.

Compose enables pg_stat_statements in shared_preload_libraries; privileged provisioning creates the extension and a restricted aggregate view without query text. [Diagnostics SQL](../infra/database/diagnostics.sql) uses query IDs only for restricted analysis, never high-cardinality metric labels. RDS requires parameter group configuration/restart and extension permissions later. Server log parameter limits are administrator settings, not permissions given to runtime. Database server diagnostics can still contain sensitive error text: restrict access/retention and select approved log settings before production; never forward raw SQL/error detail into application logs. No CloudWatch cost or telemetry overhead has been measured.

Implementation references: [PostgreSQL constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [explicit/advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html), [timeouts](https://www.postgresql.org/docs/17/runtime-config-client.html), [pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html), [pg pool](https://node-postgres.com/apis/pool), [TLS](https://node-postgres.com/features/ssl), [AsyncLocalStorage](https://nodejs.org/docs/latest-v24.x/api/async_context.html). These inform the implementation; local tests supply its evidence.


## Scoped persistence comparison and pool shutdown

2026-10-07: [ADR-008](adr/008-persistence-evaluation.md) retains pg for current Identity after a local TypeORM/Sequelize comparison. [Evidence](../experiments/persistence-comparison/README.md) separates raw/mapped paths and preserves the current SQL migrations/ports; this is not RDS capacity or cost acceptance. ORM packages are experiment-only, not runtime dependencies.

PostgresDatabase.close now stops new admissions, waits for already-admitted active and queued operations to release or fail within their existing bounds, then calls pool.end. Repeated close returns the same completion promise. A real-PG regression first reproduced queued work timing out during early pool.end, then passed with the fix. Process-level shutdown deadlines/admission gates still own the external request drain; calling close from inside its own active transaction is not a supported use. Full53 database/Identity integration cases passed, including the existing SMTP flow; no schema/permission/migration changes were made.

## Submission kind and expiry role — 2026-10-08

`0011_submission_kind.sql` adds `assessment.attempts.submission_kind`. Accepted rows backfill to `MANUAL`. Unsubmitted rows stay null. Its original CHECK allowed SQL UNKNOWN for accepted NULL; forward `0012_required_submission_kind.sql` fixes the accepted branch with explicit non-NULL validation. Valid values are `MANUAL`/`DEADLINE`, and DEADLINE requires `expired=true`. Trigger `immutable_submission_kind` raises 23514 if kind changes after acceptance. Migration0012 fails closed if corrupt existing accepted NULL rows exist; it does not invent provenance. `0001`–`0011` are not edited. Apply schema before the corrected scheduler; rollback/repair guidance is in the [expiry worker runbook](runbooks/expiry-worker.md).

`examination_expiry_worker` is `NOLOGIN` in [roles.sql](../infra/database/roles.sql). `npm run db:local` creates login `examination_expiry_local` in that group. Migration 0011 grants `USAGE` on `assessment` and `platform`, `SELECT` on `assessment.attempts`, `UPDATE` of the submission columns (`status`, `submitted_at`, `submission_id`, `submission_event_id`, `expired`, `revision`, `submission_kind`), and `INSERT` on `platform.outbox`. It does not grant session secrets, answer keys, answer rows, email ciphertext or `assessment.results`. Column `UPDATE` on `status` can still set `FAILED`; the sweep application does not. Keep this login off the API.

`0004` checked completion at `COMMIT` as `SECURITY INVOKER` and read `assessment.results`. That made an expiry commit fail 42501. `0011` replaces the same predicate as `SECURITY DEFINER` with `search_path = pg_catalog` and revokes `EXECUTE` from `PUBLIC`. `EXPIRED` with no result commits. `PROCESSING`, or `COMPLETED` without a matching result, still raises 23514. The long-lived development database was not migrated by this increment.

`0013_expiry_retry_schedule.sql` adds `expiry_retry_count` (0–16, default0) and nullable finite `expiry_retry_after`. After a failed acceptance rollback, the expiry adapter uses a separate locked transaction to schedule exponential cooldown with jitter and a 30-second maximum. It rechecks IN_PROGRESS and skips concurrent locks/winners. Metadata never changes business state/revision/answers/event identity. Only the expiry role receives column UPDATE; runtime cannot update retry metadata. Claims ignore cooling rows; the backlog count includes them. Persisting two bounded fields avoids a retry table, extra queue/cache or cleanup capability and survives worker replacement.

The correction to historical deadline-lag labels and current diagnostics is documented in the expiry runbook: `submitted_at - deadline` measures acceptance, whereas the optional post-UoW observer records calibrated COMMIT acknowledgement at the caller. Neither is a physical WAL timestamp, SQS delivery or result latency.

## Catalog publication and projection diagnostics — 2026-10-07

[Fix closure](catalog-fixes-2026-10-07.md) resolves authoritative DB time after exam/question serialization locks before publication eligibility. Version/snapshot/current pointer/audit/receipt remain one transaction. Initial/republish lock-close and timeout rollback/retry pass with real connections; no driver leaks into business layers. Catalog lock statements now use the existing lock.acquire observation label, so actual statement round trips are distinguishable without changing locks or grants.

[Exact-query diagnostic](evidence/catalog-fixes-2026-10-07/diagnostic/README.md) captures adapter SQL and bindings for in-memory EXPLAIN ANALYZE/BUFFERS; exported plans omit SQL/parameters/content.25 publication windows measure425 statements,25 transactions and75 lock observations;50 read calls execute50 projection statements. Read transactions are absent/null; pool occupancy is sampled, not a saturation/utilization measurement. All9 source/built migration hashes match the independent review baseline;0001–0008 also matchHEAD. Full PG/SMTP regression83 PASS. Large datasets, RDS, pool sweep and capacity/cost acceptance remain pending.

## Assessment retention —2026-10-09

[ADR-011](adr/011-assessment-retention-compaction.md)/
[runbook](runbooks/assessment-retention.md) document forward0017, purged marker,
deferred trigger and exact3 maintenance RPCs. Administrator bootstrap creates
NOLOGIN examination_assessment_maintenance; provision a separate LOGIN with only
that membership and CONNECT. db:local does not create its LOGIN. API/grader/
recovery cannot invoke purge. Maintenance cannot directly read/delete business
tables, Identity or Catalog keys. Fixed age/delivery/grace/failure checks are
revalidated after attempt lock. Nonfinite completion metadata yields no eligible
facts, even for a direct authorized RPC. Function-scoped UTC keeps calendar arithmetic
equal to absolute7×24hour retention regardless of caller timezone/DST. No broad
grant fixes are used.

Payload/result/statistics/leaderboard/marker/audit commit together; per-tick receipt
prune and per-attempt UoWs are separate. Compact attempt/inbox identity remains
for quota/duplicate fencing; Catalog references therefore remain. Due discovery
uses a partial age index and SKIP LOCKED, but blocked candidate scans still need
measurement/timeouts. Local full regression is evidence of correctness, not
optimal indexes, RDS utilization/cost or scheduler sizing. The development DB
was not migrated. Enable only after all API/source/DLQ versions support compaction.
