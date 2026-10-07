# Database migration and application rollback

Status: runbook delivered; **DB-12 image compatibility drill NOT EXECUTED**. API/email-worker composition roots exist locally; old/new application images and their compatibility drill remain pending. Technical migration tests do not stand in for old/new runtime validation.

Placement implemented: [ADR-006](../adr/006-source-layout-normalization.md)/N-09 stores source SQL at `apps/api/src/infrastructure/database/migrations`, copied to `dist/infrastructure/database/migrations` during build. The CLI resolves this bundle relative to its compiled location, independent of working directory. Eight checksums, fresh apply and already-migrated rerun passed locally. Preserve SQL schema/history/roles; a folder move does not create a new migration. DB-12 image compatibility drill remains pending.

## Initial local bundle

Bootstrap roles/extension as administrator; migrate with a separate login allowed SET ROLE examination_owner. Runtime only inherits examination_runtime. Keep PUBLIC CREATE revoked. Use `npm run db:local` and `npm run db:migrate:local` locally. Production uses secret-managed migration login in a one-shot deployment task, not API startup and not a runtime secret.

0009 is an additive Catalog column, not a rewrite of 0001–0008. Apply it with the same owner migration login. On a database that already has bank rows, the file backfills null points to 1 and then sets NOT NULL and the 1–1000 check. Fresh databases receive the column before any Catalog insert. Do not edit 0001–0008 to add the column. No browse index was added: a 7-row disposable EXPLAIN showed index scans plus an in-memory sort, and that sample is not a before/after capacity result. See [Catalog diagnostic](../evidence/catalog-2026-10-07/README.md).

0001–0006 is the initial pre-production schema bundle. Files become immutable after application; add a new numbered file for every change. 0005 adds required frozen category and intentionally fails if pre-0005 publication rows exist: earlier storage cannot recover original historical category from a later draft. If that occurs in a development database, preserve/export the data and establish authoritative category provenance before writing an explicit correction migration; do not guess or overwrite checksum history. This is not an upgrade path for a deployed old application.

Runner uses one bounded connection, a session advisory lock across the migration series, contiguous ordering from0001, SHA-256 source checksums and applied-prefix verification. Each file's SQL and migration receipt commit atomically; failure rolls back that file, preserves earlier committed files and releases the lock. Retrying a repaired **unapplied** file is allowed. Missing/changed/reordered applied files fail closed. Runner guard rejects top-level transaction/session commands; reviewed files remain trusted code, not arbitrary untrusted SQL input. Short statement/lock bounds can abort migrations; inspect restricted diagnostics rather than extending timeouts without a plan.

## Production expand/contract procedure (pending execution)

1. Record release IDs/image digests, migration hashes, affected ports/projections/event schemas, observed row counts and baseline plans/latency/pool/lock/WAL. Verify backup/PITR and maintenance connectivity. Name the compatibility window and rollback deadline.
2. Expand with additive nullable columns/tables and explicit grants; preserve old reads/writes/defaults. Review lock modes and table size. For large indexes use a separately reviewed concurrent-index procedure: CREATE INDEX CONCURRENTLY cannot run inside this runner's atomic file transaction. Do not hide nontransactional DDL in an ordinary migration.
3. Backfill with restartable keyset batches, short transactions, measured rate/WAL/replication impact and recorded high-watermark; verify counts/checksums and new invariants. Add NOT VALID constraints where appropriate and validate separately under measured lock budgets.
4. Deploy a new image that reads both shapes, switching writers only after compatibility checks. Measure legitimate traffic and business correctness throughout a mixed deployment. API and worker may roll independently; retain SQS/event compatibility and old message fixtures.
5. After all old tasks/jobs/readers are gone and the rollback window expires, switch reads to the new shape, then contract in a later migration. Remove unused columns/indexes/grants only with evidence. Never drop data in the expand release.

## Required image compatibility drill

- Launch the previous API/worker images against the old schema and produce real authenticated attempts/receipts/outbox/results.
- Apply expansion while traffic runs; both old and new images must read/write, save/submit races remain correct and worker redelivery preserves one result/projection effect.
- Mix deployments and drain old workers; validate queries/envelopes/events and accepted ACK durability.
- Roll application images back while retaining the expanded schema; replay outstanding old/new messages and reconcile persisted state. Re-run SLO/correctness/security gates, including deployment connection surge.
- Exercise a failed migration, aborted deployment and invalid concurrent index cleanup. Record timings/metrics/configuration/raw output and reviewer decision in an experiment. Only then tick DB-12.

## Incident/rollback

Stop the deployment on migration failure; do not deploy an image requiring unavailable schema. Check health, migration receipt/hash and lock activity through the operator role. Restore the last known application image only if that digest is compatible with the currently expanded schema. Never automatically run down migrations or restore a backup to undo a release containing acknowledged writes. Prefer a reviewed forward correction. A data restore is the separate disaster-recovery process, with RPO/RTO and privacy-ledger reconciliation verified before reopening traffic; no restore drill has run yet.

If COMMIT acknowledgement is lost, outcome is uncertain: inspect the durable schema_migrations receipt using a new bounded connection, then rerun idempotently. Do not infer failure from a network timeout. A terminating client/advisory lock releases on disconnect; verify rather than killing unrelated sessions. All operator actions must be audited through the deployment/operations process once implemented.
