# Kế hoạch chuẩn hóa kiến trúc có đánh dấu

Cập nhật 2026-10-06. Contract: [.ai/architecture.md §5](../.ai/architecture.md#5-target-project-structure), [ADR-006](adr/006-source-layout-normalization.md). **Hoàn tất chuẩn hóa source/tooling và kiểm chứng local:12/12.** [Evidence trước/sau](../experiments/architecture-normalization/README.md) và [validation](validation.md) ghi kết quả thực tế; chưa cài/chọn ORM. Product roadmap vẫn **50/216**; checklist normalization theo dõi riêng để không biến refactor thành feature đã hoàn thành.

## 1. Quyết định và giới hạn

`src/` trong cây mới tương ứng `apps/api/src/`. Giữ monolith, ownership Identity/Catalog/Assessment/Reporting và độc lập API/worker; không tạo Invoice/POS module. Cây là hướng dẫn đặt file, không yêu cầu tạo hết folder/base class. Kafka, Redis và TypeORM chỉ có implementation sau khi có quyết định sử dụng. SQS là messaging mục tiêu cho scoring; email hiện dùng Identity-owned durable PostgreSQL intents.

Thứ tự: **guard kiến trúc → config/shared → database/HTTP → Identity → worker/tooling → kiểm chứng → persistence experiment/decision**. Chuẩn hóa placement trước khi sang Catalog. Không gộp đổi ORM, schema, auth policy và đổi folder vào một thay đổi khó kiểm chứng.

Domain write repository đã dùng plain persisted domain models tại `domain/{entities,repositories}`; principal/CSRF projection được tách sang `IdentityQuery`, crypto/delivery vẫn ở `application/ports`. `IssuedTokens` là Application DTO mở rộng persisted input, Domain không import crypto types. Cả repository và query adapter dùng cùng transaction executor. `shared/common` chứa framework/transport helpers; business layers không được import. Outbox business port nằm phía Application, không lấy port từ `infrastructure/outbox`.

## 2. Mapping source trước → placement đã triển khai

Tất cả đường dẫn trong bảng tương đối với `apps/api/`. Cột trái là lịch sử trước normalization; cột giữa là placement thực tế hiện nay. [Machine-readable mapping](../experiments/architecture-normalization/path-mapping.json) lưu file moves. SQL schema `platform.*` không đổi.

| Trước normalization | Placement / xử lý hiện nay | Điều kiện |
| --- | --- | --- |
| `src/main.ts`, `src/app.module.ts` | Giữ entry point/module, cập nhật wiring | Nest composition được import adapter, business classes không được |
| `src/platform/application/unit-of-work.ts` | `src/shared/application/unit-of-work/unit-of-work.port.ts`; constants chỉ khi dùng DI token | Không manager/client trong port |
| `src/platform/application/{security,idempotency,readiness}.ts` | `src/shared/application/ports/` | Plain contracts; tách audit/rate chỉ khi consumer cần |
| `src/platform/application/shutdown-gate.ts` | `src/infrastructure/resilience/shutdown/` | Process admission/drain mechanism, không business invariant |
| `src/platform/domain/{domain-error,error-category,unavailable.error}.ts` | Shared semantic base/category tại `shared/domain/exceptions`; technical unavailable error tại `shared/application/errors` | Module-owned business errors vẫn `domain/errors`; không HTTP codes trong Domain |
| `src/platform/infrastructure/database/database-config.ts` | `src/config/database.config.ts`, validation tại `config/config.validation.ts` | Không import pg/ORM vào business settings |
| `src/platform/infrastructure/security/runtime-config.ts` | Tách `config/{app.config,config.validation}.ts` và `infrastructure/security/authentication/secret-loader.ts` | Giữ API/worker key separation, permission/size checks; composition hiện có đủ, không tạo ConfigModule chưa cần |
| `src/platform/infrastructure/database/postgres-database.ts` | `src/infrastructure/database/transaction/` + pool/executor ở database | pg context/UoW hiện tại trước; TypeORM replacements sau O-04 nếu chọn |
| `src/platform/infrastructure/database/{database.module,postgres-idempotency,postgres-readiness}.ts` | Database module; receipts tại `infrastructure/idempotency/`, readiness adapter tại `infrastructure/health/` | Giữ một transaction executor/pool per process role |
| `src/platform/infrastructure/security/postgres-security.ts` | `infrastructure/security/authorization/` cho rate/security persistence; audit mechanism tại `observability/audit/` nếu tách contract | Audit dùng active transaction; reserve login vẫn separate bounded transaction |
| `src/platform/presentation/http/{filters,interceptors}` | `src/shared/common/{filters,interceptors}` | Nest/Fastify code chỉ ở outer layers |
| `src/platform/presentation/http/configure-http-application.ts`, health + HealthModule | Bootstrap ở `infrastructure/http/`; operational health tại `infrastructure/health/` | Operational endpoints là technical inbound adapters, không business module |
| `src/modules/identity/application/identity.service.ts` | `application/services/identity.service.ts`; tách commands/queries theo cohesion khi cần | Không bắt buộc một handler/file cho mỗi method |
| Mixed `identity.repository.ts` | `domain/repositories/identity.repository.ts`, `domain/entities/identity-state.ts`; `application/ports/identity-query.port.ts` và Application crypto/DTO contracts | Plain persisted input, không Domain → Application; principal/CSRF SQL không thêm round trip |
| Identity SQL persistence adapters | `modules/identity/infrastructure/persistence/postgres/{repositories,queries,delivery}/` | Mapper khi thực sự có domain/row shape khác; TypeORM tương ứng conditional |
| Identity crypto/mail/http adapters | Giữ module ownership tại `infrastructure/{security,mail,http}`; HTTP DTO/controller giữ `presentation/http` | Session policies/verification ciphertext không trở thành shared business helpers |
| `src/worker.ts` | `src/workers/outbox/verification.main.ts`, Identity public worker factory/module | Không export private repository/crypto; worker không load access/refresh private key |
| `src/operator-admin.ts` | `src/workers/operator/operator-admin.main.ts` dùng public Identity operator factory | Sửa mapping dự kiến: global infrastructure không được import business module; dedicated operator DB role, không public admin route |
| `migrations/0001…0008.sql`, migrate/budget runner | `src/infrastructure/database/migrations/`; runner/CLIs tại database | Giữ tên/checksum; copy SQL assets vào build, đúng location trong compiled bundle |
| Integration tests + quality/build/bench/smoke/package scripts | Giữ test roots, cập nhật imports/compiled paths và boundary checks | Không sửa historical benchmark JSON hoặc giảm assertion để pass |

Global infrastructure có thể thêm folder cho cơ chế đang dùng như HTTP, health, idempotency hoặc shutdown: cây §5 không phải danh sách đóng. Không đưa business Identity vào shared infrastructure chỉ để giảm số folder.

## 3. Checklist thực hiện và gate

Normalization: **12/12 hoàn thành local**. ORM evaluation: **0/4**, chưa chọn phương án thay runtime. Các counts và links bên dưới ghi kết quả fresh của source increment, không thay evidence lịch sử.

- [x] **N-01 — Quy chuẩn:** thay §5; đồng bộ rules/conventions/workflow/template/overview/AGENTS/profile/ADR, làm rõ shared/common, outbox port, config, business ownership và transition.
- [x] **N-02 — Review API:** kiểm tra route/controller/application/UoW/persistence/worker/config/tests; ghi điểm đạt, findings, limits và lý do dùng pg trong [review](api-architecture-review.md).
- [x] **N-03 — Kế hoạch:** mapping, thứ tự, checklist, acceptance/rollback và protocol ORM comparison; mapping operator được sửa có lý do tại ADR-006 để giữ global infrastructure độc lập business.
- [x] **N-04 — Architecture guard trước move:** fail-first regressions rồi16 quality tests PASS; chặn business→shared/common/config/workers/ORM/SDK, technical roots→business, Domain→Application và cross-module private imports. Barrels/import-type/import-equals giữ checks; public factory allowlist rõ; unsupported aliases và legacy placement bị reject.
- [x] **N-05 — Config/shared:** typed validation tách khỏi secret/CA I/O; UnitOfWork/ports/errors chuyển đúng root. Hai pure config regressions mới và existing key/URL/permission/TLS validation suites PASS; typecheck và imports guard PASS. Không tạo config wrapper chưa cần.
- [x] **N-06 — Database + reusable HTTP/security:** executor/context/modules/rate/audit/receipts/readiness/filter/interceptor/bootstrap đã chuyển.30 real-PG foundation cases và Identity audit rollback PASS; one-client/join/rollback-only/back-pressure/drain giữ semantics. Không đổi SQL schema/content.
- [x] **N-07 — Identity module:** services/DTO/domain write models/application query ports và PostgreSQL adapter groups đã tách; cả hai adapters dùng cùng executor.22 Identity real-PG/HTTP/SMTP cases PASS gồm session/activation/rate/receipt races và permissions; chín HTTP operations giữ contract.
- [x] **N-08 — Worker/operator:** roots tại `workers/outbox` và `workers/operator`, gọi public factories. Lease/fencing/crash/retry/maintenance/role tests PASS; SMTP integration qua actual public worker factory. API/worker readiness và SIGTERM PASS; actual operator CLI bootstrap/grant/revoke PASS,3 audit rows, repeated bootstrap bị reject; worker không load signing keys.
- [x] **N-09 — Tooling và migration assets:** package/build/start/db/bench/smoke/test paths cập nhật; build copy8 SQL byte-exact, source/built khớp8 baseline checksums. Actual compiled CLI apply8 fresh migrations rồi rerun từ `/tmp` apply0. Hai build-asset tests PASS gồm missing/symlink rejection. Một migration history; DB-12 Linux image/deployment drill vẫn riêng và pending.
- [x] **N-10 — Regression acceptance:** **100 unit/tooling +52 integration =152 PASS**,0 skips; typecheck/build/lint/quality/contracts PASS. Actual compiled API/worker health/drain PASS, combined idle shutdown581.814ms. Không coi cookie jar local là browser HTTPS evidence.
- [x] **N-11 — Diagnostic trước/sau:**3 before +3 after, cùng config/dataset/pool/security/traffic,13 operations gồm worker accepted/retry. [Raw evidence/report](../experiments/architecture-normalization/README.md) có p50/p95/p99/query/pool/transaction/CPU/RSS. Query counts giữ nguyên; me/refresh/logout p95 tăng trong quan sát, không nhận định performance tốt hơn. Sequential local RPS/provider stub không xác định capacity AWS.
- [x] **N-12 — Đóng transition:** legacy source/compiled paths đã bỏ; checker reject legacy và bypass mới; self-review source/SQL/import/contract diff và links hoàn tất; profile/roadmap/validation đồng bộ. RV-01–05 CLOSED; RV-06/07 pending riêng. Current adapter vẫn pg để giữ scope/behavior, không coi là ORM winner; TypeORM evaluation là increment riêng trước quyết định thay persistence.

## 4. Persistence experiment — có thể dùng ORM mà vẫn tối ưu SQL

Đề xuất đánh giá **TypeORM + raw projections** vì cây/quy chuẩn đang có examples entities/repositories/mappers/transaction context cho TypeORM. Đây là đánh giá về độ phù hợp và maintainability; chưa phải quyết định rằng TypeORM nhanh hơn, rẻ hơn hoặc tự xử lý mọi transaction requirement. Sequelize vẫn hợp lệ sau cùng một gate.

- [ ] **O-01 — Baseline có thể so sánh:** lấy code/config digest, dataset, Node/PG/hardware, pool/timeouts/security controls và actual transaction/query plans. Rerun current pg nhiều lần; ghi startup/RSS/CPU/query/pool/lock/transaction và latencies. Existing local raw results chỉ làm starting evidence.
- [ ] **O-02 — TypeORM PoC độc lập:** bọc cùng UnitOfWork port; QueryRunner/active manager resolved mỗi call; rollback-only join; preserved back-pressure/timeouts/redaction; một pool/process. Một representative read projection + session refresh và profile/audit/receipt write, cùng HTTP contract. Raw SQL chạy qua active manager/runner; không qua một pg pool riêng. Map entities ở Infrastructure, migrate schema bằng toolchain hiện tại, synchronize=false. Compatibility Node24/Nest12/ARM64 và dependency audit là gate phải kiểm tra thực tế.
- [ ] **O-03 — Comparison + Sequelize nếu cần:** chạy paired/repeated pg vs TypeORM, same traffic/security/dataset/pool/indexes; compare ORM/raw projection paths, real concurrency/correctness/crash tests. Sequelize PoC chỉ khi có trade-off chưa giải quyết hoặc user chọn, để tránh xây ba persistence stacks đầy đủ. Đo developer/maintenance/operational burden cùng runtime metrics; AWS bill/cost ratio chưa có thì để unknown.
- [ ] **O-04 — Decision + staged adoption:** ADR riêng ghi evidence/tolerances/maintenance và phương án chọn. Nếu chọn ORM, convert một path rồi toàn Identity cùng regression gates; không để logical UoW chạy qua hai connection pools. Nếu giữ pg, nêu requirement hoặc evidence cụ thể; không coi existing code là lý do đủ. Production winner chỉ chọn sau SLO/capacity/TCO benchmark thật.

Protocol dừng candidate ngay khi có correctness/security/durability failure. Chọn lowest total cost đáp ứng hard gates/capacity; không loại ORM chỉ vì overhead chưa đo. Chi phí ORM migration/maintenance là TCO phải ghi định tính/giờ thực tế, không quy đổi USD tùy ý. SLO thresholds lấy từ [SLO contract](slo-and-workload.md), không tự hạ vì refactor.

## 5. Rollback và nghiệm thu

Mỗi increment có mapping và checks riêng; rollback về code artifact trước, giữ immutable DB state. Placement-only change không cần schema rollback. Khi chuyển migration root, so sánh checksums trước/sau và test artifact chứa đủ assets; DB receipt là nguồn sự thật. ORM rollout nếu có phải dùng cùng schema/migration semantics để previous compatible image vẫn hoạt động.

**Runtime và build đã conform placement được dùng của cây mới**, N-01–12 đóng bằng actual evidence. ORM O-01–04 chưa đo/chưa chọn replacement; new pg diagnostics chỉ là starting evidence cho experiment tương lai. Browser verification landing/HTTPS và SES production operations vẫn PARTIAL, SQS scoring/Catalog/Reporting/AWS/k6 chưa triển khai. Product ticks và historical benchmark không thay đổi vì refactor.

[Validation log](validation.md) ghi actual checks. Acceptance ở đây là normalization và behavior đã test local, không phải production security/SLO/capacity/cost acceptance.
