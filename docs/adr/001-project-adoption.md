# ADR-001: Adopt the supplied contract for online examinations

Status: accepted by the project request, 2026-10-06.

The supplied contract contains local POS decisions: three applications, no schema migration program, TypeORM examples and Kafka examples. Those local decisions conflict with the explicitly requested single examination modular monolith, production migrations and AWS SQS. The user also authorizes updating the standards.

We preserve the contract and specialize the local facts: one logical backend, two independently scaled runtimes, Identity/Catalog/Assessment/Reporting capabilities, PostgreSQL SQL migrations, `pg` persistence adapters behind business ports, AsyncLocalStorage transaction context, SQS Standard with DLQ and transactional outbox. Raw parameterized SQL avoids ORM object allocation on hot projections and provides explicit locks/query counts; this is an implementation choice, not a measured performance improvement. Compare before adding TypeORM. Kafka has no required ordering/replay use case here and adds broker operational cost. Redis remains absent until a recorded benchmark or operational requirement justifies it.

Catalog publication freezes question snapshots forever. Unpublishing denies new starts but does not alter an existing attempt. Assessment owns answers, results and leaderboard/statistic projections. Reporting has explicit read-only cross-module SQL permission.

Migrations run before application rolling deployment, under one advisory lock, with checksums. Runtime roles receive DML only. Expand/contract migrations preserve the previous image; data migrations are never automatically reversed.

Default CloudFront hostname avoids requiring a domain for viewer HTTPS. CloudFront VPC origin is a candidate for a private ALB; its supported region/certificate/TLS configuration requires validation. No origin HTTP deployment is accepted as an implicit waiver of the project's TLS requirement. An end-to-end TLS/certificate design remains pending before production acceptance. [AWS VPC origin documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html) describes the private connectivity option; it is not benchmark evidence.

This ADR adopts project-level rules, not a claim that API, worker, SQL adapters or migrations have been implemented. The [roadmap](../implementation-roadmap.md) records actual status.
