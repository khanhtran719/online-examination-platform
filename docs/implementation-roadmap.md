# Roadmap triển khai có đánh dấu

Cập nhật: 2026-10-06. Phạm vi đã bàn giao và review: **bộ quy chuẩn, bootstrap/domain, Phần 02 contracts và DB-01–11 nền PostgreSQL**. Auth contract đã được điều chỉnh theo [ADR-005](adr/005-email-verification-and-signed-tokens.md): email/password + verification link, asymmetric JWT; magic link/GitHub sau. Thêm ID-10–13 nên tổng hiện **40/216 mục hoàn thành, 176 mục chưa hoàn thành**. DB-12 còn image compatibility; business API/worker và AWS chưa triển khai.

Quy ước: `[x]` = đầu mục cụ thể đã hoàn tất và có artifact/kiểm chứng; `[ ]` = chưa hoàn tất. Dòng có `IN PROGRESS` là đang làm, chưa được tick. “Đã viết tiêu chuẩn” không đồng nghĩa “đã triển khai control”; “đã tạo script” không đồng nghĩa “đã chạy benchmark”. 18 mục bootstrap đã [review](completed-checklist-review.md); 11 mục SPEC có [review/evidence](phase-02-review.md), auth amendment có [review/evidence](phase-04-contract-review.md). DB-01–11 đã có [review/evidence](phase-03-review.md); DB-12 đã có runbook, chưa chạy old/new image drill. Không còn tác vụ triển khai chạy nền. [Kế hoạch Phần 04](phase-04-plan.md) ghi thứ tự Identity và composition roots BOOT-10; BOOT-09 vẫn thiếu Git/remote. AWS/benchmark chưa bắt đầu. Phần lớn đầu mục bên dưới cần tách thành PR nhỏ khi thực hiện. Mỗi PR cập nhật checklist + evidence + acceptance ledger.

| Nhóm | Trạng thái hiện tại | Điều kiện chuyển bước |
| --- | --- | --- |
| 00: Bộ quy chuẩn | Hoàn tất, đã kiểm tra và review lại | Không còn quyết định POS mâu thuẫn, có contract/ADR và checklist |
| 01: Bootstrap | Phần đã mở đã hoàn tất; Git/Nest runtime để phase sau | Unit/typecheck/build/lint/quality và local dependency checks |
| 02: Product/public contracts | Hoàn tất specification + local contract checks | Policy/schema/permissions/workload nhất quán; runtime evidence pending |
| 03: Database | DB-01–11 hoàn tất nền persistence; DB-12 chưa drill | Business adapters/races và old/new images cần evidence riêng |
| 04–13: Application/operations/AWS | Có kế hoạch Phần04 và auth contract; runtime chưa triển khai | Correctness và security trước capacity tuning |
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

Mục đích: khép lại phần đang làm dở theo chỉ đạo mới; chưa dựng application runtime.

- [x] **BOOT-01** Tạo package metadata, TypeScript strict config, Jest không phụ thuộc Watchman, ESLint/Prettier và lockfile.
- [x] **BOOT-02** Cài dependency phục vụ TypeScript/unit/lint. Loại dependency runtime chưa sử dụng khỏi bootstrap; sẽ thêm theo phase có nhu cầu.
- [x] **BOOT-03** Tạo [compose.yaml](../compose.yaml), PostgreSQL local và ElasticMQ/SQS local chỉ bind localhost.
- [x] **BOOT-04** Tạo [.env.example](../.env.example), ignore files; không đưa production secret vào repo.
- [x] **BOOT-05** Viết test trước cho deadline/submission/exact-match scoring; chạy RED xác nhận source chưa tồn tại.
- [x] **BOOT-06** Hoàn tất pure [Attempt](../apps/api/src/modules/assessment/domain/attempt.ts), [scoring](../apps/api/src/modules/assessment/domain/scoring.ts) và unit tests; chạy GREEN.
- [x] **BOOT-07** Chạy typecheck/build/lint/quality; ghi kết quả vào [validation log](validation.md).
- [x] **BOOT-08** Kiểm tra health PostgreSQL và queue local; đây chỉ là dependency check, chưa phải integration test hệ thống.
- [ ] **BOOT-09** Khởi tạo Git và cấu hình remote/branch/PR khi bắt đầu phase implementation tiếp theo.
- [ ] **BOOT-10** Tạo Nest composition root/API/worker entry points và config validation khi bắt đầu application phase.

BOOT-06–08 đã được kiểm chứng: 28 domain tests + 9 tooling tests pass; typecheck/build/lint/quality pass; PostgreSQL query và SQS ListQueues local thành công. Dependency audit còn 20 moderate trong tooling dev, 0 high/critical; chưa có runtime dependencies. Xem [validation log](validation.md). BOOT-09–10 thuộc phase sau, chưa bắt đầu. Kết luận review: đủ điều kiện chuyển sang phần 02 product contracts; xem [review report](completed-checklist-review.md).

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
- [ ] **DB-12** PARTIAL — [runbook](runbooks/database-migrations.md) đã viết; old/new API/worker image compatibility test chưa chạy vì BOOT-10/CI images chưa có. Không có tác vụ chạy nền.

DB-01–11 đạt gate nền persistence: 30 real-PG cases PASS, restricted roles/constraints/context/timeout. Xem [database guide](database.md) và [review](phase-03-review.md). Gate business races/SQS/image compatibility và load/tuning vẫn pending; không chọn pool/index tối ưu từ fixtures.

## 04. Identity, authentication, session, permissions

Phụ thuộc: 02–03. [Kế hoạch chi tiết](phase-04-plan.md), [security contract](security-and-permissions.md) và [ADR-005](adr/005-email-verification-and-signed-tokens.md) đã cập nhật; checkbox dưới đây là runtime deliverables, chưa hoàn tất từ việc viết kế hoạch.

- [ ] **ID-01** Register bằng email/password: normalized unique email, pending verification, input limits, strong password hash, atomic challenge/email intent và chống enumeration.
- [ ] **ID-02** Login bằng email/password: chỉ enabled + verified, bounded hashing/rate limit, signed session creation và safe audit metadata.
- [ ] **ID-03** Refresh rotation: hash token trong DB, atomic rotate, replay/family-revocation policy và concurrent refresh tests.
- [ ] **ID-04** Logout/revoke: hiệu lực được định nghĩa và kiểm tra với API đang scale ngang.
- [ ] **ID-05** Access/refresh JWT ký bằng private key, verify bằng public key (ES256/P-256); strict alg/claims/type/audience/use, TTL/idle/absolute expiry, trusted kid/key rotation/compromise drill; DB revocation vẫn authoritative.
- [ ] **ID-06** Tạo guard/principal infrastructure, permission matrix tập trung và actor ownership checks.
- [ ] **ID-07** Chọn cookie/token transport, CSRF/CORS/SameSite/secure policy theo threat model và browser client.
- [ ] **ID-08** Tạo quy trình cấp admin đầu tiên an toàn; không public endpoint tự cấp role.
- [ ] **ID-09** Unit/integration/E2E: duplicate register, invalid/unverified credential, JWT substitution, token reuse, expired/revoked session, forbidden/admin access; đo hash/crypto/HTTP/query/pool và hai API instances.
- [ ] **ID-10** Link xác thực email một lần30min, resend bounds/coalescing, POST activation + final email-owner password, race/expiry/retry, chống attacker pre-registration và ciphertext cleanup.
- [ ] **ID-11** Identity email outbox + worker + local mailbox/SES adapters: encrypted token material, leases/fencing, bounded retry/parked/replay, sender/quota/bounce/complaint và delivery metrics; AWS delivery vẫn chờ account/region/sender.
- [ ] **ID-12 — LATER** Passwordless email magic link: LOGIN_EMAIL purpose riêng, single-use/login CSRF/browser binding và session policy chung; không dùng VERIFY_EMAIL để login.
- [ ] **ID-13 — LATER** GitHub OAuth code + state/PKCE, stable provider subject, explicit account linking, email ownership, provider-only schema migration và no privilege escalation.

Gate Phần04: BOOT-10 + ID-01–11 có runtime evidence; auth/verification/permissions chạy thật, token chỉ trong HttpOnly cookies, không lộ trong JSON/log. ID-12/13 để phase sau. Local evidence và SES/key-operations AWS evidence được đánh dấu riêng.

## 05. Catalog: exam và question bank

Phụ thuộc: 02–04.

- [ ] **CAT-01** CRUD exam draft: title/category/duration/open-close/attempt limit/explanation policy.
- [ ] **CAT-02** CRUD section và ordering, section points/rules được specification cho phép.
- [ ] **CAT-03** Question bank CRUD cho Single Choice/Multiple Choice/True-False; option/correct-key validation.
- [ ] **CAT-04** Gán bank questions vào exam, ordering/points và referential integrity.
- [ ] **CAT-05** Import questions theo schema có giới hạn kích thước, validation/report lỗi và idempotency.
- [ ] **CAT-06** Publish atomic: validate đủ nội dung, tạo immutable version/snapshots, lưu audit cùng transaction.
- [ ] **CAT-07** Unpublish/republish/version edit policy; không sửa nội dung đã dùng bởi attempt.
- [ ] **CAT-08** Browse/detail/question projections có pagination/column selection, không N+1 và không lộ key.
- [ ] **CAT-09** Public catalog capability cho Assessment: published policy/version, không export private repository.
- [ ] **CAT-10** Kiểm thử publish/update/start race, invalid bank choices, explanation leak và quyền admin/import.

Gate: nội dung frozen và read projections đáp ứng contracts; hot-path query budget được ghi nhận.

## 06. Assessment: start, answer, submit, resume

Phụ thuộc: 03–05. Pure domain helper hiện có chỉ là phần nhỏ của phase này.

- [ ] **ATT-01** Start transaction: actor/exam serialization, open/close check, limit, existing active attempt và durable start receipt.
- [ ] **ATT-02** Load/resume attempt/questions/answers với owner scope và frozen exam version.
- [ ] **ATT-03** Save answer: owning attempt lock, DB time sau lock, option/membership/cardinality, optimistic per-answer version.
- [ ] **ATT-04** Durable mutation receipt/fingerprint; duplicate retry không ghi lại đáp án cũ, key reuse khác payload trả conflict.
- [ ] **ATT-05** Mark question và answer-empty semantics; validate cùng ownership/deadline.
- [ ] **ATT-06** Manual submit: state + stable outbox event + receipt trong một transaction; response không chờ scoring.
- [ ] **ATT-07** Auto-submit/deadline sweep: bounded batch, same application path và an toàn với manual submit cạnh tranh.
- [ ] **ATT-08** Status/history/result query contracts; PROCESSING/FAILED semantics không suy ra từ volatile memory. Result end-to-end acceptance phụ thuộc ASYNC-06/07; không yêu cầu phase 06 tự chấm điểm để đóng đầu mục.
- [ ] **ATT-09** Receipt/answer pruning lifecycle và retention không phá retry/durability contracts.
- [ ] **ATT-10** Kiểm thử PostgreSQL: duplicate start/limit race, parallel save, multiple tabs, save-vs-submit, deadline-vs-lock wait.
- [ ] **ATT-11** E2E commit-then-timeout/retry, API restart/resume, unauthorized attempt access và explanation release.

Gate: mọi save/submit được acknowledgement phải có durable outcome đúng; không lost update, không double submit.

## 07. Outbox, SQS, grading worker, projections

Phụ thuộc: 03/06.

- [ ] **ASYNC-01** Implement outbox port trong submit transaction; versioned event schema không chứa answers/keys.
- [ ] **ASYNC-02** Publisher atomic claim/lease/token fencing và bounded SKIP LOCKED batches.
- [ ] **ASYNC-03** SQS adapter: timeout, bounded retry+jitter, publish ngoài DB transaction, mark sau ACK.
- [ ] **ASYNC-04** Lease recovery, poison parking, oldest unpublished age và replay audit/runbook.
- [ ] **ASYNC-05** Consumer schema validation, trace/correlation và use-case invocation; malformed message quarantine/DLQ.
- [ ] **ASYNC-06** Atomic inbox + deterministic grading + unique result + completion trước DeleteMessage.
- [ ] **ASYNC-07** Persist question stats/leaderboard projection đúng một lần; tie-breaker/freshness theo SPEC.
- [ ] **ASYNC-08** Đo scoring computation/lock time; chọn transaction-local hay leased compute + fenced completion bằng evidence.
- [ ] **ASYNC-09** Worker bounded concurrency/pool budget, visibility timeout/heartbeat và graceful drain.
- [ ] **ASYNC-10** FAILED/retry/DLQ replay policy, operator permissions và bảo toàn event identity.
- [ ] **ASYNC-11** Integration: publisher crash sau SQS ACK, expired lease, duplicate workers, rollback rồi redelivery, commit mất ACK.
- [ ] **ASYNC-12** Benchmark jobs/sec/task/jobs/USD và queue-age SLO trước scaling.

Gate: crash/duplicate delivery không mất submission, không nhân đôi result/statistic/leaderboard.

## 08. Reporting, administration, audit

Phụ thuộc: 04–07.

- [ ] **REP-01** Read-only admin monitor active candidates với scope/freshness rõ ràng.
- [ ] **REP-02** Browse/filter submissions/scores và cursor pagination có stable ordering.
- [ ] **REP-03** Question statistics: answered/correct/incorrect/unanswered denominators, published-version scope.
- [ ] **REP-04** Leaderboard/history/result optimized read queries, best/latest semantics theo product spec.
- [ ] **REP-05** Business metrics: starts/submissions/completions/expired/failed và processing backlog.
- [ ] **REP-06** Append-only audit trong admin transaction; action/actor/target/time/minimal metadata, retention/access control.
- [ ] **REP-07** Export/report limits, safe PII exposure và query dependency contracts với migration.
- [ ] **REP-08** Test data scope, projection freshness, query/index plans và audit rollback.

## 09. Browser application Candidate/Admin

Phụ thuộc: public contracts + 04–08.

- [ ] **WEB-01** Chọn frontend/build strategy, responsive/accessibility budget và S3/CloudFront static asset plan.
- [ ] **WEB-02** Register/email verification/final password/login/logout/refresh: inert verification landing, resend UX và an toàn với cookie/token/CSRF policy đã chọn. Magic link/GitHub UI khi ID-12/13 triển khai sau.
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
