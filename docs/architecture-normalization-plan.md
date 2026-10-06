# Kế hoạch chuẩn hóa kiến trúc có đánh dấu

Cập nhật 2026-10-06. Contract: [.ai/architecture.md §5](../.ai/architecture.md#5-target-project-structure), [ADR-006](adr/006-source-layout-normalization.md). Phạm vi hiện tại: cập nhật quy chuẩn, review API và lập kế hoạch; chưa di chuyển source hoặc cài ORM. Product roadmap vẫn **50/216**; checklist normalization dưới đây được theo dõi riêng để không biến refactor thành feature đã hoàn thành.

## 1. Quyết định và giới hạn

`src/` trong cây mới tương ứng `apps/api/src/`. Giữ monolith, ownership Identity/Catalog/Assessment/Reporting và độc lập API/worker; không tạo Invoice/POS module. Cây là hướng dẫn đặt file, không yêu cầu tạo hết folder/base class. Kafka, Redis và TypeORM chỉ có implementation sau khi có quyết định sử dụng. SQS là messaging mục tiêu cho scoring; email hiện dùng Identity-owned durable PostgreSQL intents.

Thứ tự: **guard kiến trúc → config/shared → database/HTTP → Identity → worker/tooling → kiểm chứng → persistence experiment/decision**. Chuẩn hóa placement trước khi sang Catalog. Không gộp đổi ORM, schema, auth policy và đổi folder vào một thay đổi khó kiểm chứng.

Domain write repository dùng domain models tại `domain/repositories`; read projection/crypto/delivery nằm `application/ports`. Không di chuyển nguyên `IdentityRepository` vào Domain vì nó đang import application crypto types. `shared/common` chứa framework/transport helpers; business layers không được import. Outbox business port nằm phía Application, không lấy port từ `infrastructure/outbox`.

## 2. Mapping source hiện tại → mục tiêu

Tất cả đường dẫn trong bảng đều tương đối với `apps/api/`. Đây là **mục tiêu chưa thực hiện**. SQL schema `platform.*` không đổi.

| Hiện tại | Mục tiêu / xử lý | Điều kiện |
| --- | --- | --- |
| `src/main.ts`, `src/app.module.ts` | Giữ entry point/module, cập nhật wiring | Nest composition được import adapter, business classes không được |
| `src/platform/application/unit-of-work.ts` | `src/shared/application/unit-of-work/unit-of-work.port.ts`; constants chỉ khi dùng DI token | Không manager/client trong port |
| `src/platform/application/{security,idempotency,readiness}.ts` | `src/shared/application/ports/` | Plain contracts; tách audit/rate chỉ khi consumer cần |
| `src/platform/application/shutdown-gate.ts` | `src/infrastructure/resilience/shutdown/` | Process admission/drain mechanism, không business invariant |
| `src/platform/domain/{domain-error,error-category,unavailable.error}.ts` | Shared semantic base/category tại `shared/domain/exceptions`; technical unavailable error tại `shared/application/errors` | Module-owned business errors vẫn `domain/errors`; không HTTP codes trong Domain |
| `src/platform/infrastructure/database/database-config.ts` | `src/config/database.config.ts`, validation tại `config/config.validation.ts` | Không import pg/ORM vào business settings |
| `src/platform/infrastructure/security/runtime-config.ts` | Tách `config/{app.config,config.validation,config.module}.ts` và `infrastructure/security/authentication/secret-loader.ts` | Giữ API/worker key separation, permission/size checks; không config secret trong log |
| `src/platform/infrastructure/database/postgres-database.ts` | `src/infrastructure/database/transaction/` + pool/executor ở database | pg context/UoW hiện tại trước; TypeORM replacements sau O-04 nếu chọn |
| `src/platform/infrastructure/database/{database.module,postgres-idempotency,postgres-readiness}.ts` | Database module; receipts tại `infrastructure/idempotency/`, readiness adapter tại `infrastructure/health/` | Giữ một transaction executor/pool per process role |
| `src/platform/infrastructure/security/postgres-security.ts` | `infrastructure/security/authorization/` cho rate/security persistence; audit mechanism tại `observability/audit/` nếu tách contract | Audit dùng active transaction; reserve login vẫn separate bounded transaction |
| `src/platform/presentation/http/{filters,interceptors}` | `src/shared/common/{filters,interceptors}` | Nest/Fastify code chỉ ở outer layers |
| `src/platform/presentation/http/configure-http-application.ts`, health + HealthModule | Bootstrap ở `infrastructure/http/`; operational health tại `infrastructure/health/` | Operational endpoints là technical inbound adapters, không business module |
| `src/modules/identity/application/identity.service.ts` | `application/services/identity.service.ts`; tách commands/queries theo cohesion khi cần | Không bắt buộc một handler/file cho mỗi method |
| Mixed `identity.repository.ts` | Phân loại write-domain repository và read/auth projection ports | `IssuedTokens`/crypto DTO phải chuyển sang plain persisted input hoặc application-owned port, không Domain → Application |
| Identity SQL persistence adapters | `modules/identity/infrastructure/persistence/postgres/{repositories,queries,delivery}/` | Mapper khi thực sự có domain/row shape khác; TypeORM tương ứng conditional |
| Identity crypto/mail/http adapters | Giữ module ownership tại `infrastructure/{security,mail,http}`; HTTP DTO/controller giữ `presentation/http` | Session policies/verification ciphertext không trở thành shared business helpers |
| `src/worker.ts` | `src/workers/outbox/verification.main.ts`, Identity public worker factory/module | Không export private repository/crypto; worker không load access/refresh private key |
| `src/operator-admin.ts` | `src/infrastructure/security/authorization/operator-admin.ts` dùng module public operator factory | Dedicated operator DB role; không biến thành public admin route |
| `migrations/0001…0008.sql`, migrate/budget runner | `src/infrastructure/database/migrations/`; runner/CLIs tại database | Giữ tên/checksum; copy SQL assets vào build, đúng location trong compiled bundle |
| Integration tests + quality/build/bench/smoke/package scripts | Giữ test roots, cập nhật imports/compiled paths và boundary checks | Không sửa historical benchmark JSON hoặc giảm assertion để pass |

Global infrastructure có thể thêm folder cho cơ chế đang dùng như HTTP, health, idempotency hoặc shutdown: cây §5 không phải danh sách đóng. Không đưa business Identity vào shared infrastructure chỉ để giảm số folder.

## 3. Checklist thực hiện và gate

Normalization: **3/12 hoàn thành**. ORM evaluation: **0/4**, chưa chọn phương án thay runtime.

- [x] **N-01 — Quy chuẩn:** thay §5; đồng bộ rules/conventions/workflow/template/overview/AGENTS/profile/ADR, làm rõ shared/common, outbox port, config, business ownership và transition.
- [x] **N-02 — Review API:** kiểm tra route/controller/application/UoW/persistence/worker/config/tests; ghi điểm đạt, findings, limits và lý do dùng pg trong [review](api-architecture-review.md).
- [x] **N-03 — Kế hoạch:** mapping, thứ tự, checklist, acceptance/rollback và protocol ORM comparison đã có. Hoàn thành tài liệu không có nghĩa source đã chuẩn hóa.
- [ ] **N-04 — Architecture guard trước move:** bổ sung fail-first regressions cho protected layers import `shared/common`, `config`, `workers`, ORM/SDK; shared/global infra/config import business module; Domain → Application; barrels/import-type/import-equals. Hỗ trợ layout cũ lẫn mới trong transition. Kiểm tra module-private application imports qua allowlist public entry point. Không thêm path alias trước khi checker resolve được.
- [ ] **N-05 — Config/shared:** tách typed configuration/validation khỏi secret I/O; chuyển UnitOfWork/technical ports/shared errors. Giữ runtime validation, key separation, startup failure và imports pure. Chạy typecheck/unit/guard sau move.
- [ ] **N-06 — Database + reusable HTTP/security:** chuyển executor/context/modules, rate/audit/receipts/readiness/filter/interceptor/bootstrap; giữ one-connection transaction, rollback-only, bounded admission và drain. Test PG foundation + audit rollback; không đổi schema/migration content.
- [ ] **N-07 — Identity module:** đặt service đúng group; phân loại read/write contracts và plain types; chuyển persistence vào adapter-specific folder; factory public chỉ expose capability. Giữ registration/activation/password/session/rate/receipt semantics. Test Identity races/privileges và HTTP contract.
- [ ] **N-08 — Worker/operator:** chuyển process roots, tạo public worker/operator factory/module; keep orchestration ngoài business rules. Kiểm tra lease/fencing/crash/retry/cleanup/deadline; role isolation; health/drain; không private key signing trong mail worker.
- [ ] **N-09 — Tooling và migration assets:** cập nhật package/start/db/bench/smoke/build/import/test paths; copy 8 SQL migrations vào artifact; kiểm chứng fresh DB + already-migrated DB + checksum equality. Không dùng ORM synchronize hoặc tạo migration history thứ hai. Container path/drill tiếp tục DB-12 khi image workflow có thực.
- [ ] **N-10 — Regression acceptance:** unit/tooling, typecheck/build/lint/quality/contracts; chạy 30 DB +22 Identity cases hiện có, không skipped; thêm regression cần thiết. Actual main/worker health + shutdown; HTTP/session/cookies/CSRF/origin/receipt giữ contract. Record số test thực tế nếu tăng, không cố giữ 142 như chỉ tiêu.
- [ ] **N-11 — Diagnostic trước/sau:** cùng dataset/config/pool/security/traffic trên current và moved code; login/me/refresh/logout + worker lease/retry path. Đo percentiles/queries/round trips/pool wait/transaction duration/CPU/RSS; lưu raw evidence/environment. Repeated runs và phân tích nhiễu trước nhận định; không coi local sequential RPS là sustainable AWS capacity.
- [ ] **N-12 — Đóng transition:** bỏ legacy `platform` source/compiled paths, checker reject legacy/new boundary bypass; self-review diff và links, cập nhật profile/roadmap/validation. Đóng findings RV-01–05; RV-06/07 vẫn theo các production gate riêng. Tiếp tục Catalog khi gate normalization đạt và persistence choice được ghi rõ.

## 4. Persistence experiment — có thể dùng ORM mà vẫn tối ưu SQL

Đề xuất đánh giá **TypeORM + raw projections** vì cây/quy chuẩn đang có examples entities/repositories/mappers/transaction context cho TypeORM. Đây là đánh giá về độ phù hợp và maintainability; chưa phải quyết định rằng TypeORM nhanh hơn, rẻ hơn hoặc tự xử lý mọi transaction requirement. Sequelize vẫn hợp lệ sau cùng một gate.

- [ ] **O-01 — Baseline có thể so sánh:** lấy code/config digest, dataset, Node/PG/hardware, pool/timeouts/security controls và actual transaction/query plans. Rerun current pg nhiều lần; ghi startup/RSS/CPU/query/pool/lock/transaction và latencies. Existing local raw results chỉ làm starting evidence.
- [ ] **O-02 — TypeORM PoC độc lập:** bọc cùng UnitOfWork port; QueryRunner/active manager resolved mỗi call; rollback-only join; preserved back-pressure/timeouts/redaction; một pool/process. Một representative read projection + session refresh và profile/audit/receipt write, cùng HTTP contract. Raw SQL chạy qua active manager/runner; không qua một pg pool riêng. Map entities ở Infrastructure, migrate schema bằng toolchain hiện tại, synchronize=false. Compatibility Node24/Nest12/ARM64 và dependency audit là gate phải kiểm tra thực tế.
- [ ] **O-03 — Comparison + Sequelize nếu cần:** chạy paired/repeated pg vs TypeORM, same traffic/security/dataset/pool/indexes; compare ORM/raw projection paths, real concurrency/correctness/crash tests. Sequelize PoC chỉ khi có trade-off chưa giải quyết hoặc user chọn, để tránh xây ba persistence stacks đầy đủ. Đo developer/maintenance/operational burden cùng runtime metrics; AWS bill/cost ratio chưa có thì để unknown.
- [ ] **O-04 — Decision + staged adoption:** ADR riêng ghi evidence/tolerances/maintenance và phương án chọn. Nếu chọn ORM, convert một path rồi toàn Identity cùng regression gates; không để logical UoW chạy qua hai connection pools. Nếu giữ pg, nêu requirement hoặc evidence cụ thể; không coi existing code là lý do đủ. Production winner chỉ chọn sau SLO/capacity/TCO benchmark thật.

Protocol dừng candidate ngay khi có correctness/security/durability failure. Chọn lowest total cost đáp ứng hard gates/capacity; không loại ORM chỉ vì overhead chưa đo. Chi phí ORM migration/maintenance là TCO phải ghi định tính/giờ thực tế, không quy đổi USD tùy ý. SLO thresholds lấy từ [SLO contract](slo-and-workload.md), không tự hạ vì refactor.

## 5. Rollback và nghiệm thu

Mỗi increment có mapping và checks riêng; rollback về code artifact trước, giữ immutable DB state. Placement-only change không cần schema rollback. Khi chuyển migration root, so sánh checksums trước/sau và test artifact chứa đủ assets; DB receipt là nguồn sự thật. ORM rollout nếu có phải dùng cùng schema/migration semantics để previous compatible image vẫn hoạt động.

N-04–12 chưa hoàn thành nên **runtime chưa conform cây mới**. ORM O-01–04 chưa đo. Browser verification landing/HTTPS và SES production operations vẫn PARTIAL, SQS scoring/Catalog/Reporting/AWS/k6 chưa triển khai. Không thay đổi tick product hoặc historical benchmark vì đã cập nhật tài liệu.

Validation tài liệu của increment này sẽ ghi tại [validation log](validation.md); source moves chỉ được tick sau actual checks bên trên.
