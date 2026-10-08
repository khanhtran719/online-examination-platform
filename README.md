# Production-Grade Online Examination Platform

**Phase04: Identity, API/email-worker, deadline sweep và browser HTTPS chạy được trên local. 70/216 đầu mục hoàn tất sau ATT-07; CAT-09/10 và ATT-01–07 đã nghiệm thu local.** Email/password, link xác thực một lần, JWT ES256 access/refresh, rotation/revocation, profile receipt và operator admin đã triển khai. ID-07/WEB-02 đã đóng locally; live SES còn PARTIAL. Magic link/GitHub để sau. Chưa đạt production acceptance trên AWS.

- [Web UI handoff cho Grok](docs/web-ui/README.md): phong cách đã chốt, mô tả màn hình, API/state rules, [32 task frontend](docs/web-ui/implementation-tasks.md), 24 scenarios và [prompt khoảng 1.000 từ](docs/web-ui/grok-implementation-prompt.md). SPA local đã có trong `apps/web`; checklist7/32 task được tick (FE-01/03/04/07–10). WEB-02 hoàn tất local với [10 ca HTTPS Identity thật](docs/evidence/identity-https-2026-10-07/README.md). Live Catalog/Assessment/Reporting, full Web và production acceptance vẫn mở. Bằng chứng sửa 2026-10-07: [fix evidence](docs/web-ui/evidence/fix-2026-10-07/README.md).

- [Chuẩn hóa kiến trúc — checklist 12/12](docs/architecture-normalization-plan.md), [review API và lựa chọn pg/ORM](docs/api-architecture-review.md), [ADR-006](docs/adr/006-source-layout-normalization.md): source/tooling đã chuẩn hóa. Persistence evaluation4/4 local: [pg/TypeORM/Sequelize evidence](experiments/persistence-comparison/README.md), [ADR-008 giữ pg hiện tại](docs/adr/008-persistence-evaluation.md);76.800 operations/0 errors. AWS capacity/cost vẫn chưa đo.
- [Fix API Assessment](docs/assessment-fixes-2026-10-08.md): AR-01–05 CLOSED local, giữ Architecture Contract.234 root +105 integration +10 HTTPS PASS; queries start11/save11/submit10 trong ceiling. [Review gốc](docs/assessment-review-2026-10-07.md) và evidence cũ giữ nguyên.
- [Deadline sweep ATT-07](docs/evidence/assessment-expiry-2026-10-08/README.md): worker local tự nộp attempt hết hạn, kind `DEADLINE`, một transaction mỗi attempt. [Runbook](docs/runbooks/expiry-worker.md). Prompt gốc vẫn ở [handoff](docs/grok-assessment-expiry-implementation-prompt.md). Scoring và SQS chưa làm.
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

Generator ghi exclusive vào ignored .local/identity, quyền600; chạy lại không ghi đè hay tự rotate key. API/worker/operator có config và DB login riêng. Credentials example chỉ dùng local. Source/build có 11 migrations. Bytes 0001–0010 không đổi so với baseline ATT-07; `0011_submission_kind.sql` là file mới. Review Assessment trước đó kiểm tra 10 migration trên database tạm và giữ bytes 0001–0009. Increment deadline không migrate database phát triển lâu dài.

Chạy hai terminal:

```sh
npm run start:local
```

```sh
npm run worker:local
```

Deadline sweep, sau `npm run build`, dùng login kế thừa `examination_expiry_worker`. Không trỏ process này vào database của project khác:

```sh
npm run expiry:local
```

API tại http://127.0.0.1:3000, email-worker health tại http://127.0.0.1:3001, expiry health mặc định tại http://127.0.0.1:3017, Mailpit tại http://127.0.0.1:18025. /live và /ready ngoài response envelope. Identity, Catalog và các operation làm bài start/resume/save/submit/status đã chạy local. Reporting, result/review, chấm điểm và SQS trong OpenAPI chưa triển khai. Success có errorCode/message null. JWT chỉ trong Secure/HttpOnly cookies. Browser HTTPS thật đã kiểm tra register/email worker/link activation, hai tab dùng chung cookies, refresh/logout/restart và lost ACK; confirmation cần explicit POST với anonymous Origin/CSRF/token/final password. GET link không activate. [Runbook HTTPS](docs/runbooks/identity-https.md) dùng certificate tạm scoped cho Chromium, không thay OS trust hay chứng minh public PKI.

Các kiểm tra và phép đo thực thi được:

```sh
npm test
npm run typecheck
npm run lint
npm run test:integration:local
npm run smoke:identity:local
npm run bench:identity:local
npm run db:budget -- infra/database/connection-budget.local.json
npm run web:lint
npm run web:typecheck
npm run web:test
npm run test:identity:https
```

Đã chạy100 backend unit/tooling +53 real-PG/SMTP integration +73 web unit +10 real Chromium HTTPS cases PASS; actual API/worker/operator CLI và SIGTERM PASS; diagnostic trước/sau với hai API có0 lỗi. Tests/benchmark dùng database/role riêng rồi dọn, không truncate development DB. Raw benchmark có latency/CPU/RSS/query/pool; RPS là diagnostic tuần tự, không phải sustainable capacity. AWS costs giữ null; chưa chọn capacity/pool/compute thắng.

Khi xong, Ctrl-C các process rồi dừng dependencies:

```sh
docker compose stop postgres mailpit
```

SQS dành cho phase scoring sau: docker compose up -d sqs. Host dùng127.0.0.1:9324, Docker network dùng sqs:9324; queue local in-memory không chứng minh AWS durability. Browser app đã có; scoring worker, Terraform, k6 và AWS account/region/sender/domain còn pending. Git có origin remote; delivery branch/PR workflow chưa kiểm chứng. [Validation](docs/validation.md) và [test inventory](docs/test-inventory.md) ghi giới hạn/evidence.
