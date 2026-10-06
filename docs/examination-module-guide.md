# Examination module guide

This specializes the illustrative [.ai/module-template.md](../.ai/module-template.md), without replacing the architecture contract.

| Capability | Owns | Write invariants | Read projections | Public boundary |
| --- | --- | --- | --- | --- |
| Identity | User, Role, permissions, Session | unique normalized identity, secure hash, session rotation/revocation | principal/session metadata, admin identity views | authenticate/authorize capability, no exported repository |
| Catalog | Exam, ExamSection, Question, QuestionOption, ExamQuestion published snapshots | publication completeness, open/close/duration validity, immutable published versions | catalog/detail/question projections without keys | published policy/version, frozen candidate page and trusted grading snapshot capabilities for Assessment |
| Assessment | ExamAttempt, AttemptAnswer, ExamResult, Leaderboard, question statistics | ownership, attempt limit, deadline, answer version, submit/result idempotency | resume/status/result/history/ranking | candidate use cases and grading command |
| Reporting | operational/business read contracts | no business writes | active candidates, submissions/scores/question stats/audit/system summaries | read-only admin queries with permission/data scope |

AuditLog/outbox/inbox/pool/queue/cache/telemetry are technical mechanisms, not per-table business modules. Audit port participates in admin mutation transactions. Result/leaderboard/statistics initially share Assessment ownership; split capabilities only with a demonstrated lifecycle/ownership requirement and explicit event/projection freshness.

Use case specification before writing code: actor/permission, READ or WRITE, owning capability, input/result/error contract, invariant, UnitOfWork boundary, stable lock order, idempotency key/fingerprint/retention, public cross-module call, outbox/inbox requirement, deadline/time source, query/round-trip budget, failure/retry/observability policy and tests. No every-layer scaffold by default.

A complex Assessment command uses Domain and ports. A simple Catalog list uses a query port and SQL projection. Infrastructure resolves the active transaction client at call time. Nest composition binds plain application classes to ports; decorators stay out of business code. Queue and scheduler inbound adapters validate a message and call an application use case.

Current implementation includes PostgreSQL/UoW foundation, pure Attempt/scoring helpers, Identity application/SQL/crypto/HTTP adapters and API/email-worker roots. Identity owns verification challenges/email intents as a distinct durable delivery mechanism; the attempt-specific platform outbox is not reused. Actual Identity tests cover session/activation/receipt races, role boundaries and local mail. Catalog/Assessment persistence flows, scoring queue worker and Reporting remain pending; pure Assessment helpers do not prove system submission correctness.

Current folders before the ADR-006 transition use: business `application/ports`, `domain/errors`, `infrastructure/{persistence,security,mail,http}`, `presentation/http/dto`; technical platform has its own application/domain/infrastructure/presentation. Platform must not import a business module. Presentation uses an inbound HTTP-session port; only composition factories bind its infrastructure adapter. Global response interceptor leaves success errorCode/message null; error mapping uses semantic DomainError categories. See [Phase04 review](phase-04-review.md).

Target structure is architecture §5: `config/shared/modules/infrastructure/workers`. Aggregate write repository ports live in module Domain; read/technical workflow ports in Application; shared/common is outer Nest/HTTP code. Typed config separates secret I/O; global infrastructure cannot import business modules. Worker roots call public module worker factories/capabilities, not exported repositories. Keep Identity-owned crypto/mail/persistence inside Identity. [ADR-006](adr/006-source-layout-normalization.md), [mapping/checklist](architecture-normalization-plan.md) and [API review](api-architecture-review.md) distinguish accepted placement from pending runtime.

Product/public contracts are in [product specification](product-specification.md), [permissions](security-and-permissions.md), [OpenAPI/events](contracts/README.md) and [SLO/workload](slo-and-workload.md). Catalog snapshot capabilities do not expose private repositories; Assessment authorizes its owned attempt before candidate page access, and grading-key capability never reaches a candidate DTO. Reporting declares read-only source columns and scope separately from these public write boundaries.
