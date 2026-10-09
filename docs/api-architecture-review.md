# Review API và persistence trước chuẩn hóa kiến trúc

Latest2026-10-09: [submission publisher review](outbox-dispatch-2026-10-08.md) accepts plain Assessment Application → ports, module-private pg relay, global SQS adapter and public worker factory. No new business module or ORM/broker abstraction. Post-lock lease fencing/ambient-UoW guard and narrow replay/worker grants have real PG evidence; consumer/AWS remain open.

Ngày 2026-10-06. Baseline source commit `cac9416`; working tree sạch trước increment tài liệu. Sections1–6 giữ review trước normalization; links đã cập nhật theo file moves. **Kết luận sau triển khai: placement đã chuẩn hóa, RV-01–05 CLOSED với152 tests và actual entry-point checks; RV-06 đã CLOSED locally sau [browser HTTPS](evidence/identity-https-2026-10-07/README.md), RV-07 còn pending** tại [closure](#7-closure-sau-source-normalization). Phạm vi: Identity HTTP/application/persistence/crypto/email worker, shared technical code, configuration/composition và quality checker. Đây không phải production security/performance certification.

## 1. Phần đang đạt

- Controller phụ thuộc `IdentityService` và inbound `HttpSessionPort`, không gọi SQL/SDK. Application nhận repository/UoW/password/token/security/receipt ports; không import Nest/pg/Redis/AWS. Domain policy thuần TypeScript. Factory trong IdentityModule/AppModule là composition roots hợp lệ, được bind concrete adapter.
- PostgreSQL adapter sử dụng bind parameters; SQL identifiers động ở session lookup lấy từ closed `access | refresh` union, không từ client. UoW dùng một checked-out client, AsyncLocalStorage resolve per call, nested join rollback-only, reject context đã đóng, cleanup/release connection và bounded pool/timeouts. Các query casts/types không thay thế kiểm chứng DB constraints.
- Password hash/verify ngoài transaction; account → challenge/family lock order; DB time đọc sau lock. Activation, candidate grant/email intent, session rotation, profile/audit/receipt có boundary rõ. Refresh replay commit revocation rồi mới trả lỗi. Không đổi các semantics này khi refactor.
- Read principal/profile dùng SQL projection, không hydrate full aggregate hoặc fetch permissions từng role. Đây là lựa chọn query shape, không bằng chứng thắng ORM. Permissions/session vẫn kiểm tra DB authority.
- Email worker dùng application delivery/mail ports; SMTP/SES ở adapters, ngoài DB transaction. Durable intent, lease/fencing, bounded retry/park/cleanup và restricted worker DB role đã có tests; không biến email intent thành attempt-specific outbox để dùng chung tên folder.

## 2. Route review

9 business routes hiện có; `/live`, `/ready` là operational endpoints ngoài success envelope. 46 operations trong OpenAPI là **contract inventory**, không phải 46 routes đã triển khai. Catalog/attempt/save/submit/result/leaderboard/admin APIs còn pending.

| Route | Behavior / boundary hiện tại | Kiểm chứng và việc phải giữ |
| --- | --- | --- |
| `GET /v1/auth/csrf` | HTTP transport admission + signed CSRF response | Origin/cookie/expiry context; không log token |
| `POST /v1/auth/register` | Generic202, email/password pending, account/challenge/intent trong UoW | Duplicate registration, unique normalized email, hash ngoài transaction |
| `POST /v1/auth/email-verification/request` | Generic202, user lock, cooldown/send limits, reusable unexpired challenge | Resend không gia hạn token hoặc thay password |
| `POST /v1/auth/email-verification/confirm` | POST token + final email-owner password; account→challenge locks | One-use30min, consumed retry không overwrite, không auto-login |
| `POST /v1/auth/login` | Rate reservation trước hash; revalidate locked account; JWT pair + session/audit | Email verified/enabled/current credential; no JWT JSON; ES256/private-public keys |
| `POST /v1/auth/refresh` | Refresh cookie, account→family lock, consume + new session; replay revoke | Concurrent refresh fails closed, audit/revocation must commit before401 |
| `POST /v1/auth/logout` | Verify known session, revoke/audit once, clear cookies | Retried logout with revoked cookie context allowed only for logout |
| `GET /v1/me` | Authenticate SQL projection/current permissions + scoped rate limit | No full aggregate, no password/hash/token fields |
| `PUT /v1/me` | UUIDv7 receipt/fingerprint, lock user, re-auth/current permissions, revision, atomic update/audit/receipt | Receipt before revision check; different payload conflict; rollback on audit failure |

Route/body/status/cookie/CSRF/security/idempotency behavior không thay đổi vì chuyển folder hoặc chọn ORM. Authentication read projections không được cache theo TTL làm chậm disable/revoke nếu không có decision rõ về security semantics.

## 3. Findings có hành động

Priority dùng cho normalization: P1 = gate phải giữ/khắc phục trước nghiệm thu liên quan; P2 = placement/maintainability cần xử lý; P3 = guard/hygiene. Không gọi folder mismatch là vulnerability.

| ID / priority | Evidence của baseline trước move | Vấn đề và tác động lúc review | Việc cần làm / gate |
| --- | --- | --- | --- |
| **RV-01 / P2** | `apps/api/src/platform/*`; [main](../apps/api/src/main.ts), [AppModule](../apps/api/src/app.module.ts) | Runtime vẫn layout cũ; main/module/CLI/benchmark imports phụ thuộc path cũ. Rename riêng thư mục làm đứt build/start/migrate. | N-05/06/09; cập nhật consumers và compiled assets đồng thời; smoke actual entry points |
| **RV-02 / P2** | [IdentityRepository](../apps/api/src/modules/identity/domain/repositories/identity.repository.ts), lines1–93 | Port trộn account/challenge/session writes với principal/profile read và crypto-issued types. Move nguyên vào `domain/repositories` sẽ tạo Domain → Application. | N-07; phân loại domain write model/repository và application projection/crypto/delivery port; không repository per table |
| **RV-03 / P2** | [runtime-config](../apps/api/src/infrastructure/security/authentication/secret-loader.ts), lines1–42; database config | Typed config, validation và secret-file I/O gộp một adapter. Copy vào config không có tách responsibility sẽ che security implementation. | N-05; typed settings/validation + infra secret loader, API/worker riêng, giữ secret permission/size/keyring guards |
| **RV-04 / P2** | [worker root](../apps/api/src/workers/outbox/verification.main.ts), lines2–31; operator root | Current root wiring concrete private module adapters là composition, không hiện chứng minh cross-business violation. Tuy nhiên normalized global worker không nên phải biết toàn private repository/crypto graph. | N-08; Identity public worker/operator factory hoặc module, process roots chỉ lifecycle; không export repository |
| **RV-05 / P1** | [quality checker](../scripts/quality.mjs), `inspectImports` | Guard nhận `/domain`, `/application`, `/presentation`, `/platform`; chưa chặn business→`shared/common`/config/workers hoặc global infra→business theo layout mới. Cross-module private application imports chưa restricted tới public facade. Passing checker hiện tại không chứng minh new layout. | N-04 trước move; fail-first fixtures cho static literal/barrel imports/new roots + public entry allowlist; giữ old checks trong transition |
| **RV-06 / P1 acceptance** | [VerificationWorker](../apps/api/src/modules/identity/application/services/verification-worker.ts), line32; ID-07 | Email gửi `/verify-email#token=…`, chưa có browser landing/password-confirm flow/actual HTTPS test. Backend contract có nhưng end-to-end candidate activation chưa hoàn chỉnh. | Tiếp tục ID-07/WEB-02 sau normalization; test actual browser secure cookies/Origin/fragment handling; không mark email UX done |
| **RV-07 / P1 acceptance** | [Phase04 review](phase-04-review.md), ID-11/OBS/load gates | Local SMTP/SES adapter tests không xác nhận live sender/bounce/complaint/suppression; timing callbacks/logs chưa là full production metrics/traces. Chưa có k6/AWS saturation/cost. | Giữ ID-11/OBS/load/acceptance pending; không infer production readiness từ source tree/tests |

IdentityService hiện326lines giữ nhiều cohesive flows. Đặt vào `application/services` là bước placement; chỉ tách commands/queries/services khi có cohesion/testability benefit. Không tự thêm mediator/CQRS package, generic repository hoặc façade cho mọi method.

## 4. Vì sao code hiện dùng pg?

`pg` là driver PostgreSQL mức thấp. [ADR-001](adr/001-project-adoption.md) chọn parameterized SQL adapter để kiểm soát query shape, projections, PostgreSQL locks/`ON CONFLICT`/DB clock/`SKIP LOCKED`, query counts và quyền DB. Lựa chọn này do implementation đưa ra; user không yêu cầu cấm ORM. Công cụ không phải Architecture Contract: port, UoW và ownership mới là contract.

Ưu điểm thực tế của implementation hiện tại: SQL/lock/round trips nhìn trực tiếp, dùng native PG functions/constraints và không cần entity hydration cho projections. **Chi phí của lựa chọn:** phải tự viết/maintain row mapping, query builder logic, UoW/context/pool/error handling và migration asset tooling. Đây là maintenance burden có thật; chưa đo tổng developer effort hoặc AWS savings.

node-postgres yêu cầu tự BEGIN/COMMIT/ROLLBACK và dùng cùng client cho tất cả statements trong transaction. Code hiện tuân theo yêu cầu đó; `pool.query` độc lập không phải thay thế transaction context. [Tài liệu node-postgres](https://node-postgres.com/features/transactions).

Không có experiment `pg vs TypeORM vs Sequelize`. Historical local diagnostic của Identity có latencies/query counts nhưng khác framework traffic/connection/TCO setup chưa được so sánh. **Không thể kết luận pg nhanh/rẻ hơn ORM, hay ORM không phù hợp production.** Câu “raw SQL avoids ORM allocation” trong ADR-001 phải hiểu là query-shape hypothesis, không measured win hoặc lý do bắt buộc bỏ ORM.

## 5. TypeORM và Sequelize có phù hợp không?

| Tiêu chí | pg hiện tại | TypeORM candidate | Sequelize candidate |
| --- | --- | --- | --- |
| Domain/Application độc lập | Đạt khi driver confined to adapters | Đạt nếu ORM entity/repository/manager confined to adapters | Đạt nếu model/transaction confined to adapters |
| Mapping và aggregate persistence | Tự viết SQL/row mapping | Entity + mapper + repository theo template đã có | Model + mapper + repository, cần conventions/example riêng |
| Read projection tối ưu | Parameterized SQL | QueryBuilder raw selection hoặc bound raw SQL qua active manager | Raw query với bind parameters qua same transaction |
| Transaction/locks | Manual client/UoW/context đang kiểm chứng | Transactional manager/QueryRunner; vẫn phải làm join/rollback-only/admission contract | Managed/unmanaged transaction, explicit transaction propagation; vẫn phải kiểm chứng UoW contract |
| PostgreSQL-specific behavior | SQL/functions/constraints explicit | SQL migrations và raw query khi ORM không biểu đạt đầy đủ | SQL migrations và raw query khi ORM không biểu đạt đầy đủ |
| Performance/cost winner | Chưa đo so sánh | Chưa đo | Chưa đo |

TypeORM yêu cầu dùng supplied transactional manager, không global manager trong transaction; raw projections vẫn dùng `getRawOne/getRawMany` và select fields cần thiết. Như vậy ORM không bắt buộc hydrate aggregate ở read path hoặc bỏ query optimization. [TypeORM transactions](https://typeorm.io/docs/transactions/), [efficient QueryBuilder](https://typeorm.io/docs/performance-optimization/efficient-use-of-query-builder/).

Sequelize hỗ trợ managed/unmanaged transactions, locks và raw queries; bound values gửi riêng SQL qua `bind`. Điều quan trọng vẫn là propagate cùng transaction cho mọi call. [Sequelize transactions](https://sequelize.org/docs/v6/other-topics/transactions/), [raw queries/bind](https://sequelize.org/docs/v6/core-concepts/raw-queries/).

**Đề xuất:** đánh giá TypeORM làm persistence layer chuẩn + optimized read projections, vì phù hợp tree/template yêu cầu và giảm custom mapping effort; đây là suy luận về maintainability, chưa phải benchmark conclusion. Giữ pg runtime trong increment docs/move; triển khai PoC theo O-01–04 rồi ghi ADR chọn. Không chạy hai pool khác nhau trong một UoW, không inject EntityManager/TypeORM Repository vào Application, không synchronize/schema rewrite. Chọn Sequelize nếu một trade-off đã kiểm chứng hoặc team preference khiến nó phù hợp hơn; không viết ba implementations đầy đủ khi chưa có lý do.

## 6. Evidence và giới hạn review

Prior runtime evidence: **64 Jest unit +26 tooling +30 PostgreSQL foundation +22 Identity integration =142 PASS, none skipped** tại Phase04 validation. Real tests cover concurrent refresh/activation, shared rate admission, audit rollback, receipt/revision races, worker fencing/cleanup/role isolation và SQL constraints/UoW/pool/timeouts. Chưa rerun integration trong increment tài liệu này; test code đã được đối chiếu với affected semantics.

Increment review ban đầu chỉ cập nhật docs/findings; source move được triển khai sau fail-first N-04 regressions trong increment kế tiếp. Evidence142 tests ở trên là lịch sử, không thay bằng kết quả mới. Local loopback benchmark không phải sustainable RPS, load test, isolation-resistant enumeration proof hoặc AWS SLO/TCO evidence.

## 7. Closure sau source normalization

[Checklist](architecture-normalization-plan.md) N-01–12 complete. Fresh evidence: **66 Jest +34 Node tooling +30 PostgreSQL foundation +22 Identity HTTP/SMTP =152 PASS**, none skipped; lint/typecheck/build/quality/contracts PASS. API/worker actual compiled roots live/ready/SIGTERM PASS; operator CLI bootstrap/grant/revoke ghi3 audits và reject repeated bootstrap. Eight source/built migrations match baseline checksums; fresh CLI apply8 và repeat từ `/tmp` apply0. [Validation](validation.md), [raw diagnostics/report](../experiments/architecture-normalization/README.md).

| Finding | Trạng thái | Implementation/evidence đóng |
| --- | --- | --- |
| RV-01 | CLOSED | Source đặt tại config/shared/modules/infrastructure/workers; package/build/CLI/test/bench/smoke imports đã cập nhật; không legacy source/compiled tree; actual roots pass |
| RV-02 | CLOSED | [Domain repository](../apps/api/src/modules/identity/domain/repositories/identity.repository.ts) chỉ dùng [persisted types](../apps/api/src/modules/identity/domain/entities/identity-state.ts); [IdentityQuery](../apps/api/src/modules/identity/application/ports/identity-query.port.ts) chứa principal/CSRF reads; same executor, real audit/receipt races pass |
| RV-03 | CLOSED | [Pure config validation](../apps/api/src/config/config.validation.ts) và [secret loader](../apps/api/src/infrastructure/security/authentication/secret-loader.ts) tách biệt; CA I/O ở database loader; existing security validation và hai pure-config regressions pass |
| RV-04 | CLOSED | [Worker factory](../apps/api/src/modules/identity/identity-worker.factory.ts)/[operator factory](../apps/api/src/modules/identity/identity-operator.factory.ts) public; roots chỉ compose capability/process lifecycle; SMTP integration qua factory, lease/fencing/role isolation và actual operator CLI pass |
| RV-05 | CLOSED |16 [quality guard tests](../scripts/__tests__/quality.unit.spec.mjs), fail-first new boundary/legacy/barrel regressions; cross-module public allowlist; global technical roots/business dependencies/unsupported aliases checked |
| RV-06 | CLOSED local | ID-07/WEB-02:10 actual Chromium HTTPS cases với real API/PG/SMTP; inert landing, final password, cookies/Origin/CSRF, shared-cookie tabs và fault/recovery. Scoped leaf trust; AWS/public PKI vẫn pending |
| RV-07 | PENDING | Live SES, production metrics/traces/k6/AWS saturation/FinOps vẫn chưa đo |

Self-review kiểm tra moved code thay vì chỉ nhìn deletion diff: PostgreSQL executor/worker business body giữ semantics, projection SQL chuyển nguyên shape, fixtures không bỏ assertion,8 migration bytes giữ nguyên. Đổi operator mapping sang `workers/operator` được giải thích tại ADR-006 để global infrastructure không import business. HTTP/OpenAPI/schema/dependency lock không đổi.

Three before/three after diagnostics giữ query counts; me/refresh/logout p95 tăng trong quan sát local. Chấp nhận normalization về structure/correctness đã kiểm chứng; không kết luận performance tốt hơn hoặc loại trừ regression dưới AWS concurrency. pg vẫn là adapter hiện tại để giữ phạm vi change; TypeORM + raw projection là candidate của O-01–04, chưa có measured winner hay ORM implementation. Browser/live provider/AWS production acceptance vẫn riêng.

## 8. Persistence evaluation closure — 2026-10-07

Sections1–7 giữ review lịch sử trước/ở normalization; nhận định “chưa có comparison” ở trên không phải trạng thái hiện nay. O-01–04 đã hoàn tất local: [experiment](../experiments/persistence-comparison/README.md), [raw samples](../experiments/persistence-comparison/raw.json), [all groups](../experiments/persistence-comparison/measurements.md) và [ADR-008](adr/008-persistence-evaluation.md). User yêu cầu đánh giá cả TypeORM và Sequelize, nên cả hai có PoC riêng với raw/mapped paths; không convert toàn bộ production persistence chỉ để so sánh.

100.000 users/families/sessions, pool4, concurrency1/8/32,5 blocks xoay thứ tự:75 configurations/76.800 application operations/0 errors. Principal/refresh/profile giữ1/8/10 actual driver queries cho cả năm mode. TypeORM raw có latency gần pg; mapped paths thêm CPU/cold footprint trong quan sát. Some ORM raw medians thấp hơn pg, nhưng variance/closed-loop/shared host ngăn causal speed/savings conclusion. Không lấy application p95 thay HTTP/AWS SLO.

42 experiment checks PASS gồm actual PG transaction/race/crash/HTTP/CSRF/cookie behavior.100 unit/tooling +53 existing integration PASS sau sửa một pg drain defect: queued admitted work phải hoàn tất trước pool.end. Sequelize metadata INSERT/UPDATE shape phải normalize đúng rowCount để rate admission không bị false429; spike đã sửa rồi mới đo. Audit gốc2 moderate do uuid, scoped override11.1.1 rồi0 findings. Native rollback warning/lifetime/private diagnostic API/whole strict-TypeScript coverage vẫn là adoption gaps, không được che bằng logging=false hoặc runtime tests.

Decision: giữ pg cho Identity hiện tại theo evidence/control/TCO reasoning tại ADR-008; TypeORM viable và có gate reopen cho CRUD-heavy benefit. Candidate dependencies chỉ ở experiment package; root API dependencies/HTTP/events/eight migration checksums không đổi. Full Identity/worker/operator ORM conversion, AWS capacity/pool/TCO, browser HTTPS/live SES và production telemetry/recovery vẫn chưa được accept. RV-06/07 vẫn PENDING; separate frontend work không thuộc review này.


## 9. Browser HTTPS closure — 2026-10-07

RV-06 closed locally after [RED/GREEN evidence](evidence/identity-https-2026-10-07/README.md). Fixed fresh-CSRF logout retry, anonymous verification boundary, response-body timeout/classification, confirmed-login recovery reset and profile reauth action. Domain/Application, repositories/UoW, JWT/JSON/event/schema and8 migration bytes remain unchanged. Fresh100 backend unit/tooling +53 integration +73 web unit +10 browser cases PASS. Browser trust is an ephemeral SPKI exception with Node CA/SAN probes; no public PKI or AWS acceptance. RV-07, live SES and other business/cost/load gates remain pending. Section8 is the earlier persistence experiment, whose source/evidence was not rerun or rewritten.

## 10. Catalog implementation 2026-10-07 — acceptance reopened

Catalog lives in `apps/api/src/modules/catalog` with domain, application, infrastructure and presentation. `CatalogModule` wires pg adapters to application ports. Domain and application do not import Nest, pg or an SDK. Identity is used through `identity/application/facades/identity.facade`: authenticate, requirePermission, and `revalidate` inside the caller transaction. Presentation does not import Identity infrastructure. Write repository port stays in domain. Projection and cursor ports stay in application.

Routes follow the existing OpenAPI catalog operations. Sections and membership stay inside `ExamWriteRequest`. There is no separate section route and no attempt route. Permissions are `catalog.read`, `catalog.manage`, `catalog.keys.read` and `catalog.import`. Unsafe writes keep Origin, CSRF, rate admission and the server request id. The actor comes from the session, not the body. List responses use the page envelope `{data, metadata:{next,pageSize}}`.

Publication inserts a new frozen version, sections, questions, options and keys in the same transaction as the exam pointer, audit and receipt. Runtime still has no UPDATE on snapshot tables. Bank edits do not change a committed snapshot. Unpublish clears the current pointer flag and leaves the frozen rows. A second connection does not see the version before commit. Import v1 is JSON, at most100 questions, with malformed input rejected before a report and semantic errors stored as a safe report. Dry-run writes the report without bank rows.

`0009_catalog_question_points.sql` is forward-only. Bytes of0001–0008 are unchanged. The build copies all nine files into `dist`. Evidence and limits are in [the Catalog diagnostic](evidence/catalog-2026-10-07/README.md). CAT-10, ID-11, Assessment start, Reporting, Terraform and production acceptance stay open. This section does not rewrite sections1–9.

## 11. Independent Catalog review 2026-10-07

[Detailed report](catalog-review-2026-10-07.md) supersedes local Catalog closure claims: GR-01 post-lock publication time (P1), GR-02 route body caps (P1), GR-03 exact detail DTO (P2), GR-04 strict calendar validation (P2), GR-05 pre-existing root test discovery (P2), GR-06 diagnostic/provenance gaps (P2). Placement and public-facade boundaries remain valid. Five runtime review assertions are RED, pagination control and existing regressions PASS; no runtime fix is included in the review. CAT-01/03/04/06/08 and BOOT-01 reopened; CAT-10/start race/production remain open. RV-01–06 historical normalization/Identity closure is not overwritten.

## 12. Catalog fixes and architecture conformance closure — 2026-10-07

Section11 records the historical RED review. [Fix report](catalog-fixes-2026-10-07.md) now closes GR-01–06 locally with [fresh evidence](evidence/catalog-fixes-2026-10-07/README.md):199 root tests (89 API/37 tooling/73 Web),83 actual PostgreSQL/SMTP and10 Chromium HTTPS cases PASS. BOOT-01/CAT-01/03/04/06/08 accepted again. At that point CAT-10 stayed PARTIAL. ID-11 and production remain open.

## 13. Assessment core local — 2026-10-07

Assessment HTTP now implements start, resume, questions, answers, save, submit and status in `modules/assessment`. The controller uses the Identity public facade for `assessment.take`, ownership and session authority. Unsafe methods keep Origin, signed CSRF, rate admission and correlation. Assessment Application reaches Catalog through `sharePublication`, `frozenQuestionSlice` and `frozenChoices`; the declared owned-answer SQL projection also joins frozen position/option IDs on the read side. Domain and Application do not import Nest, pg, SQL or an SDK. The submission outbox is an Assessment port and a pg adapter over `platform.outbox`.

Measured query counts on the frozen local run exceed three OpenAPI ceilings: start 13 against 12, save 18 against 11, submit 13 against 10. Questions, answers and status meet 4, 4 and 3. The extra statements are the CSRF family lookup, authenticate outside the transaction, revalidate inside it, and five save statements required because a data-modifying CTE cannot see its own writes and runtime has no UPDATE on answer selections. The ceilings were not raised. [Summary](evidence/assessment-2026-10-07/summary.md) is sequential local evidence, not an SLO or an AWS result. RV-07, live SES, grading/SQS and production acceptance stay pending. The original CAT-10 closure is superseded by the independent review below; first-publication and republish locking JOIN races are RED.

Catalog owns publication eligibility after serialization locks; the Application coordinates through repository clock/locks and existing UoW. Pure Domain owns calendar/Unicode/shape policies. Presentation owns bounded route body metadata: exam128KiB/question512KiB/import1MiB. Generic global HTTP applies trusted technical metadata without importing a module or recognizing its URLs. SQL query adapters return exact public DTOs, keeping browse cursor state private. pg and five-root layout remain as adopted; no new ORM/layer/architecture exception or ADR is required.

Snapshot/pointer/audit/receipt are atomic, replay and permission revalidation remain intact; real lock/close and timeout regressions prove rollback. Nine source/built migration hashes match baseline. [Diagnostic](evidence/catalog-fixes-2026-10-07/diagnostic/README.md) captures exact adapter EXPLAIN,25 real publish windows and actual transaction/lock/pool observations. Lock round trips are not lock-hold duration, missing samples are null and local sequential latency does not prove production SLO/capacity/cost. Historical evidence is retained, with no claimed optimization improvement.

## 14. Independent Assessment API review — 2026-10-08

[Report](assessment-review-2026-10-07.md)/[evidence](evidence/assessment-review-2026-10-07/README.md) reopen CAT-09/10 and ATT-01–04: stale publication snapshot after lock(P1), set-valued fingerprint, whole-response byte cap, UUID spelling and existing query ceilings(P2). Five-root/ports/UoW/outbox placement remains intact; no ORM/architecture exception is introduced. Actual concurrent saves and observed save/submit controls PASS.217 root +90 existing PG/SMTP (3 diagnostic writers deselected) +10 HTTPS PASS;6 independent assertions RED/3 controls PASS. Current scoped acceptance is63/216; original Grok evidence is preserved. No runtime fix or production/performance-cost acceptance in this review.

## 15. Assessment fixes and architecture conformance — 2026-10-08

[Closure](assessment-fixes-2026-10-08.md)/[new evidence](evidence/assessment-fixes-2026-10-08/README.md) supersedes open AR-01–05 acceptance. Catalog owns a fresh post-lock publication read, Assessment domain repository supplies post-lock time and bounded answer mutation, and Presentation/HTTP adapter owns complete envelope sizing. UUID and option sets canonicalize before fingerprint/membership. Identity exposes only public authenticated admission; its technical write port is separate from read-only IdentityQuery. Mutation revalidation after user lock is unchanged. SQL/shared-common/driver/Nest do not enter Application/Domain; grants and ten migration bytes stay unchanged.

Final query counts start11/save11/submit10 within ceilings12/11/10; reads4/4/3.234 root,105 integration (1 historical Catalog diagnostic deselected),10 actual HTTPS PASS. Two observed publication/start races, independent-UoW saves, both save/submit orders and CSRF/credential/permission/shared-throttle controls pass. CAT-09/10 and ATT-01–04 accepted locally again;69/216. Local p95/p99 are observations, not sustainable AWS capacity or cost/SLO acceptance. ATT-07–11 broader coverage, ID-11/Phase04 and production remain open. Historical review/evidence stays immutable.

## 16. Deadline sweep — historical implementation review, 2026-10-08

[Evidence](evidence/assessment-expiry-2026-10-08/README.md) accepts ATT-07 locally and moves the roadmap to 70/216. Assessment Application owns `acceptAttemptSubmission` for both HTTP `MANUAL` and the internal `DEADLINE` sweep. Presentation still authorizes the candidate write. The scheduler entry only starts the loop, health server and shutdown. It does not add a public route that skips authorization. Domain and Application still do not import Nest, pg, SQL or an SDK. The public worker factory is the composition root for private adapters. pg stays the persistence adapter under ADR-008.

Claim is one `IN_PROGRESS` row, `ORDER BY deadline, id LIMIT 1 FOR UPDATE SKIP LOCKED`, then `clock_timestamp()` after the lock. A batch does not hold many row locks. One outbox failure rolls back only that attempt. `0011` adds `submission_kind` and replaces `validate_completion()` as `SECURITY DEFINER` with the same predicate, so the expiry role can commit `EXPIRED` without `SELECT` on scores. `0001`–`0010` bytes are unchanged. The event schema already allowed `MANUAL` and `DEADLINE` and was not edited.

Fresh root 249 and restricted integration 123/123 on 7 suites. Manual query ceilings are unchanged at 11/11/10 and 4/4/3. Identity HTTPS was not rerun. Local deadline-to-commit lag includes seeded queue age and is not SQS or result latency. ATT-08/09 and the rest of ATT-10/11, scoring/SQS, Reporting and production remain open. Historical evidence directories were not overwritten.

## 17. Independent deadline review — 2026-10-08

[Report](assessment-expiry-review-2026-10-08.md) supersedes section16's acceptance. ATT-07 reopened; roadmap69/216. Boundary/composition/shared core and atomic attempt/outbox controls pass. Four defects remain: full failed-batch starvation; accepted NULL provenance passing CHECK; volatile discovery/backlog predicates missing an index range; acceptance time mislabeled commit lag. Fresh root249/PG122 PASS (one historical diagnostic deselected), lint/typecheck/build/contracts PASS; independent probes4 RED/3 controls PASS. Existing ATT-07 raw hashes match source, but their lag field must not be interpreted as measured durability time. Do not rewrite archived evidence or applied migrations. No new architecture or persistence technology is required by this review.

## 18. ATT-07 review-fix closure — 2026-10-08

[Closure](assessment-expiry-fixes-2026-10-08.md)/[evidence](evidence/assessment-expiry-fixes-2026-10-08/README.md) supersedes section17's open outcome: ER-01–04 closed locally; ATT-07 restored70/216. PostgreSQL retry metadata behind an Assessment Application port survives worker replacement; a separate post-rollback short UoW rechecks IN_PROGRESS under a row lock and leaves a concurrent winner alone. No lease/new resource/business FAILED is needed for an atomic claim+effect. Existing public worker factory, shared acceptance core, API contracts and dependency boundaries remain.

Forward0012 rejects accepted NULL explicitly and fails closed on existing corrupt provenance;0013 adds two bounded workflow fields with expiry-only UPDATE.0001–0011 remain byte-identical. Discovery/backlog use statement_timestamp for the existing index range and retain the authoritative post-lock clock. An optional synchronous Application observer measures successful root-UoW COMMIT acknowledgement; DB clock calibration is a diagnostic concern in the MJS harness. No TypeORM/SQL/framework/collector I/O enters business layers. Raw v1 commit labels are corrected by a new report, not rewritten.

Final254 root/144 full PG+HTTP+SMTP PASS,0 skipped;21 independent migration/fairness/permission/clock/observer/index regressions. Start11/save11/submit10, reads4/4/3 keep ceilings. Four before/after healthy sweeps plus restricted natural100k-future counterfactual plans and compiled SIGTERM/restart have final source hashes. Local range improvement is measured; AWS sustainable throughput, cost, pool optimum and wider recovery/SLO acceptance remain unmeasured. Broader ATT-10/11, grading/SQS/retention/Reporting and ID-11/Phase04 stay open.
