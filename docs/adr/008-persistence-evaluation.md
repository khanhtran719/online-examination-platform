# ADR-008: Retain pg after scoped TypeORM/Sequelize evaluation

Status: accepted for the current Identity runtime,2026-10-07. Supersedes the unmeasured persistence proposal in ADR-001/006; Architecture Contract boundaries remain unchanged. This is not selection of an AWS performance/cost winner.

## Context and evidence

The user asks for TypeORM/Sequelize evaluation before expanding implementation. [Protocol, comparison and reproduction](../../experiments/persistence-comparison/README.md) retain source/config/migration digests,100,000-user Identity dataset,75 interleaved configurations,76,800 operation samples, cold processes, SQL/query/pool/lock/transaction/CPU/RSS observations and audit findings. pg8.23.1, TypeORM1.1.1 and Sequelize6.37.8+uuid11.1.1 were executed on Node24.17/ARM64 with actual compiled Nest/Identity classes. ORM raw and mapped paths were separated.42 experiment tests and153 existing runtime/unit/tooling cases passed locally; one pg drain defect was reproduced and fixed.

At concurrency32/pool4, median-of-run profile p95 is63.17ms pg,60.13 TypeORM raw,63.11 TypeORM mapped,59.12 Sequelize raw and68.30 Sequelize mapped. All use10 driver queries including transaction control. Profile CPU ms/op is0.929/1.009/1.185/1.233/1.467 respectively. Cold RSS is63.30/80.31/86.77MiB for pg/TypeORM/Sequelize. Raw ORM paths are viable and some measured latencies are lower; noisy short closed-loop runs do not establish sustainable capacity, causal speed gains or AWS savings.

## Decision

Retain parameterized pg repositories/query adapters and the current SQL migration toolchain. Do not add TypeORM/Sequelize to the root runtime package. Keep the experiment isolated with its own package/lockfile. Correct pg close semantics: stop new admissions, drain already admitted active/queued work, then end the pool. No HTTP/event/schema/migration/permission change is required.

Reasons are specific to current paths: both ORMs preserve query count but still need custom operational UoW/context controls and mostly explicit session/projection/rate/audit/receipt SQL. Mapped paths show higher CPU/footprint; no measured maintenance/TCO reduction offsets a full Identity/worker/operator conversion yet. TypeORM is the first viable alternative for a future CRUD-heavy capability with demonstrated maintenance benefit; raw projections remain allowed. Sequelize needs scoped dependency remediation, structured/redacted rollback diagnostics and connection-lifecycle controls before production consideration. No generic ORM ban is introduced.

## Architectural conditions and adoption gate

An ORM must implement existing ports; entities/managers/builders/SQL stay in owned Infrastructure. Application sees UnitOfWork without manager arguments. Resolve the active manager each call, nested work joins rollback-only, and raw SQL/audit/receipt uses the same ORM connection and pool. Preserve bounded acquisition/admission/timeouts/drain, PostgreSQL authority/locks/current permissions, idempotency and safe errors. Synchronize/automatic migration execution remain disabled; eight checksummed SQL migrations remain authoritative.

Before later adoption, implement strict TypeScript adapters, faithful nullable/type mapping, whole Identity/foundation/worker/operator regressions, crash/logging/timeout/cookie tests and paired workload measurements. Then convert one slice followed by the remaining coherent persistence composition, never split a UoW across independent pg/ORM pools. Roll back the compatible image/configuration; this evaluation creates no data migration to reverse.

## Limits and reopening criteria

100,000-user Identity data is not the full exam dataset; no hot exam endpoints, scoring worker, k6 saturation, optimal DB pool, x86_64/Linux image, HTTPS browser, RDS failover/restore or AWS cost curve was measured. Runtime RPS/USD, allocation/request, container sizing and future developer hours remain unknown. Production feasibility controls are not waived by local passes. Reopen when CRUD maintenance data/team needs or a broader same-workload AWS/TCO comparison shows a net benefit while every hard gate passes.

The official [TypeORM QueryRunner](https://typeorm.io/docs/query-runner/) and [data-source options](https://typeorm.io/docs/data-source/data-source-options/), [Sequelize transactions](https://sequelize.org/docs/v6/other-topics/transactions/) and [raw queries](https://sequelize.org/docs/v6/core-concepts/raw-queries/) guided implementation. Library documentation establishes available APIs; local raw artifacts supply the measurements.
