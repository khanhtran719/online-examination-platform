# Phase 03 delivery review

2026-10-06. DB-01–11 complete as persistence-foundation deliverables. DB-12 partially delivered: runbook exists; previous/new application image drill remains pending because BOOT-10/CI images do not exist. No background deployment runs. Overall roadmap: 40/212 complete, 172 pending.

| Item | Delivered evidence / verdict |
| --- | --- |
| DB-01 | Six ordered SQL files, 34 tables incl migration history, capability schemas, PK/FK/unique/checks and explicit runtime grants; real constraints/privilege cases PASS |
| DB-02 | Frozen publication/section/question/options/keys; same-transaction seal, deferred completeness; composite attempt/answer/option FK and immutable metadata; foreign membership/snapshot/category tests PASS |
| DB-03 | Query-driven index map in database.md; partial active/deadline/outbox and keyset indexes; inappropriate draft-category index removed. Design implemented, production plans/optimality unmeasured |
| DB-04 | Advisory lock, contiguous source order, SHA-256 checksum/applied-prefix guards and per-file atomic receipt. Concurrent pending migration applied once; changed/missing file/failure rollback/repaired-unapplied retry PASS |
| DB-05 | Owner NOLOGIN + separate restricted migrator/runtime logins; real runtime DDL/history/audit/snapshot/owner escalation denied; local role flags verified |
| DB-06 | Plain application UnitOfWork; pg/AsyncLocalStorage infrastructure resolves active client per call; same backend / parallel context / ended-context checks PASS |
| DB-07 | Joined and caught business/SQL failures cannot commit; pending unawaited query rolls back; PASS |
| DB-08 | Bounded admission, connect/acquire, server statement/lock/idle-transaction limits; actual saturation/timeout/connection replacement PASS. Local defaults are not selected production pool |
| DB-09 | Arithmetic connection-budget function/CLI and local example includes rolling surge/reserved access; required56/max100/headroom44. Production budget wiring/sweep remains later Terraform/performance work |
| DB-10 | pg_stat_statements enabled/provisioned locally; restricted aggregate diagnostics, bounded pool/query/lock/transaction observations and safe errors; redaction/collector failure PASS. Exporter/CloudWatch/traces/correlation remain OBS phase |
| DB-11 | 30 PostgreSQL integration cases through host TCP with actual restricted logins, isolated databases/roles and verified connection cleanup; no skipped tests or driver mocks |
| DB-12 | Runbook COMPLETE; real old/new API/worker image mixed-deployment/rollback drill NOT RUN. Whole item remains unchecked |

Review found and repaired: naive migration guard treated PL/pgSQL BEGIN as top-level control; administrator log settings were initially requested by nonprivileged clients; completion/result and immutable ownership needed stronger enforcement; frozen category was missing; accepted submission identity could be mutated. Regression tests failed for the latter invariant gaps, then passed after added migrations. Initial config test failed before config source existed. A test cleanup forced database termination before server sockets closed; the harness now waits for zero connections, asserts no pool errors and drops without FORCE. These findings were not hidden by skipped cases or permission broadening.

Final verification: 67 unit/tooling tests (47 Jest +20 Node), 30 PostgreSQL integration tests, build/typecheck/lint/quality/contracts pass. Runtime audit reports zero known advisories; full dev audit findings are tracked in validation.md. Main local development DB uses actual migration CLI and contains all six receipts. No application controller/repository/use case, browser, SQS worker, RDS deployment, dataset/benchmark/restore or AWS bill exists. PostgreSQL 17.11/aarch64 local correctness is not a Graviton performance result.

Architectural self-review: no driver/SQL/context enters Application/Domain; no cross-module private repository or invented business module; no external broker/network call inside a business transaction. Platform SQL executor is infrastructure only; future owned adapters bind through business ports. [ADR-004](adr/004-postgresql-durability.md) records schema choices/limits. The 0005 initial-bundle migration fails closed on historical publications rather than inventing category provenance; deployed production upgrades require the pending compatibility drill.

Proceed to Identity (Phase 04) and the necessary API/worker composition-root bootstrap. Real start/save/submit/deadline races remain ATT-10; inbox/worker crash/replay remains ASYNC-11. DB-12 becomes executable after actual old/new images exist; do not block new initial use cases on a nonexistent predecessor image, and do not tick compatibility prematurely.
