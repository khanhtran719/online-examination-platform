# ADR-006: Adopt the revised source placement guide

Status: **accepted and implemented locally**, following the user request on 2026-10-06. All twelve normalization gates are complete; AWS production acceptance remains separate. This supersedes the `platform/` source placement in ADR-001 and the previous architecture §5; it does not change database ownership or select an ORM.

## Context and decision

The user supplies `src/{config,shared,modules,infrastructure,workers}` as the target. In this repository, `src/` means `apps/api/src/`. The backend remains one modular monolith with independent API and worker processes. Repository-level `apps/web`, `infra`, `experiments`, `load-tests`, `scripts` and integration tests retain their responsibilities.

Adopt the tree in architecture §5 as a placement guide. Invoice/POS names illustrate capability modules; the actual capabilities remain Identity, Catalog, Assessment and Reporting. Kafka/Redis folders and TypeORM filenames are conditional integrations/examples. Do not create empty modules, generic base classes, pagination frameworks or integrations merely to reproduce the tree.

- `shared/domain` contains only framework-independent concepts already shared by capabilities; `shared/application` contains plain ports, UnitOfWork and reusable application contracts. Owned business policies stay in their module.
- `shared/common` contains reusable Nest/transport helpers. Domain and Application cannot import it, directly or through barrels. The word `shared` does not permit framework dependencies in business code.
- Aggregate write repository ports live in `modules/<capability>/domain/repositories` and use domain models. Projection/query and technical workflow ports live in `application/ports`. A mixed interface must be classified before moving; a domain port cannot import application crypto/DTO types.
- `config` owns typed settings, validation and Nest config wiring. Secret file/provider I/O lives in infrastructure security/integration adapters and is composed at startup. Application receives plain settings/capabilities rather than reading environment/config implementations.
- Global `infrastructure` implements reusable technical ports, independent of business modules. Module-owned persistence, crypto/session policy and email delivery adapters remain inside Identity. Worker roots import public worker factories/capabilities; global infrastructure never imports private business code. Public composition factories are for main/module/factory/worker composition roots; controllers consume Application capabilities rather than those factories.
- A business-facing outbox port belongs to `shared/application/ports` or its owning module's `application/ports`. `infrastructure/outbox/outbox.port.ts`, if needed, is an infrastructure-internal relay/storage contract. Its position in the supplied tree does not authorize Application → Infrastructure imports.
- `workers` contains entry points, queue/scheduler adapters, process lifecycle and runtime composition. Email/scoring/reconciliation business decisions remain in owning module Application/Domain. Create an email/outbox worker for the present requirement and SQS adapters when scoring is implemented; Kafka remains unselected.

## Transition closure and safeguards

The [normalization plan](../architecture-normalization-plan.md) records the completed mapping and N-01–12 evidence. Source/build no longer use the legacy `platform/` tree or root worker/operator files. Guards retain regression fixtures for old and new boundary bypasses and reject legacy source placement. Shared/config/global infrastructure cannot import business modules; business layers cannot import shared/common/config/workers. Explicit public module composition factories are the worker/operator boundary.

SQL schema `platform` remains technical database storage. Moving folders does not rename schemas/tables/roles or rewrite the eight applied migrations. Migrations now live in `apps/api/src/infrastructure/database/migrations`, preserving all eight names, contents and checksums. CLI/build/test/script paths were updated together; the compiled artifact contains the immutable bundle. Actual CLI fresh apply and a rerun from `/tmp` passed. Linux container compatibility/deployment drill remains DB-12.

Structure normalization and ORM evaluation are separate increments. `pg` remains the current implementation until the persistence decision gate. If TypeORM is adopted, its entities/mappers/repositories and QueryRunner/transaction context stay in Infrastructure; all transactional calls use one active manager/connection, including raw SQL projections and audit/receipts. Keep synchronize disabled and one authoritative migration history. Do not create two independent pools for one transaction.

## Consequences and acceptance

The layout aligns shared contracts, Nest helpers and technical mechanisms with explicit dependency rules. File moves have no demonstrated performance improvement. The real risk is broken compiled paths, detached transaction calls, missing migration assets or excessive public module exports; the plan includes checks for each.

Rollback restores the preceding code/configuration artifact, without reversing database migrations for a folder change. Acceptance requires boundary tests, unchanged HTTP/security behavior, real PostgreSQL races/privilege tests, actual API/worker smoke/drain and a comparable local diagnostic. AWS SLO/cost claims remain unmeasured.

## Implementation evidence and mapping correction

Identity write repository uses plain domain persisted types; principal and CSRF projections use `IdentityQuery` in Application. Both adapters resolve the same transaction executor, preserving profile re-auth/audit/receipt atomicity without another pool or query. Typed validation lives in config; secret/CA I/O stays in infrastructure. Module-owned PostgreSQL/security/mail adapters retain ownership. No unused ConfigModule, generic mapper/base class or integration was added.

The initial operator mapping to global `infrastructure/security/authorization/operator-admin.ts` would require global infrastructure to import a business capability, conflicting with its dependency rule. The actual entry point is `workers/operator/operator-admin.main.ts`, composed through `identity-operator.factory.ts`; reusable security persistence remains global. This correction follows the supplied tree's placement-guide principle and is reflected in the mapping/checklist.

Acceptance evidence:100 unit/tooling +52 actual PostgreSQL/HTTP/SMTP integration cases, lint/typecheck/build/quality/contracts, eight source/built checksum matches, API/worker readiness and SIGTERM, and actual operator CLI with three audited actions plus repeated-bootstrap rejection. [Experiment](../../experiments/architecture-normalization/README.md) records three before/three after local diagnostics, unchanged query counts, latency increases on some API paths and measurement limits. The decision accepts structural/correctness normalization; it claims no performance/cost improvement. ORM evaluation0/4, browser HTTPS/live SES and AWS SLO/cost/recovery evidence remain pending.
