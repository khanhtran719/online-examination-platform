# Production-Grade Online Examination Platform

Giai đoạn hiện tại: **bộ quy chuẩn, contracts và DB-01–11 PostgreSQL đã bàn giao/review: 40/216 mục** sau bổ sung email verification và login methods sau này. Có schema/migrations, UnitOfWork, pool/timeouts và 30 integration tests PostgreSQL thật. DB-12 còn kiểm tra image compatibility. [Kế hoạch Identity/composition roots](docs/phase-04-plan.md) và [ADR-005](docs/adr/005-email-verification-and-signed-tokens.md) đã chốt email/password, verification link, asymmetric access/refresh JWT; magic link/GitHub sau. Chưa có business API/worker hay AWS.

- [Architecture Contract](architecture.md): trỏ đến contract được cung cấp trong `.ai/architecture.md`.
- [AGENTS.md](AGENTS.md): thứ tự quy chuẩn và quy trình làm việc.
- [Roadmap có đánh dấu](docs/implementation-roadmap.md): danh sách chi tiết theo từng phần, trạng thái và tiêu chí hoàn thành.
- [Project profile](docs/project-profile.md): quyết định dự án và phân biệt target với implementation.
- [Performance protocol](docs/performance.md): cách đo và chọn cấu hình theo performance/cost.
- [Production acceptance](docs/production-acceptance.md): các câu hỏi phải trả lời bằng evidence trước khi gọi là production-ready.
- [Product specification](docs/product-specification.md), [permissions](docs/security-and-permissions.md), [HTTP/OpenAPI/events](docs/contracts/README.md) và [SLO/workload](docs/slo-and-workload.md): baseline implementation v1, chưa phải controls/benchmarks đã chạy.

Các lệnh hỗ trợ hiện có:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run lint
npm run quality
npm run contracts:check
```

Local dependency sandbox (chưa phải application):

```sh
docker compose up -d --wait postgres
npm run db:local
npm run db:migrate:local
npm run test:integration:local
npm run db:budget -- infra/database/connection-budget.local.json
docker compose stop postgres
```

PostgreSQL/ElasticMQ chỉ bind localhost. Credentials trong `.env.example` và Compose là dữ liệu local giả định, tuyệt đối không dùng cho AWS. Có sáu SQL migrations và 34 tables; owner/migration/runtime tách quyền, test dùng database riêng và dọn connection. Xem [database guide](docs/database.md), [review Phần 03](docs/phase-03-review.md) và [migration/rollback runbook](docs/runbooks/database-migrations.md). 0005 thuộc initial bundle và fail nếu có publication cũ thiếu category, không tự đoán metadata lịch sử. Local tests không chứng minh business races, AWS durability hay SLO. API/worker/frontend/Terraform/k6 sẽ được làm theo roadmap, không có lệnh chạy ứng dụng giả.

Chạy `docker compose up -d sqs` khi cần local queue. Local SQS: `.env.example` dành cho process chạy trên host, nên endpoint/queue URL cùng dùng `127.0.0.1:9324`. Client trong Docker network dùng `http://sqs:9324`; không dùng `127.0.0.1` bên trong container để truy cập container khác. ElasticMQ trả queue URL theo Host của request (`node-address.host="*"`), theo [hướng dẫn ElasticMQ](https://github.com/softwaremill/elasticmq#how-are-queue-urls-created). Cấu hình local queue là in-memory test dependency; chưa chứng minh durability của AWS SQS.

[Review bootstrap](docs/completed-checklist-review.md) ghi evidence lịch sử 18 mục/37 tests. Contract checker dùng dev-only Swagger Parser/Ajv; quality tự chạy kiểm tra OpenAPI/refs/examples/event/metadata, `npm test` gồm cả tooling tests. Nó không xác minh runtime authorization/UoW/SQS hay production SLO. Xem [validation log](docs/validation.md) và [review Phần 02](docs/phase-02-review.md).
