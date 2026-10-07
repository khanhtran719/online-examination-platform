# Implementation plan

## Active scope — Catalog fixes and architecture conformance COMPLETE locally, 2026-10-07

User authorizes fixing GR-01–06 from the independent review while following the existing Architecture Contract. Preserve all prior RED/diagnostic evidence, migrations0001–0009, public OpenAPI behavior, pg decision, worktree UI edits and Phase04/production gates.

| Work | Owner / boundary | Invariant / checks |
| --- | --- | --- |
| GR-01 publication | Catalog Application + Domain / repository DB clock and locks | Resolve close eligibility after exam + bank serialization locks; same UoW for version/pointer/audit/receipt. Preserve receipt replay. Real PG lock-close, timeout rollback and republish regressions first. |
| GR-02 HTTP limits | Catalog Presentation declares bounded limits; reusable global HTTP adapter applies generic route metadata | No Catalog URL/policy table in global infrastructure; POST/PUT exam128KiB, question512KiB, import1MiB cover declared limits plus UTF-8/escaped surrogate-pair JSON. Domain/Presentation/import use Unicode code-point limits. Identity default16KiB unchanged. Actual HTTP valid/oversized/security cases. |
| GR-03 read DTO | Catalog query adapter maps exact PublicExam | Cursor sorting field stays inside BrowseRow, never leaks into detail. Validate real response with existing OpenAPI schema. |
| GR-04 calendar | Catalog Domain pure validation | Round-trip UTC components at supported millisecond precision; reject normalized invalid dates, accept valid leap days/fractional precision. Unit and real HTTP cases. |
| GR-05 test discovery | Root Jest configuration/package tooling | Backend Jest, Node scripts and Web Vitest all run in root verification; no removed/disabled tests. |
| GR-06 evidence | Integration-only diagnostic instrumentation / module SQL adapters | EXPLAIN actual captured adapter SQL, separate publish window with real transaction/lock/pool observations, null for absent samples. Unique ignored run output, source/config/migration hashes and summary generated from that run. No raw SQL/parameters/credentials in exported diagnostic. |

Plan: preserve baseline hashes → write/run RED regressions → minimal behavioral/boundary corrections → focused GREEN → complete unit/integration and shared HTTP HTTPS checks → capture fresh diagnostic/evidence → self-review/update status. TDD skill delegates independent publication reproduction tests to a subagent; main agent owns runtime fixes and remaining regression/evidence work. No module/ORM/framework migration or Assessment implementation is required by these fixes.

- [x] F-01: RED regressions for publication/body/schema/calendar and runner scope; Unicode mismatch also reproduced before fix.
- [x] F-02: Fix behavior and keep Presentation → Application → Domain/Ports; pg stays Infrastructure.
- [x] F-03: Diagnostic exact SQL/publish observations, unique output/provenance and metadata correction; new generated summary frozen separately.
- [x] F-04:199 root cases,83 real-PG/SMTP and10 HTTPS PASS; full validation/self-review and evidence restore BOOT-01/CAT-01/03/04/06/08 only. CAT-10/ID-11/production remain open.

[Fix report](catalog-fixes-2026-10-07.md) and [evidence](evidence/catalog-fixes-2026-10-07/README.md) are current closure. Roadmap61/216 checked,155 pending. The prior sections below record historical states before these fixes; they do not override current acceptance.

## Historical scope — Independent Catalog review before fixes, 2026-10-07

User yêu cầu review phần Grok đã chạy. Đối chiếu prompt, source/contract/PG behavior và changes ở shared HTTP/Identity; giữ UI work nguyên. Lượt này chỉ thêm reproduction/evidence/report và sửa status, không triển khai runtime fixes hoặc Assessment.

[Review report](catalog-review-2026-10-07.md) ghi GR-01–06. Bộ review riêng: 5 RED / 1 PASS; 63 integration PASS với diagnostic cũ deselected; 71 API Jest PASS nhưng root runner FAIL, 34 Node và73 Web PASS riêng; 10 HTTPS PASS. Migration0001–0008 giữ bytes,0009 built đúng. Root runner issue tồn tại trước Catalog, vẫn mở lại BOOT-01 để sửa discovery. CAT-01/03/04/06/08 mở lại; roadmap55/216 checked. [Evidence](evidence/catalog-review-2026-10-07/README.md).

- [x] Inspect diff và canonical architecture/product/OpenAPI; xác định review scope/owners.
- [x] Tái hiện trên restricted PostgreSQL/HTTP, kiểm chứng cursor control và shared Identity HTTPS regression.
- [x] Báo cáo findings theo priority, lưu provenance và cập nhật checklist đúng trạng thái.
- [ ] Sửa GR-01–04 với regression tests thật; không tick Catalog vì existing happy-path tests PASS.
- [ ] Sửa GR-05 test discovery và GR-06 diagnostic/provenance; chạy lại review/regressions rồi mới nghiệm thu.

## Prior implementation — Catalog local, 2026-10-07

Phase04 chưa đóng vì ID-11 live SES còn PARTIAL. Increment này chỉ làm Catalog độc lập trên PostgreSQL local: draft/bank, publication bất biến, projection và import v1. Không đóng Phase04, không bỏ gate SES, không làm Assessment lifecycle, scoring/SQS, Reporting, Terraform, magic link, GitHub hay redesign Web. Worktree Web UI chưa commit được giữ nguyên.

Ngoại lệ phạm vi: Catalog không chờ live SES vì không gửi mail và không đọc private repository của Identity. Auth dùng public facade `identity/application/facades/identity.facade` (authenticate, requirePermission, revalidate trong transaction) và request guard bọc HttpSession hiện có. Gap đã đối chiếu, không bịa endpoint: sections/membership chỉ nằm trong `ExamWriteRequest`; không có route section riêng. `QuestionWriteRequest.points` không có cột trên `catalog.questions` (points chỉ ở membership) nên cần migration forward `0009`. Example replace question ghi `expectedRevision: 0` trong khi create mới là revision zero; replace thực thi expectedRevision > 0. Body limit toàn cục 16384 byte không đủ import 1MiB; chỉ route POST import được nâng giới hạn. CAT-10 không tick đủ vì chưa có Assessment start thật.

| Task | Owner | Contract |
| --- | --- | --- |
| CAT-01/02/04 draft | Catalog application + domain write repository | In: `ExamWriteRequest`, session cookie, Idempotency-Key UUIDv7, Origin/CSRF. Out: `MutationReceipt` 201/200. Permission `catalog.manage`. Invariant: revision create = 0 rồi lưu 1; replace khớp revision rồi tăng; section/position/bank question không trùng; draft được rỗng nội dung nhưng schedule bắt buộc. Transaction: exam + sections + membership + audit + receipt. Lock: user → exam → bank question id tăng dần. Idempotency: fingerprint SHA-256, receipt trước revision check, retry cùng payload trả receipt cũ. Query: một statement ghi. Tests: revision race, lost ACK, audit rollback. |
| CAT-03 bank | Catalog | In: `QuestionWriteRequest`. Out: receipt hoặc `AdminQuestion`. Create/replace/archive `catalog.manage`; đọc `catalog.keys.read` và audit-read. Invariant: single một key, multiple tập key thuộc options, true/false đúng hai options và một key; points 1–1000 sau migration; text limits; không HTML trusted. Transaction: question + options + audit + receipt. Lock: user → question. Archive giữ row để draft/snapshot còn tham chiếu. |
| CAT-05 import | Catalog | In: `ImportRequest` schemaVersion 1, ≤100 câu, ≤1MiB, không CSV/URL. Out: `ImportReport`. Permission `catalog.import`. Malformed 400 và không ghi report. Semantic invalid 200 valid=false committed=false. Dry-run và import thật đều có report/audit/receipt; chỉ import thật insert bank, all-or-nothing. Retry trả cùng report/IDs. Report không chứa prompt/key. |
| CAT-06/07 publish | Catalog | In: `RevisionRequest`. Permission `catalog.manage`. Invariant: 1–500 câu, 1–20 section không rỗng, duration/attempt limit, open < close, chưa closed theo DB time, timezone IANA, default explanation có thể NEVER. Một transaction: version tăng, snapshot id mới, policy, current pointer, audit, receipt. Không UPDATE snapshot. Unpublish chỉ chặn policy hiện hành. Republish tạo version mới. Bank edit không đổi snapshot. |
| CAT-08/09 read | Catalog query port + `CatalogFacade` | Browse/detail `catalog.read`: metadata, cursor `(publishedAt, examId)`, filter/watermark/page size, không OFFSET, không question/key. Budget OpenAPI 3 query/request gồm auth + admission + một projection. Facade: `getPublishedPolicy`, `getFrozenQuestionPage`, `getScoringSnapshot` dùng transaction hiện có, không phải HTTP anonymous. Scoring snapshot tách DTO thí sinh. |
| CAT-10 evidence | tests + diagnostic | Real PG restricted role. Start-race của Assessment giữ PARTIAL. Diagnostic browse/detail/publish ghi query, EXPLAIN, pool, payload, p50/p95/p99; không phải SLO/RPS/AWS. |

- [ ] **CAT-01 — IN PROGRESS** CRUD exam draft với expectedRevision, receipt, audit.
- [x] **CAT-02** Section và ordering nằm trong replace draft, không route riêng.
- [ ] **CAT-03 — IN PROGRESS** Question bank single/multiple/true-false và archive giữ reference.
- [ ] **CAT-04 — IN PROGRESS** Gán bank question, points, không lặp, FK.
- [x] **CAT-05** Import JSON v1, dry-run, all-or-nothing, retry.
- [ ] **CAT-06 — IN PROGRESS** Publish atomic snapshot.
- [x] **CAT-07** Unpublish/republish, không sửa snapshot.
- [ ] **CAT-08 — IN PROGRESS** Browse/detail/admin projections, không lộ key.
- [x] **CAT-09** Public facade cho Assessment.
- [ ] **CAT-10 — PARTIAL** Publish/update concurrency, invalid import key, explanation leak và revoke đã có integration PostgreSQL. Start race của Assessment chưa có nên mục này không được tick. Review bổ sung post-lock clock/body/date/response gaps và exact-query/publish diagnostic pending.

Kết quả local 2026-10-07: migration forward `0009_catalog_question_points.sql` áp trên database disposable; 0001–0008 không đổi byte. Một lần chạy integration 64/64 PASS (database 31, Identity 22, Catalog 11) khi Mailpit local đang chạy. Diagnostic không chứng minh capacity. Phase04 và ID-11 giữ mở.

## Prior scope — Identity browser HTTPS COMPLETE locally, 2026-10-07

User authorizes the next increment after retaining pg and SQL normalization. Finish local ID-07/browser evidence with the existing live SPA, real AppModule/HTTP server, restricted PostgreSQL roles, immutable migrations and actual verification worker/SMTP delivery. Catalog, SES/AWS deployment, public certificates and general frontend acceptance remain separate work.

Owners: Identity application/infrastructure/presentation for durable auth; Web auth transport/session and forms for browser behavior; isolated test tooling for TLS/proxy/fault injection. Preserve final-owner password activation, single-use challenge, signed family-bound CSRF, exact Origin, Secure/HttpOnly cookies and database authority. Test fixtures may expire/revoke disposable records; no runtime test endpoints or relaxed production controls.

- [x] H-01: Dedicated HTTPS harness, ephemeral restricted keys/certificate, disposable database/roles, live build and actual Mailpit worker delivery. Normal teardown drains resources/removes DB/logins/temp keys; runner stops containers. Browser leaf SPKI exception and Node CA/SAN checks are scoped to the run, no OS trust changes.
- [x] H-02: Real browser register/duplicate202, actual mail, suppressed resend/cooldown, inert/scrubbed landing and reload, final password, invalid/expired/replayed link/login PASS. Replay does not replace the first activation password or create a session.
- [x] H-03: Secure cookie/Origin/CSRF/header proof; two shared-cookie tabs refresh once, profile200/409, restart/revocation/logout, commit-lost ACK and body timeout PASS. Fixed unknown-recovery reset, fresh-CSRF logout retry, body I/O/timeout, anonymous verification enforcement and direct profile reauth action after RED reproduction.
- [x] H-04: 10 real Chromium HTTPS cases,73 web unit cases (64 auth/existing +9 concurrent public-experience cases),100 backend unit/tooling and53 real-PG/SMTP integration PASS. Lint/quality/contracts/typecheck/build/diff and migration preservation checked. [Evidence](evidence/identity-https-2026-10-07/README.md)/[runbook](runbooks/identity-https.md); ID-07/WEB-02 local, FE-07–10 closed. Public PKI/SES/AWS and broader Web gates remain pending.

Execution: inspect latest UI fixes → build harness/tests → capture failing behavioral evidence → repair only reproduced defects → rerun focused checks → broader regressions → review diff and update roadmap/acceptance. Do not overwrite historical frontend or persistence evidence.

Self-review: no new business dependency, runtime test endpoint, ORM/cache/service, schema/migration, JWT/public JSON change or transaction/event rewrite. Security contract is enforced at the HTTP port/controller; logout anonymous retry cannot authorize a live family. Browser recovery resets only after explicit confirmed login, with stale-generation protection. Receipt retry keeps one durable write; no latency/cost improvement is claimed. Concurrent public UI/Three.js work was preserved and is not accepted as a performance/visual phase by the auth suite. Product52/216 and FE7/32; Phase04 still awaits ID-11 live SES.

## Active scope — SQL readability COMPLETE locally, 2026-10-07

User accepts retaining pg provisionally and requests a query-format rule plus normalization of existing SQL. Ownership remains Identity persistence and shared technical PostgreSQL adapters; include executable test fixtures, local tooling and operational SQL. Read/write paths, bindings, domain invariants, transaction/lock boundaries and public contracts must remain unchanged. This is code-shape work, not an ORM, schema or query optimization change.

- [x] QF-01: Canonical SQL layout adopted in conventions §102.1/rule R-77; AGENTS, validation workflow and database guide point to it. Clauses, projections, predicates, CTEs/subqueries, mutations, bindings and short-query exceptions are specified.
- [x] QF-02: Current runtime, integration fixtures, local tooling and operational queries normalized across14 code/SQL files. Reviewed locking clauses, EXTRACT, JSON pairs, shared projections and PL/pgSQL bootstrap blocks. Eight immutable migrations and historical experiment sources/evidence preserve their bytes; future migrations use the convention.
- [x] QF-03: Token/literal/interpolation/binding and surrounding semantic AST comparison PASS across84 code files/274 SQL literals or fragments plus3 operational SQL files. All53 scoped historical files unchanged;8 source/built migrations match captured SHA-256. Prettier, lint/quality/contracts, typecheck/build,100 unit/tooling and53 real PostgreSQL/Identity regressions PASS. Bootstrap and diagnostics execute on dedicated local PostgreSQL:55434. See [validation](validation.md#sql-readability-normalization--2026-10-07) and [verification ledger](evidence/sql-format-2026-10-07.json).

Self-review: one active connection/UoW, query operation labels, parameter arrays, static interpolation, quoted aliases/literals, locks, result shape and statement order are unchanged. No runtime formatter/dependency, ORM switch, schema/HTTP/event or performance optimization was added. Formatting tooling ran from `/tmp` only; short technical commands and intentional migration-parser fixtures remain compact. Separate Web UI work, Git staging and historical benchmark results are preserved. Product roadmap and production acceptance are not advanced by this maintenance increment.

## Status note — Web UI local fix, 2026-10-07

This note does not replace the SQL readability scope above and does not reopen the persistence evaluation. Local `apps/web` exists. FE checklist remains 3/32 checked. Preview regressions for the reviewed deadline, reauth, 403 cache, answer pagination and editor-revision cases are recorded in [fix evidence](web-ui/evidence/fix-2026-10-07/README.md). HTTPS, live Catalog/Assessment/Reporting and WEB-01–10 stay open. No production acceptance is claimed.

## Active scope — persistence evaluation COMPLETE locally, 2026-10-07

User authorizes O-01–04: compare current pg with TypeORM and Sequelize before selecting persistence. Keep existing Web UI work and staging untouched. The experiment has its own pinned package/lockfile and disposable PostgreSQL on a separate port; no runtime ORM switch, applied migration rewrite, API or AWS change is authorized by this evaluation alone.

Identity owns the representative paths: principal projection, account mapping, session refresh and profile + audit + actor-scoped receipt. The existing Application and Domain contracts remain unchanged. Candidate executors must preserve one active transaction/connection, nested join/rollback-only, late-context rejection, bounded admission, server timeouts, safe errors and graceful pool drain. ORM models are experiment Infrastructure only; synchronize and automatic migrations are disabled. Raw projections and ORM repository paths are measured separately.

Sequence: pin/verify dependencies and capture source/config/schema digests; write failing real-PG transaction/correctness checks; implement isolated candidate adapters; run hard gates; seed 100,000 Identity users/families/sessions; run repeated interleaved comparisons at fixed pools/concurrency; retain raw samples, query/lock/transaction/pool/CPU/RSS/startup and query plans; inspect dependency/TCO burden; write ADR and adoption/rollback decision. Use the same compiled Identity classes, ES256 crypto, privileges, schema and durable controls across candidates. Local closed-loop measurements are not sustainable AWS capacity, exam load-test acceptance or dollar savings. Reject failed candidates regardless of latency.

Outcome: O-01–04 complete locally; [experiment](../experiments/persistence-comparison/README.md) retains75 configurations/76,800 samples/0 errors and42 checks. Current runtime regression evidence is100 unit/tooling +53 integration PASS. pg queued-work drain failure was reproduced and corrected before measuring; no schema/contract change. [ADR-008](adr/008-persistence-evaluation.md) retains pg for current Identity, allows later TypeORM reopening, and records Sequelize dependency/logging/lifecycle gaps. Production dataset/capacity/RDS/AWS/TCO remain separate open gates. Existing frontend work/staging is not accepted or changed by this task.

## Active scope — Web UI documentation/task handoff COMPLETE, 2026-10-06

The user requests a detailed UI implementation brief and tasks for Grok before the ORM comparison. Deliver [web-ui handoff](web-ui/README.md): committed visual direction/tokens/screens, truthful API/state mapping and dependency register,32 ordered frontend tasks with acceptance,24 scenarios and a prompt around1,000 whitespace words. ADR-007 specializes frontend build/layout choices without changing backend architecture. This increment creates documentation only: no frontend scaffold/package/runtime, backend/ORM/API change or AWS action.

Owners are presentation/features in the future apps/web client; Identity/Catalog/Assessment/Reporting remain backend authorities. Existing product/security/OpenAPI were inspected, including actual Identity controllers. The brief separates interactive demo, live Identity, missing business endpoints and production acceptance. Current Profile has no permissions; frozen presentation metadata/replay revision/search/report fields are explicit backend dependencies, not frontend fabrications. Product count remains50/216; FE implementation0/32, ORM evaluation0/4. Validate links/schema mapping/task IDs/word count/diff and record documentation checks; prior152 tests remain historical runtime evidence for unchanged sources.

## Source-layout normalization COMPLETE, 2026-10-06

The user authorizes completing the structural adjustment after the documentation/review increment. Implement N-04–12: fail-first guard regressions; baseline diagnostic; config/shared/database/HTTP/Identity moves; public worker/operator factories; immutable SQL bundle copy and CLI path updates; unit/real-PG/smoke/drain checks; repeated comparable diagnostic and final self-review. Preserve all auth/session/rate/receipt/worker/transaction semantics and eight migration checksums. No schema/ORM migration or Catalog expansion is included; O-01–04 remains the separate proposed persistence experiment.

Owning modules: Identity for account/session/verification/public worker+operator capabilities; Assessment for unchanged domain helpers; technical config/shared/infrastructure/workers for process/DB/HTTP mechanics. Application owns existing atomic writes; one pg transaction executor resolves the active client for every repository/audit/receipt call. Read-side principal/CSRF projection is split from domain write contracts without additional SQL or API changes. Public HTTP/events remain unchanged.

Execution: capture baseline before runtime moves; strengthen guard first; relocate with exhaustive literal import/path mapping; separate typed config/validation from secret I/O; extract domain persisted types + application read port; bind public capabilities in composition roots; update build/assets/scripts/tests/docs; run supported checks and self-review. Mark each normalization item only with actual evidence in validation and experiment artifacts.

Outcome: N-01–12 complete;100 unit/tooling +52 real-PG/HTTP/SMTP integration tests PASS; typecheck/build/lint/quality/contracts, actual migration/API/worker/operator CLI checks PASS. Six repeated local diagnostic runs keep query counts while some p95 observations increase; no performance improvement claim. RV-01–05 CLOSED, browser/live SES/AWS gates remain open. Current pg adapter is retained within scope; O-01–04 is proposed, unmeasured and separate. See [normalization checklist](architecture-normalization-plan.md), [validation](validation.md) and [experiment](../experiments/architecture-normalization/README.md).

The [marked roadmap](implementation-roadmap.md) is the delivery-status source. Initial narrowed work delivered standards/bootstrap, then user authorized contracts, PostgreSQL and Phase04 Identity runtime. Historical sections below record those increments; the Phase04 section records the prior runtime outcome. The active scope above records the completed source-normalization increment. AWS production acceptance remains pending.

Affected standards: AGENTS.md, architecture entry point, .ai architecture/rules/conventions/workflow/overview/module-template, project profile and ADR-001/002. New documentation: module guide, performance protocol, contract-test matrix, production acceptance ledger and experiment template.

Previously opened code work: pure Assessment Attempt lifecycle and exact-match scoring with fail-first Jest tests; TypeScript/ESLint/Prettier configs; local PostgreSQL/ElasticMQ Compose. These do not implement API/use cases/UoW/schema/session/worker/frontend/Terraform/k6. Unused runtime dependencies and nonexistent run commands are removed from the bootstrap so the current repository only advertises checks it can run.

Validation: domain unit tests, typecheck/build, lint, standards links/anchors/import/test placement, npm audit, Compose health/local queue. Record actual results in validation.md and tick matching roadmap IDs. No AWS resources are created or benchmark results fabricated. Git is not initialized; no diff/PR can be claimed.

Next implementation order after this scope: product contracts → database/UoW/Identity/Catalog → Assessment/scoring → reporting/browser/observability → Terraform/CI → dataset/load/failure/FinOps → evidence-based production acceptance. Each phase is split into small reviewable changes with tests and updated evidence/status.

## Review of completed checklist items

User requests reviewing the 18 completed items before advancing. Inspect each checked artifact and rule consistency, rerun appropriate local checks, and reopen/fix defects with regression tests before restoring completion status. Current findings: Attempt hydration permits inconsistent lifecycle/expiration state; import checker misses import-type/import-equals, bare Node network modules and technical-folder barrel imports; database task dependencies require later business flows too early. Check local SQS URL consistency and permanent guidance for stale turn-specific scope. Owner: Assessment domain for lifecycle invariants; quality tooling for literal import checks; standards/roadmap for documentation. No API/AWS implementation or migration/network production operation is included. Domain changes remain pure and transaction-independent. Required evidence: failing regressions, passing unit/tooling tests, lint/typecheck/build/quality, local Compose/DB/queue checks and explicit unresolved dev-audit findings. Record the final per-item verdict in docs/completed-checklist-review.md.

Review outcome: findings were repaired with regressions, the completed 18 items are retained with fresh evidence, and phase 02 is the next scoped work. See [completed-checklist review](completed-checklist-review.md).

## Detailed next-work report

The user requests a detailed report of the next work. Deliver [phase 02 plan](phase-02-plan.md), mapping SPEC-01–11 to decisions, owners, planned artifacts, acceptance examples, execution order and the gate before database/application implementation. This turn changes planning documentation only. The specification artifacts themselves remain pending; the roadmap retains 18 completed items. Validate document links and standards consistency with `npm run quality`; do not infer runtime or AWS verification from this report.

## Phase 02 execution — COMPLETE

The user authorizes implementing the reported next phase. Deliver SPEC-01–11: product/version/time/attempt/retry/release/ranking policies, permissions/import/retention, OpenAPI, versioned event schema, SLO/workload and acceptance-case traceability. Owners remain Identity, Catalog, Assessment and Reporting; writes retain the existing UoW/lock/outbox/inbox contract. Select and justify product defaults without changing architecture boundaries. Record any conflict as an ADR. Add dev-only OpenAPI/JSON Schema validation with fail-first tooling tests; validate schemas and examples, then run tests/typecheck/build/lint/quality. Update profile/ledger/roadmap with artifacts and measured local checks. API/SQL/worker/AWS implementations remain subsequent phases; no production commitment or benchmark is inferred from specification delivery.

Outcome: SPEC-01–11 artifacts delivered and [reviewed](phase-02-review.md), 48 tests/typecheck/build/lint/quality pass. ADR-003 bounds receipt storage without unsafe old-key replay. Roadmap now 29/212 complete; next phase is DB/migrations/UoW and the pending Git/bootstrap tasks, not AWS benchmarking without runtime/evidence.

## Phase 03 execution — DB-01–11 COMPLETE, DB-12 PARTIAL

User authorized continuation. Followed [Phase 03 plan](phase-03-plan.md): six immutable migrations, capability schema/snapshots/constraints, owner vs runtime roles, plain UoW with pg/AsyncLocalStorage, bounded pool/timeouts, connection-budget CLI, redacted observations/pg_stat_statements and real PostgreSQL tests. Applied local CLI migrations, performed [self-review](phase-03-review.md), repaired invariant gaps with failing regressions, and updated roadmap to40/212. [Database guide](database.md), ADR-004 and migration runbook explain implementation/limits. 67 unit/tooling +30 integration cases pass. Business use cases/AWS/benchmarks remain future phases. DB-12 is deliberately unchecked: runbook delivered, actual old/new image drill requires BOOT-10/CI. No background work remains. Next: Identity and composition roots; Git remote still unspecified.

## Phase 04 plan and authentication contract amendment

User requested a detailed implementation explanation, then amended Identity: email/password with single-use email verification links now, asymmetric private/public signed access/refresh, magic link and GitHub later. Deliver [Phase04 plan](phase-04-plan.md), [ADR-005](adr/005-email-verification-and-signed-tokens.md), updated rule/architecture/security/product/OpenAPI/SLO owners, roadmap ID-10–13 and focused fail-first contract tooling regressions. This amendment precedes Identity runtime implementation. Existing six migrations/UoW are inspected but unchanged; plan new forward migrations, schema/privacy/grant restrictions and Identity-owned durable encrypted mail outbox. Retain PG session authority, cookies/CSRF and bounded hashing; no auth cache, external provider framework or unnecessary mail queue. Final password at activation protects against attacker pre-registration. Signature algorithm ES256/P-256 is an unmeasured standards choice, not a FinOps result.

Review/evidence: [auth contract amendment](phase-04-contract-review.md). Roadmap remains40 delivered, now216 total/176 pending due to four new Identity items. Runtime ID-01–11/BOOT-10 remain pending; ID-12/13 LATER. Git remote/AWS account/region/sender and domain are unselected; no real mail or key material is generated in this amendment. Contract-only validation does not close crypto/session/email/browser/AWS gates.

## Phase04 runtime execution — LOCAL CORE DELIVERED, ID-07/11 PARTIAL

User authorized implementation, then requested rereading changed folders. Inspected and adopted module-level composition, grouped Identity ports/errors/persistence/security/mail/http/DTOs, technical platform error categories/idempotency, generic HTTP setup and null success envelope. Updated conventions/architecture placement guide and quality boundary tests without changing capability ownership.

Implemented BOOT-10/ID-01–06/08–10: two new forward migrations, private/public ES256 credentials, bounded Argon2, email activation/final owner password, sessions/refresh/reuse/logout/current permissions/profile receipts, audited operator bootstrap, encrypted email outbox/SMTP/SES adapters, least-privilege worker, fencing/retries/park/replay/maintenance. Hash/provider I/O outside UoW; user-first locks and durable security effects. Real regression tests repaired logout lost-ACK CSRF, concurrent login limit, bucket lifetime and final-attempt crash handling.

[Runtime review](phase-04-review.md), [operations runbook](runbooks/identity-operations.md), [experiment](../experiments/identity-local/README.md) and validation inventory record evidence. Roadmap50/216 completed; ID-07 browser HTTPS/WEB-02 and ID-11 live SES operations remain PARTIAL, ID-12/13 LATER. No Catalog work automatically started; no Git/remote/AWS resources. Full SLO/cost/restore acceptance is not inferred from local tests.
