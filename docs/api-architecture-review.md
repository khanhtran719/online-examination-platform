# Review API và persistence trước chuẩn hóa kiến trúc

Ngày 2026-10-06. Baseline source commit `cac9416`; working tree sạch trước increment tài liệu này. Phạm vi: Identity HTTP/application/persistence/crypto/email worker, shared technical code, configuration/composition, quality checker và actual regression tests. Kết luận: **boundary lõi phù hợp, placement chưa conform cây mới; cần chuẩn hóa theo kế hoạch trước khi mở rộng capability**. Đây là review code và evidence hiện có, không phải production security/performance certification.

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

| ID / priority | Evidence hiện tại | Vấn đề và tác động | Việc cần làm / gate |
| --- | --- | --- | --- |
| **RV-01 / P2** | `apps/api/src/platform/*`; [main](../apps/api/src/main.ts), [AppModule](../apps/api/src/app.module.ts) | Runtime vẫn layout cũ; main/module/CLI/benchmark imports phụ thuộc path cũ. Rename riêng thư mục làm đứt build/start/migrate. | N-05/06/09; cập nhật consumers và compiled assets đồng thời; smoke actual entry points |
| **RV-02 / P2** | [IdentityRepository](../apps/api/src/modules/identity/application/ports/identity.repository.ts), lines1–93 | Port trộn account/challenge/session writes với principal/profile read và crypto-issued types. Move nguyên vào `domain/repositories` sẽ tạo Domain → Application. | N-07; phân loại domain write model/repository và application projection/crypto/delivery port; không repository per table |
| **RV-03 / P2** | [runtime-config](../apps/api/src/platform/infrastructure/security/runtime-config.ts), lines1–42; database config | Typed config, validation và secret-file I/O gộp một adapter. Copy vào config không có tách responsibility sẽ che security implementation. | N-05; typed settings/validation + infra secret loader, API/worker riêng, giữ secret permission/size/keyring guards |
| **RV-04 / P2** | [worker root](../apps/api/src/worker.ts), lines2–31; operator root | Current root wiring concrete private module adapters là composition, không hiện chứng minh cross-business violation. Tuy nhiên normalized global worker không nên phải biết toàn private repository/crypto graph. | N-08; Identity public worker/operator factory hoặc module, process roots chỉ lifecycle; không export repository |
| **RV-05 / P1** | [quality checker](../scripts/quality.mjs), `inspectImports` | Guard nhận `/domain`, `/application`, `/presentation`, `/platform`; chưa chặn business→`shared/common`/config/workers hoặc global infra→business theo layout mới. Cross-module private application imports chưa restricted tới public facade. Passing checker hiện tại không chứng minh new layout. | N-04 trước move; fail-first fixtures cho static literal/barrel imports/new roots + public entry allowlist; giữ old checks trong transition |
| **RV-06 / P1 acceptance** | [VerificationWorker](../apps/api/src/modules/identity/application/verification-worker.ts), line32; ID-07 | Email gửi `/verify-email#token=…`, chưa có browser landing/password-confirm flow/actual HTTPS test. Backend contract có nhưng end-to-end candidate activation chưa hoàn chỉnh. | Tiếp tục ID-07/WEB-02 sau normalization; test actual browser secure cookies/Origin/fragment handling; không mark email UX done |
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

Review này cập nhật docs và ghi findings, không sửa source/HTTP contract. Fresh link/contract/quality checks ghi tại [validation](validation.md). Local loopback benchmark không phải sustainable RPS, load test, isolation-resistant enumeration proof hoặc AWS SLO/TCO evidence. Không thay source/test theo layout mới cho đến khi bước N-04 có guard regression.
