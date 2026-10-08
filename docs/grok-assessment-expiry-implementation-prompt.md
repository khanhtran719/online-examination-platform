# Grok handoff: deadline auto-submit / ATT-07

Prepared 2026-10-08 after [Assessment fix closure](assessment-fixes-2026-10-08.md). Copy the body below into Grok with repository access. This handoff defines work; it does not implement or accept the scheduler.

Scope: ATT-07, with scheduler-specific concurrency/recovery evidence from ATT-10/11. Keep those broader items, ATT-08/09, grading/SQS, Reporting, Web, ID-11/Phase04 and production acceptance open. Product roadmap remains69/216.

Read [roadmap](implementation-roadmap.md), [profile](project-profile.md), [product SPEC-03–06](product-specification.md), [event schema](contracts/attempt-submitted.v1.schema.json), [SLO/workload](slo-and-workload.md), [performance protocol](performance.md), [API closure](assessment-fixes-2026-10-08.md) and [source-layout decision](adr/006-source-layout-normalization.md).

Inspection anchors: `AssessmentService.submit` requires a candidate access token and calls `manualSubmissionEvent`; that cannot be the scheduler's credential model. Event schema already permits MANUAL/DEADLINE, while the current domain helper permits only MANUAL. The database has no dedicated submission-kind column;0006 guards accepted submission immutability.0002 already provides partial index attempts_deadline(deadline,id) WHERE status='IN_PROGRESS'. Runtime revision grants come from0010. The existing email worker credential/config factory is Identity-specific and must not become the expiry worker dependency.

Prompt body: 998 whitespace-separated words, counted after the separator.

---

Bạn là senior Backend Engineer/SRE. Triển khai ATT-07 cho Online Examination Platform: backend tự nộp attempt hết hạn khi trình duyệt đóng, mất mạng hoặc session hết hạn. Làm trực tiếp trong repository theo từng bước có kiểm chứng; hoàn thành increment này rồi báo cáo.

1. Đọc trước khi sửa

Đọc AGENTS.md, project-profile, Architecture Contract, rules R-02/03/09–19/42–43/48–51/64–65/76–77, architecture §5/13L/54–56/78–79. Đối chiếu product SPEC-03–06, event schema, roadmap, fix report2026-10-08 và source/tests. Theo ADR-008 giữ pg. Application/Domain không được gọi SQL, Nest, SDK hoặc private repository module khác.

2. Chốt scope và baseline

Viết active plan: owner Assessment, WRITE flow, invariants, lock order, UoW, event, quyền DB và checks. ATT-01–06/CAT-09–10 đã nghiệm thu local; không làm lại. Chỉ triển khai deadline sweep và recovery liên quan. Chưa làm scoring, dispatcher/SQS, result/history, retention, Web hoặc AWS. Capture source/migration/evidence hashes; bảo toàn worktree khác và mọi artifact lịch sử.

3. Dùng chung submission core

Inspect AssessmentService.submit, Attempt.submit, repository và outbox. Tách phần acceptance/state/event persistence thành application core dùng chung giữa manual và scheduler; không copy business logic. HTTP vẫn giữ Origin/CSRF/admission, fresh Identity revalidation, ownership, UUIDv7 receipt và query ceilings. Scheduler là trusted internal capability, không giả JWT, không impersonate candidate, không cần session còn sống. Worker không được tạo public endpoint bỏ authorization.

4. Chọn due attempts có giới hạn

Reuse index attempts_deadline; chỉ xử lý IN_PROGRESS có deadline đến hạn. Query projection nhỏ, order deadline/id, không OFFSET, không load answers/questions/keys. Cơ chế claim nằm trong Infrastructure; dùng row lock/SKIP LOCKED hoặc tương đương có chứng minh. Nhiều worker an toàn; locked row không chặn cả backlog. Discovery không thay thế kiểm tra eligibility sau lock. Định nghĩa batch/concurrency/pool/time budget, fairness và cách quay lại row đã skip.

Phân biệt discovery với ownership: nếu commit để nhả khóa trước xử lý thì phải lock/recheck lại; đừng coi danh sách IDs là claim bền. Nếu giữ claim và effect trong cùng transaction ngắn, không thêm lease/fencing tables vô ích. Ghi rõ transaction theo attempt hay batch, blast radius khi một outbox insert lỗi và cách tránh giữ hàng trăm khóa lúc mass-expiry.

5. Giữ invariant và durability

UoW lấy attempt lock, đọc clock_timestamp sau lock, kiểm tra lại status/deadline rồi gọi domain. Trước deadline no-op; tại/sau deadline thành EXPIRED, expired=true, tăng revision một lần. Giữ answers đã commit; không nhận pending edits muộn. Persist submissionId/eventId/time và outbox trong cùng transaction. Không dùng transaction-start now(), client time hay grace period. Transaction ngắn; không network/scoring. Không lấy Identity user lock sau attempt lock gây đảo thứ tự HTTP.

6. Idempotency và provenance

Một attempt chỉ có một accepted submission/event. Repeat sweep, hai worker và manual race phải giữ IDs/time/reason của winner; retry không tăng revision hay thêm outbox. Manual sau sweep trả immutable acceptance theo contract hiện tại. Scheduler không giả actor-scoped HTTP receipt; durable attempt identity bảo vệ retry nội bộ. Event DEADLINE cần expired=true, occurredAt bằng acceptedAt sau lock, deadline/version/attempt khớp DB; MANUAL muộn vẫn là MANUAL. Server sinh correlation/causation IDs, không chứa candidate secrets.

Success counters chỉ tăng sau commit; lỗi telemetry hoặc mất kết nối sau commit không được làm application ghi submission lần nữa. Khôi phục dựa trên durable state. Kiểm tra expiry giải phóng active slot nhưng vẫn tính attempt quota, và unpublish/republish không đổi deadline/version đang thi.

7. Migration và quyền

Generalize event builder/validator theo schema MANUAL/DEADLINE; không đổi schema để né lỗi. Quyết định durable submission-kind provenance bằng schema hoặc persisted immutable intent, ghi lý do. Nếu thêm cột, forward migration sau0010: backfill accepted submissions cũ đúng MANUAL, unsubmitted không có kind; constraint và immutable guard bảo vệ sau acceptance. Không sửa0001–0010. Tạo expiry-worker role tối thiểu: cần đọc/khóa/update attempt và insert outbox; không access session secrets, answer keys hay email ciphertext. Test grants/denials bằng role thật.

8. Runtime và vận hành

Public Assessment worker factory compose private adapters; entry point ở workers/scheduler chỉ lifecycle và trigger Application. Config riêng có validation, pool/timeouts và poll cadence; không bắt worker load JWT private/email keys. Sweep target mỗi5s, không overlap loop, bounded retry/backoff+jitter. SIGTERM ngừng nhận batch, drain hoặc rollback transaction rồi đóng pool. /live và /ready tách biệt; recovery khi DB trở lại. Không che lỗi bằng endless tight loop hoặc đánh dấu attempt FAILED vì lỗi sweep tạm thời.

9. Tests RED rồi GREEN

Unit test policy/core branching quan trọng; real-PG/HTTP tests chứng minh lock và commit. Bao gồm trước/đúng/sau deadline; offline/expired/revoked session; duplicate tick; hai worker; manual thắng và sweep thắng; save đã ACK trước submission giữ nguyên, save sau deadline bị chặn. Quan sát lock wait thật, không sleep rồi giả định. Test locked oldest row, batch limit, no starvation, outbox failure rollback. Kill worker trong transaction và sau commit trước báo kết quả; restart phải drain tiếp, không duplicate event. Verify exact HTTP receipt/status, frozen version và immutable provenance.

10. Measurement và quan sát

Baseline/final dùng cùng dataset/config: mixed future/due/terminal attempts và burst2000 due attempts trên DB riêng. Đo processed/sec, deadline→commit lag p50/p95/p99, skipped/failed/backlog/oldest due, query/round trips, lock/transaction/pool wait, CPU/RSS và graceful recovery. EXPLAIN đúng SQL, ghi index/plan, sample count và source/schema hashes. Logs structured, bounded, không answers/token/SQL/PII hoặc attempt-ID metric labels. Lưu raw append-only, generate summary; missing/unmeasured ghi rõ. DB commit lag không đồng nghĩa SQS dispatch/result latency; không suy capacity/SLO/AWS savings từ local run.

Scheduler chưa tồn tại nên baseline throughput của nó là chưa đo, không bịa before. So sánh manual hot-path trước/sau refactor riêng; scheduler ghi first measured run và repeated final runs, bao gồm workload/config khác nếu có.

11. Nghiệm thu và bàn giao

Run npm test, lint/quality/contracts, typecheck/build, restricted-PG/SMTP suites. Rerun Identity HTTPS nếu chạm composition/auth/shared HTTP. Giữ ceilings start12/save11/submit10 và questions4/answers4/status3; đo actual, không nâng trần để pass. Chạy compiled scheduler thật, health/SIGTERM/restart và grant checks. Thêm runbook start/stop/config/backlog/failure recovery. Báo files, quyết định, migration/rollback, checks và limitations. Cập nhật plan/roadmap/profile/validation/test-inventory/API review cùng evidence. Chỉ tick ATT-07 sau đủ kiểm chứng; ATT-10/11 ghi subset, production giữ mở. Không tự commit/deploy hoặc chuyển sang phase scoring.
