# Grok handoff: Catalog implementation

Prepared 2026-10-07. Scope: the next backend Catalog increment, CAT-01–10. This prompt does not mark those tasks complete or authorize AWS provisioning. [Roadmap](implementation-roadmap.md), [profile](project-profile.md), [product contract](product-specification.md), [permissions](security-and-permissions.md) and [OpenAPI](contracts/openapi.yaml) remain authoritative. Copy the body below into Grok with repository access.

---

Bạn là senior Backend Engineer triển khai Catalog cho Online Examination Platform. Hãy làm trực tiếp trong repository, từng bước, có kiểm chứng. Mục tiêu: ngân hàng câu hỏi, đề nháp, publication bất biến và projections phục vụ Assessment. Không dừng ở đề xuất; hoàn thành phần độc lập và báo rõ blocker.

1. Đọc trước khi sửa

Đọc AGENTS.md mới nhất, docs/project-profile.md, docs/implementation-roadmap.md, .ai/overview.md. Theo navigation trong AGENTS, đọc rules, architecture, conventions và workflow liên quan. Đối chiếu docs/product-specification.md, docs/security-and-permissions.md, docs/examination-module-guide.md, docs/contracts/openapi.yaml và ADR-002/003/004/006/008. Inspect source, tests và tám migrations hiện có. Contract thiếu thì ghi gap; không tự đoán API.

2. Giữ đúng phạm vi

Triển khai CAT-01–10 theo các increment nhỏ: draft/question CRUD; publication; projections/capabilities; import; kiểm chứng. Identity HTTPS đã đạt local acceptance; SES/AWS còn mở. Không triển khai Assessment lifecycle, scoring/SQS, Reporting, Terraform, magic link, GitHub hoặc redesign Web. Giữ các thay đổi chưa commit của người dùng. Không reset, overwrite, stage hoặc commit chúng. Dùng phiên bản tài liệu hiện tại, không lấy test count lịch sử làm bằng chứng mới.

3. Lập kế hoạch cụ thể

Cập nhật docs/implementation-plan.md trước khi code. Mỗi task ghi owner, input/output, permission, invariant, transaction, lock order, idempotency, query budget, tests và evidence. Đánh dấu [ ]/IN PROGRESS/[x] đúng trạng thái. Đọc roadmap dependency: ID-11 chưa hoàn tất; ghi ngoại lệ phạm vi local Catalog độc lập, không đóng Phase04 hoặc bỏ gate SES. Sau kế hoạch, tiếp tục thực hiện trong phạm vi này.

4. Placement và boundary

Đặt code trong apps/api/src/modules/catalog với domain, application, infrastructure, presentation. Tạo CatalogModule để wiring. Domain/Application thuần TypeScript, không import NestJS, pg, TypeORM, Redis hoặc SDK. Presentation gọi Application; Infrastructure implement ports. Write repository thuộc Domain; projection port thuộc Application. Giữ pg hiện tại theo ADR-008; SQL parameterized, format theo R-77/conventions §102.1. Tái sử dụng UnitOfWork/transaction context; không thêm pool trong module hoặc abstraction không cần thiết.

5. Authorization và contracts

Reuse Identity qua public capability/port, không import private repository/adapter. Authenticate bằng session authority PostgreSQL, kiểm tra current permissions. Áp dụng catalog.read, catalog.manage, catalog.keys.read, catalog.import đúng endpoint. Unsafe requests giữ Origin/CSRF, rate admission và correlation. Không đọc JWT để đoán role, không trust actorId trong body. Giữ envelope, errors, status codes và schemas OpenAPI. Sections/membership nằm trong ExamWriteRequest; không tự thêm routes riêng. Nếu thiếu public auth boundary, thiết kế tối thiểu và bổ sung regression boundary.

6. Draft và question bank

Implement create/read/replace/archive với expectedRevision; create yêu cầu revision zero, conflict không ghi đè. Draft có thể chưa đủ nội dung; publication phải đầy đủ. Bank hỗ trợ SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE. Enforce text/options/points/keys limits trong specification; true-false đúng hai options, một key; single một key; multiple tập key hợp lệ. Positions không trùng, key thuộc options. Exam không lặp bank question, section/order hợp lệ. Không render imported text thành trusted HTML. Archive bảo toàn references/snapshots.

7. Transaction và retry

Admin mutation commit effect, audit và durable receipt cùng transaction. Dùng actor/operation-scoped UUIDv7 key, fingerprint, freshness/retention theo ADR-003; retry cùng payload trả kết quả cũ, khác payload conflict. Receipt lookup phải đúng trước revision rejection của retry. Lock order ổn định, cùng executor cho repositories/audit/receipt. Audit failure rollback toàn bộ. Revalidate account/permissions trong transaction khi contract yêu cầu; auth trước lock không đủ cho concurrent revoke. Không bắt DB error rồi tiếp tục transaction đã hỏng.

8. Publish bất biến

Publish lock/revalidate draft revision, bank content và schedule. Enforce 1–500 questions, 1–20 sections không rỗng, duration60–14400, attemptLimit1–10; tổng points lấy từ questions. Validate UTC/timezone, open<close, chưa closed; default explanations NEVER. Atomically tạo version tăng dần, frozen sections/questions/options/keys, policy, current pointer, audit/receipt. Dùng IDs publication riêng và giữ provenance admin. Không partial publication hoặc sửa snapshot đã commit. Bank edits chỉ ảnh hưởng tương lai. Unpublish chặn start mới; existing attempts giữ frozen policy. Republish tạo version mới.

9. Projections và capabilities

Browse/detail chỉ metadata published, không questions/keys. Cursor theo publishedAt/examId, bind filters/watermark, page bounds theo contract; tránh OFFSET và N+1. Select explicit columns, không hydrate aggregate cho read. Public application capabilities: getPublishedPolicy, getFrozenQuestionPage, getScoringSnapshot; trusted scoring tách candidate DTO. Chúng không phải anonymous HTTP endpoints. Assessment sau này authorize owned attempt trước khi gọi. Bảo đảm policy/version đọc trong cùng transaction context để future start không thấy version thiếu hoặc pha trộn.

10. Import đúng v1

JSON schemaVersion1, tối đa100 questions/1MiB, clientRef unique; không CSV/XLSX/remote URL. Validate trước write. Dry-run vẫn lưu report/audit/receipt nhưng không tạo bank rows. Semantic invalid trả report valid=false/committed=false; malformed schema trả400. Real import all-or-nothing; retry giữ report/IDs. Report chứa safe issues/IDs, không raw content/keys. Không thêm queue/worker cho bounded import chưa có measurement.

11. Tests và measurements

Viết meaningful tests RED trước implementation. Real PostgreSQL restricted roles kiểm tra revision races, duplicate/lost-ACK receipt, audit rollback, archive references, immutable snapshots, publish/update/unpublish concurrency, imported invalid keys và permission/revocation/leak. Future start race cần integration thật khi Assessment tồn tại; giữ CAT-10 partial nếu thiếu, không mock rồi tick toàn bộ. Đo browse/detail và publication diagnostic: query/round-trip, EXPLAIN, pool/lock/transaction duration, payload, p50/p95/p99 và errors. Lưu configuration/raw data; diagnostic không chứng minh sustainable RPS/SLO/AWS savings.

12. Hoàn tất có evidence

Không sửa tám applied migrations; chỉ thêm migration forward nếu cần, kiểm tra grants/checksum/build assets. Chạy lint, quality/contracts, typecheck, build, unit, real integration và Identity HTTPS regression khi ảnh hưởng auth. Không bỏ assertion để pass. Dọn đúng fixtures, không truncate development DB. Cập nhật roadmap, profile, test inventory, validation, API review/runbook; lưu evidence riêng, không viết lại lịch sử. Báo files, behavior, tests thực chạy, migrations, limitations và việc tiếp theo. Chỉ tick deliverable đã kiểm chứng; production acceptance vẫn mở.

Trong mỗi increment, báo tiến độ ngắn: đã chứng minh gì, còn chưa chắc gì, kiểm tra tiếp theo giải quyết gì. Không log passwords, JWT, CSRF, keys, raw SQL hoặc answers; metrics chỉ route/status, tránh label theo user/exam ID. Không thêm Redis, Kafka, RDS Proxy hay service AWS để “đúng pattern”. Mọi tối ưu cần baseline và số liệu trước/sau, correctness/security luôn là hard gate.
