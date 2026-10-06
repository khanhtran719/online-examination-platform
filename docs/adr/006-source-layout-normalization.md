# ADR-006: Adopt the revised source placement guide

Status: **accepted for documentation and target placement**, following the user request on 2026-10-06. Runtime relocation is pending. This supersedes the `platform/` source placement in ADR-001 and the previous architecture §5; it does not change database ownership or select an ORM.

## Context and decision

The user supplies `src/{config,shared,modules,infrastructure,workers}` as the target. In this repository, `src/` means `apps/api/src/`. The backend remains one modular monolith with independent API and worker processes. Repository-level `apps/web`, `infra`, `experiments`, `load-tests`, `scripts` and integration tests retain their responsibilities.

Adopt the tree in architecture §5 as a placement guide. Invoice/POS names illustrate capability modules; the actual capabilities remain Identity, Catalog, Assessment and Reporting. Kafka/Redis folders and TypeORM filenames are conditional integrations/examples. Do not create empty modules, generic base classes, pagination frameworks or integrations merely to reproduce the tree.

- `shared/domain` contains only framework-independent concepts already shared by capabilities; `shared/application` contains plain ports, UnitOfWork and reusable application contracts. Owned business policies stay in their module.
- `shared/common` contains reusable Nest/transport helpers. Domain and Application cannot import it, directly or through barrels. The word `shared` does not permit framework dependencies in business code.
- Aggregate write repository ports live in `modules/<capability>/domain/repositories` and use domain models. Projection/query and technical workflow ports live in `application/ports`. A mixed interface must be classified before moving; a domain port cannot import application crypto/DTO types.
- `config` owns typed settings, validation and Nest config wiring. Secret file/provider I/O lives in infrastructure security/integration adapters and is composed at startup. Application receives plain settings/capabilities rather than reading environment/config implementations.
- Global `infrastructure` implements reusable technical ports, independent of business modules. Module-owned persistence, crypto/session policy and email delivery adapters remain inside Identity. Worker roots import public worker factories/capabilities; global infrastructure never imports private business code.
- A business-facing outbox port belongs to `shared/application/ports` or its owning module's `application/ports`. `infrastructure/outbox/outbox.port.ts`, if needed, is an infrastructure-internal relay/storage contract. Its position in the supplied tree does not authorize Application → Infrastructure imports.
- `workers` contains entry points, queue/scheduler adapters, process lifecycle and runtime composition. Email/scoring/reconciliation business decisions remain in owning module Application/Domain. Create an email/outbox worker for the present requirement and SQS adapters when scoring is implemented; Kafka remains unselected.

## Transition and safeguards

Current implementation still uses `platform/`, root `worker.ts` and `apps/api/migrations`. The explicit transition is limited to the files mapped in the [normalization plan](../architecture-normalization-plan.md). No new `platform` files may be added. Finish N-04–N-12 before continuing Catalog work; retain checks for both layouts during moves, then reject legacy placement. Do not allow boundary exceptions merely because a file is being relocated.

SQL schema `platform` remains technical database storage. Moving folders does not rename schemas/tables/roles or rewrite the eight applied migrations. Migrations ultimately move to `apps/api/src/infrastructure/database/migrations`, preserving names, contents, checksums and deployment behavior. CLI/build/test/container paths must change together; the runtime artifact must contain the immutable SQL bundle.

Structure normalization and ORM evaluation are separate increments. `pg` remains the current implementation until the persistence decision gate. If TypeORM is adopted, its entities/mappers/repositories and QueryRunner/transaction context stay in Infrastructure; all transactional calls use one active manager/connection, including raw SQL projections and audit/receipts. Keep synchronize disabled and one authoritative migration history. Do not create two independent pools for one transaction.

## Consequences and acceptance

The layout aligns shared contracts, Nest helpers and technical mechanisms with explicit dependency rules. File moves have no demonstrated performance improvement. The real risk is broken compiled paths, detached transaction calls, missing migration assets or excessive public module exports; the plan includes checks for each.

Rollback restores the preceding code/configuration artifact, without reversing database migrations for a folder change. Acceptance requires boundary tests, unchanged HTTP/security behavior, real PostgreSQL races/privilege tests, actual API/worker smoke/drain and a comparable local diagnostic. AWS SLO/cost claims remain unmeasured.
