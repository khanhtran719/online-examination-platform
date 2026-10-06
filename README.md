# Production-Grade Online Examination Platform

**Phase04: lõi Identity và API/email-worker chạy được trên local. 50/216 đầu mục hoàn tất.** Email/password, link xác thực một lần, JWT ES256 access/refresh, rotation/revocation, profile receipt và operator admin đã triển khai. Browser HTTPS và live SES còn PARTIAL. Magic link/GitHub để sau. Chưa đạt production acceptance trên AWS.

- [Architecture Contract](architecture.md) và [AGENTS.md](AGENTS.md): boundaries và quy trình.
- [Roadmap có đánh dấu](docs/implementation-roadmap.md), [review Phần04](docs/phase-04-review.md), [profile](docs/project-profile.md): trạng thái/evidence.
- [Product](docs/product-specification.md), [permissions](docs/security-and-permissions.md), [OpenAPI](docs/contracts/openapi.yaml), [SLO/workload](docs/slo-and-workload.md): contracts.
- [Benchmark Identity local](experiments/identity-local/README.md), [performance protocol](docs/performance.md), [production acceptance](docs/production-acceptance.md): measurement và target.
- [Identity operations](docs/runbooks/identity-operations.md), [database](docs/database.md), [migration runbook](docs/runbooks/database-migrations.md): cách chạy/vận hành.

Yêu cầu local: Node24, npm, Docker Compose. Tạo key một lần và chuẩn bị PostgreSQL/Mailpit:

```sh
npm ci
npm run identity:keys:local
docker compose up -d --wait postgres mailpit
npm run db:local
npm run db:migrate:local
npm run build
```

Generator ghi exclusive vào ignored .local/identity, quyền600; chạy lại không ghi đè hay tự rotate key. API/worker/operator có config và DB login riêng. Credentials example chỉ dùng local. Tám migrations đã applied local, giữ sáu checksums cũ.

Chạy hai terminal:

```sh
npm run start:local
```

```sh
npm run worker:local
```

API tại http://127.0.0.1:3000, worker health tại http://127.0.0.1:3001, Mailpit tại http://127.0.0.1:18025. /live và /ready ngoài response envelope. Chín Identity operations chạy; các operation thi/admin khác trong OpenAPI chưa triển khai. Success có errorCode/message null. JWT chỉ trong Secure/HttpOnly cookies; local tests dùng cookie jar thủ công, chưa chứng minh browser HTTPS. WEB-02 chưa có /verify-email page: link email chưa hoàn tất bằng browser; confirmation cần POST API với anonymous Origin/CSRF/token/final password. GET link không activate.

Các kiểm tra và phép đo thực thi được:

```sh
npm test
npm run typecheck
npm run lint
npm run test:integration:local
npm run smoke:identity:local
npm run bench:identity:local
npm run db:budget -- infra/database/connection-budget.local.json
```

Đã chạy90 unit/tooling +52 integration PASS; actual entry-point smoke và SIGTERM PASS; benchmark hai API có0 lỗi. Tests/benchmark dùng database/role riêng rồi dọn, không truncate development DB. Raw benchmark có latency/CPU/RSS/query/pool; RPS là diagnostic tuần tự, không phải sustainable capacity. AWS costs giữ null; chưa chọn capacity/pool/compute thắng.

Khi xong, Ctrl-C các process rồi dừng dependencies:

```sh
docker compose stop postgres mailpit
```

SQS dành cho phase scoring sau: docker compose up -d sqs. Host dùng127.0.0.1:9324, Docker network dùng sqs:9324; queue local in-memory không chứng minh AWS durability. Chưa có scoring worker, browser app, Terraform, k6, Git remote hay AWS account/region/sender/domain. [Validation](docs/validation.md) và [test inventory](docs/test-inventory.md) ghi giới hạn/evidence.
