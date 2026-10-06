# Online Examination Platform Overview

This file is a navigation map. Normative boundaries and flows live in [architecture](architecture.md), enforceable constraints in [rules](rules.md), code shape in [conventions](conventions.md), and execution process in [workflow](workflow.md). [AGENTS.md](../AGENTS.md) defines precedence.

Placement: [architecture §5](architecture.md#5-target-project-structure) adopts backend `config/shared/modules/infrastructure/workers`. [ADR-006](../docs/adr/006-source-layout-normalization.md) and the [normalization checklist](../docs/architecture-normalization-plan.md) record the explicit pending runtime transition; [API review](../docs/api-architecture-review.md) records findings and the unmeasured ORM comparison.

Target: one modular monolith, independent API/worker scaling, business capabilities Identity, Catalog, Assessment and Reporting. Presentation → Application → Domain/Ports; Infrastructure implements ports. PostgreSQL owns durable state. DDD-lite protects attempt/publication invariants; CQRS-lite allows optimized read projections. No per-table modules or distributed services by default.

Writes use UnitOfWork and transaction context. Submission + outbox commit together. SQS delivery is at least once; inbox + grading/result/projection commit before acknowledgement. Redis and Kafka are optional integrations requiring evidence. Schema evolution uses versioned SQL migrations; rules remain independent of `pg`/TypeORM adapters.

API bodies use `{data,errorCode,message,status}`; cursor lists add `{next,pageSize}` metadata under ADR-002. `/live` and `/ready` are operational responses outside the envelope. Correlation IDs live in headers/logs.

Optimize performance/cost subject to correctness, security, durability, SLO and capacity. [Performance protocol](../docs/performance.md) defines measurements. [Roadmap](../docs/implementation-roadmap.md) records completed and pending work. [Acceptance ledger](../docs/production-acceptance.md) separates targets from verified production evidence. [Project profile](../docs/project-profile.md) records project decisions and current state. [Module template](module-template.md) remains illustrative; the [examination guide](../docs/examination-module-guide.md) adapts it to actual capabilities.
