# Examination module guide

Reporting business-metrics uses a private Application snapshot/query port and
read-only Assessment attempt columns, with pure count/window/subset validation.
Current Identity access and safe global access audit commit before response. Cohort
current state and global backlog are separate; compact purged completions count,
replay keeps original age, no SQS/HTTP/PII/score join. See [ADR-014](adr/014-business-metrics-snapshot.md)
and [BM-01–06](admin-business-metrics-2026-10-10.md). No public export/new resource.

Reporting's REP-04 Admin best/latest owns private candidate-results DTO/query/
cursor/service, pure reported-score validation, pg/crypto and HTTP adapters.
Declared Catalog/Assessment sources supply eligibility and both selections in one
primary statement. Only Identity's public current-access capability crosses the
service boundary; no private Assessment import or new facade export. Source
schema/selection/retention changes require regression review. See
[ADR-013](adr/013-admin-best-latest-report.md).

Reporting REP-03 adds a private question-statistics Application service/query/
cursor port, pure Domain count validation, pg/crypto adapters and thin HTTP
controller. The query explicitly declares frozen Catalog and Assessment counter
sources; Assessment alone maintains them. Only Identity's public access capability
crosses the service boundary. No new exported facade, repository, business write
or technical integration is introduced. See [REP-03](admin-question-statistics-2026-10-10.md).

Reporting REP-02 owns private submissions/result DTOs, query/cursor ports, plain service, pg/crypto adapters and HTTP controller. No private Assessment imports or additional exported facade. Cross-schema sources are declared in SubmissionsQuery; only technical access audit writes. See [REP-02](admin-submissions-2026-10-10.md).

This specializes the illustrative [.ai/module-template.md](../.ai/module-template.md), without replacing the architecture contract.

| Capability | Owns | Write invariants | Read projections | Public boundary |
| --- | --- | --- | --- | --- |
| Identity | User, Role, permissions, Session | unique normalized identity, secure hash, session rotation/revocation | principal/session metadata, admin identity views | authenticate/authorize capability, no exported repository |
| Catalog | Exam, ExamSection, Question, QuestionOption, ExamQuestion published snapshots | publication completeness, open/close/duration validity, immutable published versions | catalog/detail/question projections without keys | published policy/version, frozen candidate page and trusted grading snapshot capabilities for Assessment |
| Assessment | ExamAttempt, AttemptAnswer, ExamResult, Leaderboard, cursor epochs, question statistics | ownership, attempt limit, deadline, answer version, submit/result idempotency | resume/status/result/history; authorized leaderboard HTTP | candidate use cases/grading command; public Reporting ranking facade for read |
| Reporting | operational/business read contracts | no business writes | public ranking; active candidates, submissions/scores/question stats/audit/system summaries | public ranking facade; read-only Admin queries with permission/data scope |

AuditLog/outbox/inbox/pool/queue/cache/telemetry are technical mechanisms, not per-table business modules. Audit port participates in admin mutation transactions. Result/leaderboard/statistics initially share Assessment ownership; split capabilities only with a demonstrated lifecycle/ownership requirement and explicit event/projection freshness.

REP-01 Admin monitor adds a Reporting-owned thin HTTP controller and private
Application query/service/cursor plus SQL adapter; no additional exported facade
is required because callers stay inside Reporting. Sources are catalog.exams(id)
and assessment.attempts(exam_id/id/user_id/status/started_at/deadline/purged_at).
Read-only business projection and technical audit share a short UnitOfWork with
Identity public revalidation; no Assessment repository or write capability is
imported. ReportingModule still exports only the Candidate ranking capability.
See [scope, freshness and validation](admin-monitor-2026-10-10.md).

2026-10-09 public leaderboard increment: Reporting owns the public Application
ranking facade/query/cursor/alias ports and private read adapters under
[ADR-012](adr/012-public-ranking-projection.md). Assessment authenticates/admits the
HTTP call; no private Reporting service/port/repository crosses that boundary.
Reporting declares fresh primary Identity/Catalog/Assessment read sources, including
Assessment-owned destructive cursor epochs. Later paragraphs retain earlier stage
context; [roadmap](implementation-roadmap.md) is the current delivery source.

Use case specification before writing code: actor/permission, READ or WRITE, owning capability, input/result/error contract, invariant, UnitOfWork boundary, stable lock order, idempotency key/fingerprint/retention, public cross-module call, outbox/inbox requirement, deadline/time source, query/round-trip budget, failure/retry/observability policy and tests. No every-layer scaffold by default.

A complex Assessment command uses Domain and ports. A simple Catalog list uses a query port and SQL projection. Infrastructure resolves the active transaction client at call time. Nest composition binds plain application classes to ports; decorators stay out of business code. Queue and scheduler inbound adapters validate a message and call an application use case.

Current implementation includes PostgreSQL/UoW foundation, pure Attempt/scoring helpers, Identity application/SQL/crypto/HTTP adapters and API/email-worker roots. Identity owns verification challenges/email intents as a distinct durable delivery mechanism; the attempt-specific platform outbox is not reused. Actual Identity tests cover session/activation/receipt races, role boundaries and local mail. Catalog CAT-01–09 is accepted locally after [fix closure](catalog-fixes-2026-10-07.md); CAT-10 needs the actual Assessment start race. Assessment persistence flows, scoring queue worker and Reporting remain pending; pure helpers do not prove system submission correctness. [Assessment core handoff](grok-assessment-core-implementation-prompt.md) defines the next proposed increment without accepting its runtime.

Current Identity placement uses `domain/{entities,repositories,errors}`, `application/{services,dto,ports}`, `infrastructure/persistence/postgres/{repositories,queries,delivery}`, owned `infrastructure/{security,mail,http}` and `presentation/http/dto`. Domain write contracts contain persisted domain types; principal/CSRF queries use a separate application port. Presentation uses an inbound HTTP-session port; only composition factories bind its infrastructure adapter. Global response interceptor leaves success errorCode/message null; error mapping uses semantic DomainError categories. See [API review closure](api-architecture-review.md#7-closure-sau-source-normalization).

Implemented structure follows architecture §5: `config/shared/modules/infrastructure/workers`. Aggregate write repository ports live in module Domain; read/technical workflow ports in Application; shared/common is outer Nest/HTTP code. Typed config separates secret I/O; global infrastructure cannot import business modules. Worker roots call public module worker factories/capabilities, not exported repositories. Keep Identity-owned crypto/mail/persistence inside Identity. [ADR-006](adr/006-source-layout-normalization.md), [mapping/checklist](architecture-normalization-plan.md) and [API review](api-architecture-review.md) record completed placement gates and separate pending ORM/browser/AWS acceptance.

Product/public contracts are in [product specification](product-specification.md), [permissions](security-and-permissions.md), [OpenAPI/events](contracts/README.md) and [SLO/workload](slo-and-workload.md). Catalog snapshot capabilities do not expose private repositories; Assessment authorizes its owned attempt before candidate page access, and grading-key capability never reaches a candidate DTO. Reporting declares read-only source columns and scope separately from these public write boundaries.
