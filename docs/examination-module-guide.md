# Examination module guide

This specializes the illustrative [.ai/module-template.md](../.ai/module-template.md), without replacing the architecture contract.

| Capability | Owns | Write invariants | Read projections | Public boundary |
| --- | --- | --- | --- | --- |
| Identity | User, Role, permissions, Session | unique normalized identity, secure hash, session rotation/revocation | principal/session metadata, admin identity views | authenticate/authorize capability, no exported repository |
| Catalog | Exam, ExamSection, Question, QuestionOption, ExamQuestion published snapshots | publication completeness, open/close/duration validity, immutable published versions | catalog/detail/question projections without keys | exam policy/version capability for Assessment |
| Assessment | ExamAttempt, AttemptAnswer, ExamResult, Leaderboard, question statistics | ownership, attempt limit, deadline, answer version, submit/result idempotency | resume/status/result/history/ranking | candidate use cases and grading command |
| Reporting | operational/business read contracts | no business writes | active candidates, submissions/scores/question stats/audit/system summaries | read-only admin queries with permission/data scope |

AuditLog/outbox/inbox/pool/queue/cache/telemetry are technical mechanisms, not per-table business modules. Audit port participates in admin mutation transactions. Result/leaderboard/statistics initially share Assessment ownership; split capabilities only with a demonstrated lifecycle/ownership requirement and explicit event/projection freshness.

Use case specification before writing code: actor/permission, READ or WRITE, owning capability, input/result/error contract, invariant, UnitOfWork boundary, stable lock order, idempotency key/fingerprint/retention, public cross-module call, outbox/inbox requirement, deadline/time source, query/round-trip budget, failure/retry/observability policy and tests. No every-layer scaffold by default.

A complex Assessment command uses Domain and ports. A simple Catalog list uses a query port and SQL projection. Infrastructure resolves the active transaction client at call time. Nest composition binds plain application classes to ports; decorators stay out of business code. Queue and scheduler inbound adapters validate a message and call an application use case.

Current implementation is limited to pure Attempt lifecycle and exact-match scoring helpers. There is no persistence/authorization/queue/runtime yet. Those helpers do not prove system idempotency or concurrency correctness.
