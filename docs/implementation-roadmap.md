# Roadmap triển khai có đánh dấu

Cập nhật2026-10-09: [Assessment retention](assessment-retention-2026-10-09.md)/
[evidence](evidence/assessment-retention-2026-10-09/README.md): **ATT-09 accepted
locally;79/216 mục hoàn thành,137 mục chưa hoàn thành.**375 root/242 integration/
15 suites PASS,0 skipped; lint/typecheck/build/contracts46/425 PASS. Completed-only
receipt7days và payload365days+7day grace, fixed UTC/nonfinite protection, atomic
statistics/ranking/audit, compact quota/inbox và source/DLQ duplicate fencing đã
kiểm chứng. Worker one-shot default-off có SIGTERM drain.17 source/built migrations
khớp;16 applied files +306 prior evidence giữ nguyên; development DB chưa migrate.
Không suy ra SLO/capacity/AWS cost; full ATT-10/11, REP-04/Reporting/privacy/Admin,
rollout/image/restore, managed AWS và production vẫn mở.

Prior ATT-08 update2026-10-09. [Candidate results](assessment-results-2026-10-09.md)/[evidence](evidence/assessment-results-2026-10-09/README.md): **ATT-08 accepted locally;78/216 mục hoàn thành,138 mục chưa hoàn thành.**344 root/224 integration/14 suites PASS,0 skipped; lint/typecheck/build/contracts46/425 PASS. Candidate result/history/review có current permission/owner, frozen release policy, terminal FAILED/replay semantics, bounded cursor/256KiB response và3 SQL calls/read gồm auth/rate. Natural100k history index/key-gate plans và short sequential diagnostics đã ghi; không suy ra sustainable capacity/SLO/cost.16 migrations source/build khớp;16 applied files +273 prior evidence files giữ nguyên. [Grading recovery](grading-recovery-2026-10-09.md) ASYNC-10, [grader](grading-consumer-2026-10-09.md) ASYNC-05–07, [publisher](outbox-dispatch-2026-10-08.md) ASYNC-02–04 và [ATT-07](assessment-expiry-fixes-2026-10-08.md) giữ nghiệm thu. ATT-09 retention, ATT-10/11 full matrix, REP-04 leaderboard/privacy, Admin replay HTTP, effective IAM/live SQS, generation-aware rollout/DB-12 và AWS/production còn mở. Browser HTTPS không rerun; actual HTTP/PG/auth regression đã chạy. ID-11/live SES và Phase04 còn mở/PARTIAL; magic link/GitHub LATER.

[Chuẩn hóa kiến trúc](architecture-normalization-plan.md) theo §5 mới đã hoàn tất **12/12 normalization deliverables**, với152 tests và actual entry-point checks; [diagnostic trước/sau](../experiments/architecture-normalization/README.md) ghi đủ kết quả và giới hạn. Persistence evaluation đã hoàn thành4/4 local theo [ADR-008](adr/008-persistence-evaluation.md), tách khỏi refactor; [raw comparison](../experiments/persistence-comparison/README.md) giữ pg hiện tại, chưa chọn AWS/TCO winner. Checklist này theo dõi riêng, không cộng vào216 product items. [API review](api-architecture-review.md) đóng RV-01–06 local; RV-07 và production acceptance còn pending. [Review Catalog độc lập](catalog-review-2026-10-07.md) đã mở lại sáu items; [fix closure](catalog-fixes-2026-10-07.md) nghiệm thu lại BOOT-01 và CAT-01/03/04/06/08. [Diagnostic mới](evidence/catalog-fixes-2026-10-07/diagnostic/README.md) ghi exact SQL/publish/provenance, giữ nguyên evidence cũ. Review đã mở lại CAT-09/10 vì snapshot JOIN cũ; [closure mới](assessment-fixes-2026-10-08.md) chứng minh fresh post-lock publication và hai observed HTTP races PASS. Evidence GR-01–06 bên dưới giữ nguyên như lịch sử. Increment Assessment không đóng Phase04.

Đã bàn giao [Web UI specification/task/prompt cho Grok](web-ui/README.md): 5/5 document deliverables. Checklist FE7/32 checked, WEB-02 local hoàn tất. Các WEB khác vẫn mở; phát hành asset/TLS AWS, live business APIs và budget chưa nghiệm thu. [ADR-007](adr/007-web-ui-implementation-direction.md) chọn static SPA; public visual work có trạng thái riêng. Product79/216 không đồng nghĩa production acceptance.

Quy ước: `[x]` = named deliverable đã hoàn tất với artifact/checks, không có nghĩa production acceptance. `[ ]` = chưa hoàn tất; PARTIAL ghi rõ phần đã có/còn thiếu. “Có script” không đồng nghĩa “đã đo”. Evidence: [bootstrap](completed-checklist-review.md), [contracts](phase-02-review.md), [auth amendment](phase-04-contract-review.md), [DB](phase-03-review.md), [Identity runtime](phase-04-review.md), [raw local benchmark](../experiments/identity-local/README.md). Không có background implementation. Git và origin remote hiện đã có, BOOT-09 branch/PR workflow chưa kiểm chứng; DB-12 chưa chạy images. Cập nhật checklist/evidence/acceptance cùng nhau; AWS costs giữ chưa đo.

| Nhóm | Trạng thái hiện tại | Điều kiện chuyển bước |
| --- | --- | --- |
| 00: Bộ quy chuẩn | §5/ADR-006 đã chuẩn hóa source/tooling và kiểm chứng12/12 riêng | Không còn quyết định POS mâu thuẫn, có contract/ADR và checklist |
| 01: Bootstrap | Runtime API/email-worker local và Git/origin đã có; branch/PR workflow còn pending | Unit/typecheck/build/lint/quality, actual entry-point health/drain |
| 02: Product/public contracts | Hoàn tất specification + local contract checks | Policy/schema/permissions/workload nhất quán; runtime evidence pending |
| 03: Database | DB-01–11 hoàn tất nền persistence; DB-12 chưa drill | Business adapters/races và old/new images cần evidence riêng |
| 04: Identity | Lõi + browser HTTPS local hoàn tất; ID-11 PARTIAL, ID-12/13 LATER | Live SES operations trước đóng phase; AWS TLS vẫn gate riêng |
| 05: Catalog | CAT-01–10 local; publication/start races và owned capabilities đã fix | ID-11 vẫn chặn Phase04; AWS/capacity chưa đo |
| 06–13: Assessment/operations/AWS | ATT-01–09, ASYNC-01–07/10 local; ATT-10/11, ASYNC-08/09/11/12 và các phase sau còn mở | Correctness và security trước capacity tuning |
| 14–19: Dataset/load/failure/FinOps | Chưa đo | Có môi trường kiểm thử và raw evidence |
| 20: Production acceptance | Chưa đạt | Toàn bộ hard gates và câu hỏi định lượng có evidence |

## 00. Bộ quy chuẩn và quyết định kiến trúc

Mục đích: chuẩn hóa dự án thi trực tuyến trên contract đã cung cấp, không thiết kế lại architecture theo framework.

- [x] **STD-01** Đọc bộ `.ai/` và xác định quyết định cũ về POS/ba app/không migration cần thay đổi.
- [x] **STD-02** Cập nhật [AGENTS.md](../AGENTS.md): scope mới, instruction precedence, cách đọc theo task và nghĩa của checkbox.
- [x] **STD-03** Giữ [.ai/architecture.md](../.ai/architecture.md) là contract chính thức; tạo [architecture.md](../architecture.md) làm điểm truy cập.
- [x] **STD-04** Cập nhật [rules](../.ai/rules.md), [workflow](../.ai/workflow.md), [conventions](../.ai/conventions.md), [overview](../.ai/overview.md) và [module template](../.ai/module-template.md).
- [x] **STD-05** Ghi [ADR-001](adr/001-project-adoption.md): monolith API/worker, PostgreSQL, SQL adapter qua port, migration, SQS/outbox/inbox, Redis optional.
- [x] **STD-06** Ghi [ADR-002](adr/002-cursor-pagination.md) và cập nhật cả architecture/conventions cho cursor metadata, không để mâu thuẫn page/count.
- [x] **STD-07** Viết [project profile](project-profile.md) và [module guide](examination-module-guide.md); phân ownership theo capability.
- [x] **STD-08** Bổ sung R-63–R-75 và architecture §§76–85 về correctness, performance/cost, AWS, security/reliability và evidence.
- [x] **STD-09** Viết [performance protocol](performance.md), [contract test matrix](contract-tests.md) và [production acceptance ledger](production-acceptance.md).
- [x] **STD-10** Kiểm tra links/anchors, stale policy, imports/test naming và tự review quy chuẩn sau cập nhật.

Hoàn tất khi: tiêu chuẩn không tự mâu thuẫn, quyết định có ADR, target/measurement/implementation được phân biệt rõ. Những quyết định sizing/cache/TLS chưa đủ evidence phải còn ở trạng thái pending.

## 01. Hoàn tất bootstrap đã bắt đầu

Mục đích: bootstrap/dependencies/domain và composition roots; Git/remote vẫn chờ cấu hình.

- [x] **BOOT-01** Tạo package metadata, TypeScript strict config, Jest không phụ thuộc Watchman, ESLint/Prettier và lockfile. GR-05 fixed: root `npm test` chạy đúng89 API/37 tooling/73 Web PASS; [evidence mới](evidence/catalog-fixes-2026-10-07/README.md).
- [x] **BOOT-02** Cài dependency phục vụ TypeScript/unit/lint. Loại dependency runtime chưa sử dụng khỏi bootstrap; sẽ thêm theo phase có nhu cầu.
- [x] **BOOT-03** Tạo [compose.yaml](../compose.yaml), PostgreSQL local và ElasticMQ/SQS local chỉ bind localhost.
- [x] **BOOT-04** Tạo [.env.example](../.env.example), ignore files; không đưa production secret vào repo.
- [x] **BOOT-05** Viết test trước cho deadline/submission/exact-match scoring; chạy RED xác nhận source chưa tồn tại.
- [x] **BOOT-06** Hoàn tất pure [Attempt](../apps/api/src/modules/assessment/domain/attempt.ts), [scoring](../apps/api/src/modules/assessment/domain/scoring.ts) và unit tests; chạy GREEN.
- [x] **BOOT-07** Chạy typecheck/build/lint/quality; ghi kết quả vào [validation log](validation.md).
- [x] **BOOT-08** Kiểm tra health PostgreSQL và queue local; đây chỉ là dependency check, chưa phải integration test hệ thống.
- [ ] **BOOT-09** PARTIAL — Git đã có, baseline commit `cac9416`, remote name `origin` hiện diện; branch codex/catalog-review-fixes đã được tạo, nhưng PR workflow và remote connectivity chưa kiểm chứng. Không tạo PR chỉ để đóng checklist.
- [x] **BOOT-10** Nest composition root/API/email-worker entry points, config fail-fast, health/correlation/error mapper và graceful drain; actual local smoke PASS.

BOOT-06–08 có [bootstrap evidence lịch sử](completed-checklist-review.md). BOOT-10 có [runtime review](phase-04-review.md): actual API/worker live/ready/SIGTERM PASS. Hiện100 unit/tooling +52 integration PASS sau normalization, runtime audit0,20 moderate dev findings. BOOT-09 PARTIAL; không suy ra Docker/AWS readiness từ local roots.

## 02. Chốt product specification và public contracts

Phụ thuộc: 00. Artifact: product spec, permission matrix, API/OpenAPI, event schema, ADR khi cần.

[Kế hoạch Phần 02](phase-02-plan.md) đã được thực hiện; [review Phần 02](phase-02-review.md) đối chiếu artifacts và các findings đã sửa. 48 tests pass, typecheck/build/lint/quality pass; OpenAPI 44 operations và event/schema/examples được validate. Đây là specification gate, chưa có application/AWS work chạy nền.

- [x] **SPEC-01** [Product §2](product-specification.md): categories, exact-match, sections/points/rounding/examples; không công bố conversion TOEIC/IELTS chưa hỗ trợ.
- [x] **SPEC-02** [Product §3](product-specification.md): immutable publish/version/unpublish/archive và public snapshot capability.
- [x] **SPEC-03** [Product §4](product-specification.md): UTC/window/duration, clipped deadline, late entry và clock sau lock.
- [x] **SPEC-04** [Product §5](product-specification.md): quota xuyên version, một active attempt, resume, FAILED/EXPIRED/replay.
- [x] **SPEC-05** [Product §6](product-specification.md), [ADR-003](adr/003-idempotency-retention.md): batch/version/conflict UX, UUIDv7 fingerprint/receipt retention/retry.
- [x] **SPEC-06** [Product §7](product-specification.md): bảy states, expiry, transaction-local PROCESSING, FAILED/replayPending và recovery.
- [x] **SPEC-07** [Product §8](product-specification.md): durable status/result/polling/frozen explanation gates và redaction.
- [x] **SPEC-08** [Product §9](product-specification.md): best/ties/version/opt-in/privacy/cursor và statistic denominators.
- [x] **SPEC-09** [Permissions/import/retention](security-and-permissions.md): Candidate/Admin/operator matrix, admin bootstrap, session/CSRF/audit/import/data retention.
- [x] **SPEC-10** [OpenAPI/event guide](contracts/README.md), schemas và contract tooling: DTO/errors/envelope/cursor/version/compatibility, 46 operations sau auth amendment.
- [x] **SPEC-11** [SLO/workload](slo-and-workload.md): hot-route p95/p99/query budgets, SLI/error populations, dataset/traffic/capacity targets; execution unmeasured.

Gate đã đạt cho specification: có policies/examples/AC-01–35 và schema checks sau auth amendment. Implementation, security controls và benchmark/restore/cost vẫn chưa được kiểm chứng. Xem [validation](validation.md).

## 03. Database, migration, Unit of Work

Phụ thuộc: 01–02. Artifact: schema/migrations, transaction context, repository ports/adapters, DB integration tests.

- [x] **DB-01** Thiết kế PK/FK/unique/check constraints cho User/Role/Session, Catalog, Attempt/Answer/Result, Leaderboard/AuditLog và technical tables.
- [x] **DB-02** Thiết kế published version/snapshot và FK membership để đáp án không tham chiếu câu hỏi ngoài đề.
- [x] **DB-03** Chọn indexes theo từng query: browse/detail/active attempt/deadline sweep/history/result/leaderboard/outbox/inbox.
- [x] **DB-04** Tạo versioned SQL migration runner: advisory lock, checksum bất biến, migration ordering, failure atomicity.
- [x] **DB-05** Tách migration/admin role và runtime DML role; synchronize luôn tắt.
- [x] **DB-06** Implement UnitOfWork + infrastructure AsyncLocalStorage; resolve transaction client tại từng call.
- [x] **DB-07** Implement join/rollback-only nested semantics; không cho transaction được commit sau joined failure.
- [x] **DB-08** Thiết lập pool/acquire/statement/lock/idle transaction timeout và giới hạn admission.
- [x] **DB-09** Lập connection budget = max API tasks × pool + max worker tasks × pool + reserved maintenance/headroom.
- [x] **DB-10** Tích hợp pg_stat_statements, query/lock/pool timing và redaction; không đưa SQL parameters vào log/trace.
- [x] **DB-11** Viết PostgreSQL thật kiểm chứng constraints, transaction context, joined rollback, lock isolation và pool timeouts bằng technical fixtures. Tests start/save/submit và inbox thực tế được làm tại ATT-10/ASYNC-11 sau khi có application flows.
- [ ] **DB-12** PARTIAL — [runbook](runbooks/database-migrations.md) đã viết; BOOT-10 local đã có nhưng actual old/new API/worker CI images và compatibility drill chưa có. Không có tác vụ chạy nền.

DB-01–11 đạt gate nền persistence: 30 real-PG cases PASS, restricted roles/constraints/context/timeout. Xem [database guide](database.md) và [review](phase-03-review.md). Gate business races/SQS/image compatibility và load/tuning vẫn pending; không chọn pool/index tối ưu từ fixtures.

## 04. Identity, authentication, session, permissions

Phụ thuộc: 02–03. [Runtime review](phase-04-review.md), [plan](phase-04-plan.md), [security contract](security-and-permissions.md), [ADR-005](adr/005-email-verification-and-signed-tokens.md). Ticks dưới đây là local runtime evidence; production TLS/SES/key rollout/capacity vẫn mở.

- [x] **ID-01** Register email/password: normalized unique email, pending verification, input limits, strong hash, atomic challenge/intent và generic response chống enumeration. Timing resistance chưa được nghiệm thu từ local diagnostic.
- [x] **ID-02** Login enabled+verified, bounded hashing/shared atomic failure admission, signed session và safe audit; sequential/concurrent/rate expiry real-PG tests.
- [x] **ID-03** Hashed refresh, atomic rotate và durable reuse revocation; concurrent refresh/replay tests.
- [x] **ID-04** Logout/revoke/current permissions/disable/expiry qua hai instances. Browser review reopened fresh-CSRF lost-ACK retry; corrected after RED, both old family nonce and fresh anonymous retry PASS without permitting anonymous logout of a live family.
- [x] **ID-05** Private-sign/public-verify ES256, strict claims/purpose/TTL, public overlap/removal và real-PG compromised-kid revoke/audit. Actual AWS key propagation/drill còn pending.
- [x] **ID-06** Principal/permission adapter, tập trung permission matrix/current DB reads và actor ownership; no JWT role authority.
- [x] **ID-07** Same-origin browser HTTPS local: Secure/HttpOnly cookies, Origin/signed CSRF/anonymous verification, no-store, inert/scrubbed landing/final password, shared-cookie two-tab single-flight và lost ACK PASS. [10 Chromium cases](evidence/identity-https-2026-10-07/README.md); scoped leaf trust, không public PKI/AWS TLS acceptance.
- [x] **ID-08** Audited verified-user admin bootstrap/operator CLI, runtime không tự grant role; dedicated role tests.
- [x] **ID-09** Unit/real-PG/server HTTP E2E/SMTP/lease/operator cases và benchmark hash/crypto/HTTP/query/pool hai API instances. Browser/AWS acceptance chưa đóng.
- [x] **ID-10** Single-use30min link/resend/final-password activation/race/expiry/retry/pre-registration/material cleanup; local evidence.
- [ ] **ID-11 — PARTIAL** Encrypted outbox/SMTP+SES adapters/worker lease/fence/retry/park/audited SQL replay/verification retention đã test; live AWS sender/quota/bounce/complaint/delivery metrics còn pending.
- [ ] **ID-12 — LATER** Passwordless email magic link: LOGIN_EMAIL purpose riêng, single-use/login CSRF/browser binding và session policy chung; không dùng VERIFY_EMAIL để login.
- [ ] **ID-13 — LATER** GitHub OAuth code + state/PKCE, stable provider subject, explicit account linking, email ownership, provider-only schema migration và no privilege escalation.

Gate Phần04 chưa đóng: còn ID-11. Fresh100 backend unit/tooling +53 integration +73 web unit +10 HTTPS browser PASS. Actual roots smoke/SIGTERM/diagnostic là evidence trước đó; không rerun benchmark trong auth increment. Live SES/AWS key rollout/public TLS chưa đo. ID-12/13 LATER. Xem [review](phase-04-review.md); không coi local RPS là sustainable production capacity.

## 05. Catalog: exam và question bank

Phụ thuộc: 02–04. Ngoại lệ local 2026-10-07: Catalog không gửi mail và không chờ ID-11. Phase04 vẫn mở.

- [x] **CAT-01** CRUD exam draft: title/category/duration/open-close/attempt limit/explanation policy. GR-02/04 fixed: full-size HTTP POST/PUT và strict calendar/Unicode regressions PASS.
- [x] **CAT-02** CRUD section và ordering, section points/rules được specification cho phép.
- [x] **CAT-03** Question bank CRUD cho Single Choice/Multiple Choice/True-False; option/correct-key validation. GR-02 fixed: bounded512KiB POST/PUT, maximum UTF-8/escaped BMP/astral Unicode HTTP regressions PASS.
- [x] **CAT-04** Gán bank questions vào exam, ordering/points và referential integrity. GR-02 fixed:500 actual bank IDs/20 full sections HTTP POST/PUT và ordering regressions PASS.
- [x] **CAT-05** Import questions theo schema có giới hạn kích thước, validation/report lỗi và idempotency.
- [x] **CAT-06** Publish atomic: validate đủ nội dung, tạo immutable version/snapshots, lưu audit cùng transaction. GR-01 fixed: post-lock DB time;6 real-PG publish/republish lock-close, timeout/rollback/replay cases PASS.
- [x] **CAT-07** Unpublish/republish/version edit policy; không sửa nội dung đã dùng bởi attempt.
- [x] **CAT-08** Browse/detail/question projections có pagination/column selection, không N+1 và không lộ key. GR-03 fixed: exact PublicExam, cursor field giữ nội bộ; actual HTTP/OpenAPI schema và exact-query diagnostic PASS.
- [x] **CAT-09** Public Catalog capability giữ ownership/export; khóa exam trước và đọc policy/version bằng fresh post-lock statement trong cùng UoW. [Closure](assessment-fixes-2026-10-08.md).
- [x] **CAT-10** Catalog regressions và hai start/publish/republish HTTP races PASS: quan sát lock wait rồi commit, start201 với current frozen version. [Evidence](evidence/assessment-fixes-2026-10-08/README.md).

Fix gate GR-01–06 CLOSED local theo [report mới](catalog-fixes-2026-10-07.md):199 root unit/tooling/Web +83 integration +10 HTTPS PASS, giữ Architecture Contract. [Evidence cũ](evidence/catalog-2026-10-07/README.md) là lịch sử; [diagnostic mới](evidence/catalog-fixes-2026-10-07/diagnostic/README.md) dùng exact adapter SQL. CAT-10/actual start race đã đóng local theo closure2026-10-08; capacity/SLO/AWS chưa đo.

## 06. Assessment: start, answer, submit, resume

Phụ thuộc: 03–05. Pure domain helper hiện có chỉ là phần nhỏ của phase này.

[Grok handoff — Assessment core](grok-assessment-core-implementation-prompt.md) là prompt của increment này. Evidence của Grok tại [summary](evidence/assessment-2026-10-07/summary.md) giữ nguyên lịch sử. [Review độc lập](assessment-review-2026-10-07.md) đã mở lại ATT-01–04 và CAT-09/10; [fix closure](assessment-fixes-2026-10-08.md) nghiệm thu lại với evidence mới; ATT-05/06, backend-fault subsets và ASYNC-01 transaction vẫn có evidence local. [Review expiry](assessment-expiry-review-2026-10-08.md) đã mở lại ATT-07; [fix closure](assessment-expiry-fixes-2026-10-08.md) khôi phục acceptance local với evidence mới. Candidate result/history/review đã đóng local tại [ATT-08 closure](assessment-results-2026-10-09.md); [ATT-09 retention](assessment-retention-2026-10-09.md) cũng đã đóng local; managed AWS SQS, Reporting, Web và AWS vẫn là increment sau. ID-11/Phase04 không đóng: Assessment local không gửi mail và không phụ thuộc SES.

- [x] **ATT-01** Start atomic, quota/active attempt/deadline và durable receipt; publication snapshot sau lock đúng. Auth-inclusive start11≤12 queries. [Closure](assessment-fixes-2026-10-08.md).
- [x] **ATT-02** Owner/frozen read/cursor đúng; toàn bộ HTTP page gồm envelope/cursor ≤262144 bytes trên boundary và escaped UTF-8 fixtures, không skip/repeat. Questions/answers4 queries; foreign404.
- [x] **ATT-03** Post-lock clock, optimistic versions và batch rollback; UUID casing/semantic duplicates chuẩn hóa. Answer UPSERT/selection/revision CTE dùng quyền hiện có; save11≤11 queries.
- [x] **ATT-04** Canonical validated option sets/UUID, immutable receipt replay và pruned-key rejection; retry đảo option order replay200, changed payload409, không ghi đè answer mới. Retention job đã có [ATT-09 closure](assessment-retention-2026-10-09.md).
- [x] **ATT-05** Mark question và answer-empty semantics; validate cùng ownership/deadline. Mark không ghi score.
- [x] **ATT-06** Manual submit: state + stable outbox event + receipt trong một transaction; response 202 không chờ scoring. Trước deadline SUBMITTED; tại/sau deadline EXPIRED.
- [x] **ATT-07** Auto-submit DEADLINE đã nghiệm thu lại theo [closure](assessment-expiry-fixes-2026-10-08.md): durable cooldown tiến triển qua full poison batch, accepted provenance fail-closed, stable indexable discovery/post-lock clock, calibrated COMMIT ACK observation.21 new regressions/144 full integration PASS; before/after/index/compiled-worker evidence. Scoring/SQS và production chưa bao gồm.
- [x] **ATT-08** Candidate status/result/history/review HTTP có current permission/owner, frozen release/DB time, summary/section/null-score và FAILED/replay semantics. Cursor watermark/tie/actor/kind/pageSize/expiry, complete256KiB escaped response/no-skip,3 auth-inclusive queries và natural100k history/key-gate plans PASS. [Closure](assessment-results-2026-10-09.md)/[ADR-010](adr/010-candidate-frozen-read-projections.md). Local344 root/224 integration PASS; SLO/capacity/AWS chưa nghiệm thu.
- [x] **ATT-09** Bounded Assessment receipt7days/completed payload365days+7day grace; UTC/finite-time/direct-RPC gates, compact quota/submission/inbox, atomic answer/result/statistics/leaderboard/audit, purged-aware readers/source/DLQ và opt-in one-shot stop/drain.18 new restricted-PG cases/242 full integration PASS. [Closure](assessment-retention-2026-10-09.md)/[ADR-011](adr/011-assessment-retention-compaction.md). Full privacy/metadata/restore/AWS lifecycle vẫn mở.
- [ ] **ATT-10 — SUBSET** Đã có duplicate start/limit, publish/unpublish/start lock, republish freeze, stale tab, save rồi submit, và deadline đổi sau lock. Sweep bổ sung locked-oldest skip, hai worker, manual/sweep race và SIGTERM/restart không nhân đôi event. Review độc lập bổ sung hai save trên hai UnitOfWork và4 race save/submit quan sát lock, PASS. Publication/start đã fix AR-03. Chưa đủ toàn bộ timeout matrix. Không đóng đầu mục.
- [ ] **ATT-11 — SUBSET** Đã có replay receipt, resume qua connection thứ hai, revoke session, foreign 404, redaction explanation và rollback khi outbox insert lỗi. Sweep bổ sung mất kết nối trong transaction và mất acknowledgement sau commit: restart không ghi submission lần hai. Chưa đủ lost-ACK của mọi HTTP write. Không đóng đầu mục.

Gate: mọi save/submit được acknowledgement phải có durable outcome đúng; không lost update, không double submit.

## 07. Outbox, SQS, grading worker, projections

Phụ thuộc: 03/06.

- [x] **ASYNC-01** Outbox port của Assessment ghi `attempt.submitted.v1` trong cùng transaction submit. Event không chứa answers, keys hay token. Insert lỗi thì rollback submission. Publisher và consumer local có evidence tại ASYNC-02–07; managed AWS flow chưa nghiệm thu.
- [x] **ASYNC-02** Atomic bounded SKIP LOCKED claim, lease/token fencing, post-lock DB-time ACK và ambient-UoW guard. Real competing/restarted worker probes PASS; [closure](outbox-dispatch-2026-10-08.md).
- [x] **ASYNC-03** Actual AWS SDK adapter + local HTTP contract: whole-call timeout, one SDK attempt, durable bounded retry/jitter, send outside transaction, valid broker ACK before fenced delivery mark. Live SQS/IAM/VPC/latency unmeasured.
- [x] **ASYNC-04** Lease/final-crash recovery, poison/aged parking, original oldest pending age, atomic operator-only replay/audit and [runbook](runbooks/submission-publisher.md). Replay preserves identity/body/time; real audit-failure rollback and grants PASS.
- [x] **ASYNC-05** Strict v1 consumer schema, validated correlation context/sampled events và plain use-case invocation; malformed/forged message durable digest-only quarantine trước ACK. Queue encryption/redrive startup contracts kiểm chứng bằng SDK fixture; live DLQ/OTel spans thuộc ASYNC-10/OBS/AWS. [Closure](grading-consumer-2026-10-09.md).
- [x] **ASYNC-06** Atomic inbox, deterministic exact-match integer grading, unique result/details và COMPLETED commit trước DeleteMessage. Duplicate/redelivery, projection/COMMIT rollback và independent ambient-UoW RED→GREEN PASS; không nhân đôi effect.
- [x] **ASYNC-07** Question/option statistics cho mọi completed attempt và best leaderboard đúng một lần. Stable lock order; earned DESC/submitted ASC/UUID ASC; concurrent completion/tie/rollback regressions PASS. Public read/privacy filters vẫn ở REP-04.
- [ ] **ASYNC-08 — SUBSET** Pure100/500-question percentiles/CPU và3/500-question PG transaction/lock diagnostics đã đo;15 statements/job. Giữ transaction-local tạm thời. Representative contention/saturation, leased comparison nếu cần và capacity/cost decision chưa đủ evidence.
- [ ] **ASYNC-09 — SUBSET** Publisher và grading worker có bounded admission/pool, visibility heartbeat, health/backoff/drain và compiled SIGTERM local PASS. Max ECS task-count/aggregate DB budget, interruption/failover/rolling-deploy dưới tải và production sizing chưa đo.
- [x] **ASYNC-10** Local FAILED/retry/DLQ policy, terminal quarantine/audit và operator-only replay có revision/generation fencing; bảo toàn event/submission/answers/version, concurrent/duplicate/audit rollback và compiled recovery/CLI PASS. [Closure](grading-recovery-2026-10-09.md)/[runbook](runbooks/grading-recovery.md). Admin replay HTTP, live IAM/SQS/retention/rollout và timed recovery vẫn thuộc gates riêng.
- [ ] **ASYNC-11 — SUBSET** Publisher crash/fencing/audit rollback và grader duplicate contention, projection/inbox/deferred-COMMIT rollback, SDK timeout, lost Delete ACK/redelivery và root-boundary guard PASS locally. Recovery thêm terminal/replay audit rollback, stale source/DLQ generation, repeated replay/least privilege và ACK-loss retry local. Actual managed SQS/task-crash/visibility/deployment-under-load matrix chưa nghiệm thu.
- [ ] **ASYNC-12** Benchmark jobs/sec/task/jobs/USD và queue-age SLO trước scaling.

Gate: crash/duplicate delivery không mất submission, không nhân đôi result/statistic/leaderboard.

## 08. Reporting, administration, audit

Phụ thuộc: 04–07.

- [ ] **REP-01** Read-only admin monitor active candidates với scope/freshness rõ ràng.
- [ ] **REP-02** Browse/filter submissions/scores và cursor pagination có stable ordering.
- [ ] **REP-03** Question statistics: answered/correct/incorrect/unanswered denominators, published-version scope.
- [ ] **REP-04 — SUBSET** Candidate history/result/review đã nghiệm thu local tại ATT-08; public leaderboard/privacy, best/latest semantics và admin reporting chưa triển khai. Không đóng đầu mục.
- [ ] **REP-05** Business metrics: starts/submissions/completions/expired/failed và processing backlog.
- [ ] **REP-06** Append-only audit trong admin transaction; action/actor/target/time/minimal metadata, retention/access control.
- [ ] **REP-07** Export/report limits, safe PII exposure và query dependency contracts với migration.
- [ ] **REP-08** Test data scope, projection freshness, query/index plans và audit rollback.

## 09. Browser application Candidate/Admin

Phụ thuộc: public contracts + 04–08.

- [ ] **WEB-01** Chọn frontend/build strategy, responsive/accessibility budget và S3/CloudFront static asset plan.

WEB-01 PARTIAL: ADR-007/[handoff](web-ui/README.md) đã chốt React/TypeScript/Vite, shells/design tokens, responsive/a11y targets, proposed asset/request budgets và static routing/cache plan. Local `apps/web` build và preview browser checks đã có, xem [fix evidence](web-ui/evidence/fix-2026-10-07/README.md). TLS, chiến lược phát asset trên S3/CloudFront và nghiệm thu budget chưa đủ để tick. FE-01–32 chi tiết hóa WEB-01–10, không phải 32 product items mới.
- [x] **WEB-02** Register/duplicate202, actual local verification mail, inert landing/scrub/reload/final password/replay, resend cooldown, login/logout/refresh/reauth và cookie/CSRF policy đã kiểm chứng trên Chromium HTTPS với API/PG thật. [Evidence](evidence/identity-https-2026-10-07/README.md). Magic link/GitHub sau ID-12/13; SES/AWS/browser matrix vẫn riêng.
- [ ] **WEB-03** Browse exam/detail và lỗi open/close/attempt limit rõ ràng.
- [ ] **WEB-04** Start/load questions/answer/mark, section navigation và answer-empty UX.
- [ ] **WEB-05** Autosave debounce/batching theo query/write budget; hiển thị saving/saved/conflict/failure.
- [ ] **WEB-06** Retry dùng lại mutation key, tránh duplicate submits; giải quyết stale answer/multiple-tab conflict.
- [ ] **WEB-07** Countdown đồng bộ server/deadline, reconnect/resume, manual/auto-submit UX.
- [ ] **WEB-08** Bounded/backoff/jitter result polling; processing/failed/result/explanation/history/leaderboard views.
- [ ] **WEB-09** Admin exam/section/question/import/publish, monitor/submissions/scores/stats/audit views.
- [ ] **WEB-10** Browser E2E, accessibility, keyboard/focus/mobile, reconnect/reload and secret/key leakage checks.

Gate: candidate hiểu trạng thái durable save, không được báo “saved” chỉ vì state đang nằm ở browser.

## 10. Observability và telemetry budget

Phụ thuộc: application flows; instrument trước benchmark baseline.

- [ ] **OBS-01** Structured redacted logs với request/correlation/trace context qua HTTP/outbox/SQS/worker.
- [ ] **OBS-02** HTTP RPS/p50/p95/p99/error theo route/status; request/response size và per-flow query count.
- [ ] **OBS-03** DB pool active/idle/wait, query/lock/transaction timing, failures và timeout.
- [ ] **OBS-04** ECS CPU/memory/tasks/restarts/startup, RDS CPU/IOPS/connections/storage/locks/WAL.
- [ ] **OBS-05** SQS depth/oldest age, outbox unpublished age, retries/DLQ/worker jobs/duration.
- [ ] **OBS-06** Redis hit/miss/latency/memory/DB reduction chỉ khi phase 17 bật Redis.
- [ ] **OBS-07** Sampling/retention/levels/cardinality policy; riêng diagnostic/audit, không ID metric labels.
- [ ] **OBS-08** Dashboard/alerts/error-budget burn và runbook link; quyền metrics endpoint hạn chế.
- [ ] **OBS-09** Đo instrumentation overhead và CloudWatch ingestion/storage/query/metric/trace cost; telemetry budget alert.

## 11. Security và reliability controls

Phụ thuộc: thực hiện xuyên suốt 03–13, hoàn tất trước production gate.

- [ ] **SEC-01** Threat model cho auth, ownership, answer keys, import, admin/replay, queue payload và AWS trust boundaries.
- [ ] **SEC-02** TLS/certificate path cho viewer/origin/auth/DB; domain/origin TLS decision chưa được chốt.
- [ ] **SEC-03** IAM/DB least privilege, private network, encryption at rest và secret injection/rotation.
- [ ] **SEC-04** WAF/rate-limit policies bảo vệ burst hợp lệ; fail-open/closed decision theo operation.
- [ ] **SEC-05** Input/body/import limits, response/error/log/trace redaction và PII lifecycle.
- [ ] **REL-01** `/live`/`/ready` critical dependency policy, không fail readiness vì optional cache.
- [ ] **REL-02** Timeouts/acquire deadlines/bounded retries/backoff+jitter; không retry unsafe mutation.
- [ ] **REL-03** Back-pressure/load shedding và outbox/queue backlog admission policy.
- [ ] **REL-04** Graceful API/worker shutdown/drain/connection release và rolling deploy capacity.
- [ ] **REL-05** Backup/PITR/deletion protection/final snapshot và RPO/RTO/restore runbook.
- [ ] **SEC-06** Dependency/image/IaC vulnerability scan và remediation; production gate không bypass critical/high chưa xử lý.

## 12. Terraform AWS infrastructure

Phụ thuộc: 00, resource/SLO/security specification; deployment cần account/region. Chưa có domain không được dùng để ngầm hạ TLS.

- [ ] **AWS-01** Chốt AWS account/profile, region/AZ support, environments, state backend encryption/locking và tags.
- [ ] **AWS-02** Lập resource ledger: purpose/absence/failure/SLO/gain/utilization/headroom/monthly cost/TCO/alternatives.
- [ ] **AWS-03** VPC/private app+DB subnets, routes/SG; so sánh NAT hai AZ với interface/gateway endpoints bằng full cost.
- [ ] **AWS-04** ECR immutable image/lifecycle/scanning và ECS cluster/API/worker roles.
- [ ] **AWS-05** ALB target group/readiness/drain, CloudFront API/static behavior; private-origin design và origin TLS.
- [ ] **AWS-06** WAF managed/rate rules và observability; benchmark không chặn mass-start hợp lệ.
- [ ] **AWS-07** ECS API availability baseline across AZs, independent worker baseline/burst/Spot và task sizing variables.
- [ ] **AWS-08** RDS PostgreSQL private/Multi-AZ/encrypted, parameter group, backup/PITR, deletion protection và role budget.
- [ ] **AWS-09** SQS/DLQ encryption, redrive/retention/visibility policy và publisher/consumer IAM.
- [ ] **AWS-10** S3 private assets/import/artifacts, OAC/lifecycle/versioning/encryption và access policy.
- [ ] **AWS-11** Secrets Manager/SSM task injection, scoped IAM/KMS và credential rotation.
- [ ] **AWS-12** CloudWatch logs/metrics/alarms/dashboard/retention/budgets; cost attribution tags.
- [ ] **AWS-13** Route53/ACM/custom-domain resources chỉ khi có domain; default CloudFront viewer HTTPS alternative.
- [ ] **AWS-14** Terraform format/validate/security/plan review, apply staging và drift/state recovery.
- [ ] **AWS-15** Verify no public DB/cache/task address, effective permissions/TLS, minimum AZ availability.

Gate: infrastructure controls được kiểm tra thật; chưa có account không tick deploy/benchmark.

## 13. CI/CD và release/rollback

Phụ thuộc: application + 12.

- [ ] **CI-01** GitHub Actions lint/quality/typecheck/unit, PostgreSQL integration/E2E, build.
- [ ] **CI-02** Dependency/container/IaC scan, supply-chain provenance/SBOM và immutable artifact.
- [ ] **CI-03** Multi-architecture Docker build; non-root, image/startup/memory measurements, graceful signal handling.
- [ ] **CI-04** GitHub→AWS OIDC least privilege; không static AWS keys trong repository/workflow.
- [ ] **CI-05** ECR push theo digest, migration one-off task trong private VPC và fail-on-migration-error.
- [ ] **CI-06** ECS API/worker rollout/circuit-breaker/health verification và lưu image/task/schema provenance.
- [ ] **CI-07** Rollback image/task definition, compatibility với schema mới; không tự đảo data migration.
- [ ] **CI-08** Deployment under load, minimal downtime, worker interruption/redelivery và rollback drill.

## 14. Dataset và database experiments

Phụ thuộc: schema/app/telemetry/staging; chỉ chạy trong environment có thể phá và phục hồi.

- [ ] **DATA-01** Reproducible generator: 100,000 users/1,000 exams/≥500,000 questions/millions attempts+answers.
- [ ] **DATA-02** Realistic hot/cold/skew, option counts, attempt history/time distributions và known scoring oracle.
- [ ] **DATA-03** Seed nhỏ cho smoke/integration; seed lớn cho saturation; lưu seed/schema/count/version/storage.
- [ ] **EXP-DB-01** Baseline query plans/queries per request/DB pool/CPU/IOPS/latency.
- [ ] **EXP-DB-02** Missing vs correct vs bad index: EXPLAIN ANALYZE BUFFERS và write/storage tradeoff.
- [ ] **EXP-DB-03** N+1 vs bounded/batched question/result reads, payload/round-trip comparison.
- [ ] **EXP-DB-04** Large OFFSET vs cursor, stable ties và churn correctness.
- [ ] **EXP-DB-05** Pool sweep và connection exhaustion: timeout/back-pressure/max task budget.
- [ ] **EXP-DB-06** Lock contention/save-vs-submit/high write/slow queries/WAL/vacuum behavior.
- [ ] **EXP-DB-07** Tìm DB saturation và optimal pool trước khi benchmark RDS sizing lớn hơn.

## 15. k6 workload và hot-path benchmarks

Phụ thuộc: 10/14 và application chạy thật.

- [ ] **LOAD-01** Reusable authenticated fixtures cho nhiều candidate riêng; không dùng một user giả lập 2,000 người.
- [ ] **LOAD-02** Smoke và baseline thresholds correctness/SLO, per-route tags cardinality bounded.
- [ ] **LOAD-03** Normal/ramp-up/spike/stress/soak và generator-capacity validation.
- [ ] **LOAD-04** Mass-start 2,000 candidates, full question payload và start-limit/content correctness.
- [ ] **LOAD-05** Sustained autosave/marks theo interval+jitter và answer size/version phân bố thật.
- [ ] **LOAD-06** Mass-submit, measured acknowledgement tách khỏi grading completion.
- [ ] **LOAD-07** Result polling/backoff và leaderboard burst sau completion.
- [ ] **LOAD-08** Lifecycle 19:50→20:50 scenario: arrival burst, 45-minute exam, submit/poll/ranking.
- [ ] **LOAD-09** Tách GET exam/questions/save/submit/result/leaderboard microbenchmarks để tìm query/payload bottleneck.
- [ ] **LOAD-10** Collect p50/p95/p99/achieved RPS/errors/CPU per request/memory/queries/pool waits/locks/headroom.
- [ ] **LOAD-11** Track dropped iterations/timeouts/generator CPU, không lấy offered load làm sustainable throughput.
- [ ] **LOAD-12** Comparable before/after raw artifacts khi architecture/infrastructure thay đổi.

## 16. Compute sizing và autoscaling experiments

Phụ thuộc: staging/14–15. Không khẳng định ARM/EC2/Fargate thắng trước khi đo.

- [ ] **EXP-COMP-01** Fargate x86_64 CPU/memory sizing sweep và request/job throughput per task.
- [ ] **EXP-COMP-02** Fargate ARM64/Graviton cùng workload/image semantics; compatibility/startup/image/memory/cost comparison.
- [ ] **EXP-COMP-03** ECS EC2 capacity khi sustained load đủ lớn; gồm idle/utilization/patching/operations/TCO.
- [ ] **EXP-SCALE-01** CPU/memory/ALB requests-per-target/p95/pool wait policy comparisons.
- [ ] **EXP-SCALE-02** Queue backlog-per-task/oldest-age/processing-duration worker scaling.
- [ ] **EXP-SCALE-03** Scheduled pre-scaling + reactive burst, reaction time/cold start/cooldown/scale-in safety.
- [ ] **EXP-SCALE-04** Worker Spot interruption và fallback capacity; critical API baseline không toàn Spot.
- [ ] **EXP-SCALE-05** Maximum task count giữ DB budget, throughput/headroom và cost under peak.

## 17. Redis vs no Redis — phase có điều kiện

Phụ thuộc: baseline chứng minh cache có thể giảm cost hoặc đáp ứng SLO/reliability. Nếu không cần, ghi decision không thêm; không tick bằng cách provision vô điều kiện.

- [ ] **CACHE-01** Xác định query bottleneck và estimated break-even DB/compute vs ElastiCache.
- [ ] **CACHE-02** Cache contracts cho exam/questions/leaderboard: key/version/TTL/staleness/invalidation/fallback/stampede.
- [ ] **CACHE-03** Implement port + no-cache adapter; Redis adapter chỉ sau justification.
- [ ] **CACHE-04** Terraform private/encrypted Redis nếu được chọn, pool/timeout/capacity/logical namespaces.
- [ ] **EXP-CACHE-01** So sánh no Redis/Redis: hit ratio/latency/DB load reduction/full net cost.
- [ ] **EXP-CACHE-02** Redis failure/invalidation failure/stale refill/stampede và DB fallback saturation.
- [ ] **CACHE-05** Giữ/loại Redis với ADR và raw evidence; invariants luôn dùng source of truth.

## 18. Failure, recovery, SRE experiments

Phụ thuộc: 11–15; cần isolated environment, blast radius/rollback/stop conditions.

- [ ] **FAIL-01** Task/API crash during autosave/submit; không mất acknowledged write và resume được.
- [ ] **FAIL-02** Worker crash after claim/send/commit/ACK windows; duplicate delivery không duplicate effect.
- [ ] **FAIL-03** SQS backlog/poison/DLQ/redrive, processing age SLO và throughput recovery.
- [ ] **FAIL-04** DB connection exhaustion/lock contention/slow query, bounded admission và overload responses.
- [ ] **FAIL-05** RDS Multi-AZ failover, pool reconnect/in-flight transaction outcome/retry correctness.
- [ ] **FAIL-06** Backup/PITR restore-to-new-instance, row/result consistency, endpoint switch và measured RPO/RTO.
- [ ] **FAIL-07** Traffic spike/deploy/rollback under load, AZ/task loss và scaling reaction.
- [ ] **FAIL-08** WAF throttling hợp lệ vs abuse, rate-limit failure policy và cost impact.
- [ ] **FAIL-09** CloudWatch sampling/retention optimization vẫn đủ incident diagnosis và audit.
- [ ] **FAIL-10** Runbooks/alerts/on-call/operator permissions; mỗi recovery có timestamp + raw evidence.

## 19. FinOps, normalized metrics, Performance–Cost Curve

Phụ thuộc: measured configs 14–18 và actual cost/usage provenance.

- [ ] **COST-01** Idle/normal/peak cost breakdown cho compute/RDS/ALB/CDN/WAF/S3/SQS/network/secrets/telemetry/backups.
- [ ] **COST-02** Cost/unit và billing basis: per run/hour/month, fixed/shared allocation, region/rate/date/taxes/discounts.
- [ ] **COST-03** Sustainable RPS/USD và concurrent users/USD với time basis rõ ràng.
- [ ] **COST-04** Jobs/USD, cost/1,000 users, cost/10,000 attempts, cost/1M requests.
- [ ] **COST-05** p95/p99 tại mỗi cost/config; utilization/headroom trước saturation và highest-cost service.
- [ ] **COST-06** Right-sizing/ARM/scheduled scaling/Spot/offload/pool/cache/log retention/data lifecycle experiments.
- [ ] **COST-07** NAT/endpoint/cross-AZ comparison và operations/TCO, không chỉ service sticker price.
- [ ] **COST-08** Build reproducible curve artifact từ measured feasible/infeasible configs; chưa có dữ liệu thì để trống.
- [ ] **COST-09** Chọn lowest full cost thỏa security/correctness/durability/SLO/reliability/committed capacity.
- [ ] **COST-10** Marginal performance của +$1 và kiểm thử scenario giảm 20% cost; báo caveat nếu không tuyến tính.

## 20. Production acceptance và bàn giao

Phụ thuộc: mọi hard gate, không chỉ deploy thành công.

- [ ] **DONE-01** API/product/admin flows hoàn chỉnh và có E2E, permission/answer-key leakage controls.
- [ ] **DONE-02** Transaction/idempotency/concurrency/outbox/inbox correctness có PostgreSQL/queue evidence.
- [ ] **DONE-03** SLO/capacity qua baseline/stress/saturation/soak/burst, có bottleneck và sustainable limit.
- [ ] **DONE-04** Security/HA/backup/PITR/recovery/deploy/rollback controls đã thử thật.
- [ ] **DONE-05** Maximum RPS/concurrent users/p95/p99/DB saturation/optimal pool/cache effect/worker/scaling/recovery được định lượng.
- [ ] **DONE-06** Idle/normal/peak/unit cost, dominant service, marginal USD và 20%-cost-reduction scenario có data.
- [ ] **DONE-07** Performance–Cost Curve và selected feasible configuration có decision record.
- [ ] **DONE-08** Hoàn tất [production acceptance ledger](production-acceptance.md), runbooks, evidence links và known limitations.
- [ ] **DONE-09** Bàn giao reproducible deploy/benchmark/restore hướng dẫn, image/schema/config provenance và operational ownership.

Không có deadline giả định trong roadmap. Sau khi chốt quy chuẩn, phase tiếp theo nên là SPEC + database/UoW/Identity/Catalog để có một vertical slice kiểm chứng được, rồi mới mở rộng và đo trên AWS.
