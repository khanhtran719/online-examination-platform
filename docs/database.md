# PostgreSQL implementation

Scope: DB-01–11 foundation plus Phase04 Identity adapters/operations. PostgreSQL17, parameterized pg infrastructure (ADR-001). Eight migrations applied local; Identity real-PG/HTTP/retention tests and [local diagnostic](../experiments/identity-local/README.md) exist. Catalog/Assessment persistence flows/AWS saturation remain pending. [Foundation review](phase-03-review.md), [Identity review](phase-04-review.md), [migration runbook](runbooks/database-migrations.md), [decision](adr/004-postgresql-durability.md).

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
| assessment | attempts, answers, normalized selections, results/sections/question detail, ranking/statistic projections | one active candidate/logical exam across versions; ownership/version composite FKs; unique submission/event IDs; positive answer version; immutable accepted submission; results unique per attempt; exact integer basis points; completion/result deferred integrity |
| platform | migration receipts, actor/key receipts, outbox, inbox, quarantined jobs, append-only audit, bounded rate buckets, import reports | checksum history; globally actor-scoped key uniqueness; consumer/event uniqueness; leases paired; payload/report size limits; DML grants by table/column |

The initial six migrations delivered34 tables including history. 0007 expands Identity with challenges/email intents/operator bootstrap/request limits and session/user metadata;0008 adds maintenance/privileges/operational functions. No per-table modules or cross-module repository access. Bank provenance is scalar historical identity/revision, not a cascading FK to mutable content. Candidate projections explicitly select authorized columns; separate key tables do not substitute authorization. Reporting remains specified, not implemented.

Frozen publication INSERTs are assembled in one transaction. A server-owned xid8 marks that transaction; child insertion guards reject later append. Runtime has SELECT/INSERT only on snapshots. A deferred constraint validates nonempty sections, total bounds, option count, key membership/cardinality and type at commit. Published metadata, including category, comes from the snapshot, not the draft. Publication trigger/validation queries are internal server work that must be included in future profiling. No optimization benefit is claimed for these guards: they protect correctness.

PROCESSING is transaction-local. Deferred constraints reject a commit leaving PROCESSING, a COMPLETED attempt without result, or a result without COMPLETED. The worker must finish both in its UoW; a lease model would require a reviewed migration/ADR. Stable accepted submitted_at/submission_id/event_id/expired cannot change. Runtime cannot change attempt owner/exam/version/start/deadline, answer membership or outbox payload/identity. Audit, results, inbox and receipt identities are append-only for runtime. Retention is a future audited maintenance capability with ordered FK-safe batches; runtime has no blanket purge permission.

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
| Deadline sweep | attempts_deadline(deadline,id) WHERE IN_PROGRESS; bounded SKIP LOCKED batches in future adapter |
| Candidate history / admin submissions | attempts_history(user_id,started_at DESC,id DESC); attempts_admin(version_id,started_at DESC,id DESC) |
| Answer save / load | answers PK(attempt_id,question_id), selections PK prefix; attempt PK row lock |
| Result / ranking | result attempt PK, completion_sequence unique; leaderboard_order(version_id,earned DESC,submitted_at,attempt_id) INCLUDE user/sequence |
| Receipt replay / retention | receipt actor/key PK; receipts_retention |
| Outbox / inbox | outbox_ready partial available_at/created_at/event; lease/deadline filter checked at claim; outbox_aggregate; inbox consumer/event PK + inbox_attempt |
| Session / RBAC / operations | unique credential hashes; families by user; sessions_by_family/retention; role assignment reverse index; audit actor/resource/time; bucket expiry; import actor cursor |
| Identity verification / delivery | unique token hash; email-ready partial lease/available index; pending-account/material/metadata retention indexes; sessions by signing kid/family for incident revoke |

Actual adapter query plans, index selectivity/write overhead, cross-version rank/opt-out filtering and saturation require the large dataset and experiments. Small fixture success is not evidence of optimal index choice. No partitions, RDS Proxy, PgBouncer or Redis are added.

## Pool and transaction contract

The plain application port exposes only `transaction(() => Promise<T>)`. One shared PostgresDatabase infrastructure instance resolves the AsyncLocalStorage client at every query. Joined work reuses that connection; joined business/SQL errors mark rollback-only even when caught. Outer work cannot return a successful commit after rollback. Parallel request contexts do not share clients. Ended contexts reject detached work; pending unawaited queries force rollback. Every adapter/use case must await its work. No automatic transaction retry: retries require use-case idempotency and a bounded policy.

Defaults are **local candidates**, not selected production capacity: max10 connections, max20 queued admissions, acquire/connect1000ms, statement2000ms, lock500ms, idle transaction5000ms. Admission rejects excess immediately; pg bounds both connect and queued acquisition. A checkout can hold a transaction only while the owned callback runs; external I/O is forbidden. Server idle timeout protects database locks/connections, not hung JavaScript callbacks; API/worker orchestration will need its own cancellation/drain limits. TLS in production is explicit with certificate/hostname verification; URL query overrides are rejected. synchronous_commit=on is explicit; infrastructure resilience/backups still require AWS tests.

Connection gate:

`required = API maxTasks×pool + worker maxTasks×pool + rolling/scheduled surgeTasks×largest applicable pool + migration + reserved`

Use real RDS SHOW max_connections including superuser/reserved/monitoring/maintenance connections, maximum autoscaling limits and deployment surge for both services. Reserve includes failover/recovery access; do not consume it as ordinary traffic. The checked local example has max100, required56, remaining44; these are arithmetic limits, not utilization measurements or an AWS sizing decision. Production file/deployment gate remains to be wired in Terraform/CI. Optimize pool via measured sweep before raising RDS size.

## Observability and redaction

The adapter emits bounded-label observations for checkout, SQL elapsed time, lock-acquisition statement elapsed time, transaction elapsed/rollback and pool counts/errors. Lock elapsed includes network/server work; it is not an exact decomposition of pure server lock wait. Operator wait_event/pg_locks diagnostics complement it. SQL text, parameters, raw database messages, row IDs and credentials are absent from observations/errors. Collector failure cannot affect commits. The exporter/correlation/traces/dashboards remain OBS work, not silently enabled by the callback.

Compose enables pg_stat_statements in shared_preload_libraries; privileged provisioning creates the extension and a restricted aggregate view without query text. [Diagnostics SQL](../infra/database/diagnostics.sql) uses query IDs only for restricted analysis, never high-cardinality metric labels. RDS requires parameter group configuration/restart and extension permissions later. Server log parameter limits are administrator settings, not permissions given to runtime. Database server diagnostics can still contain sensitive error text: restrict access/retention and select approved log settings before production; never forward raw SQL/error detail into application logs. No CloudWatch cost or telemetry overhead has been measured.

Implementation references: [PostgreSQL constraints](https://www.postgresql.org/docs/17/ddl-constraints.html), [explicit/advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html), [timeouts](https://www.postgresql.org/docs/17/runtime-config-client.html), [pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html), [pg pool](https://node-postgres.com/apis/pool), [TLS](https://node-postgres.com/features/ssl), [AsyncLocalStorage](https://nodejs.org/docs/latest-v24.x/api/async_context.html). These inform the implementation; local tests supply its evidence.
