# ATT-07 — closure sau independent review, 2026-10-08

**ER-01–04 CLOSED locally. ATT-07 được nghiệm thu lại; roadmap70/216 checked,146 pending.** Review trước đã hoàn tất và tìm được4 lỗi; đây là increment sửa lỗi theo [review](assessment-expiry-review-2026-10-08.md), không phải tiếp tục review chưa xong. [Evidence mới](evidence/assessment-expiry-fixes-2026-10-08/README.md) giữ RED, GREEN, số đo trước/sau và checksum. Production/AWS acceptance vẫn chưa đạt.

## Scope và kiến trúc

Assessment sở hữu acceptance, workflow retry và outbox intent. Deadline worker vẫn gọi public factory của Assessment; scheduler chỉ quản lifecycle/health/shutdown. Manual và DEADLINE dùng cùng `acceptAttemptSubmission`; không thêm endpoint bỏ qua authorization. Domain/Application chỉ phụ thuộc plain ports và UoW; SQL/pg vẫn ở Infrastructure theo ADR-008. Không thêm TypeORM, queue, cache, lease table hoặc AWS resource.

Thay đổi runtime tập trung ở `DeadlineSweep` và `PostgresAttemptRepository`; thêm Application ports `ExpiryRetry`, `SubmissionCommitObserver` và forward migrations0012/0013. Port retry cần thiết để Application yêu cầu durable cooldown mà không biết SQL; observer chỉ phục vụ đo COMMIT acknowledgement sau UoW ở scheduler root, đồng bộ và không thực hiện external I/O. Existing factory vẫn dùng bốn constructor arguments; observer tùy chọn không làm API/worker phải tải calibration hay collector. Event/OpenAPI không đổi.

## Các finding đã đóng

| Finding | Sửa | Evidence |
| --- | --- | --- |
| ER-02 P1: full poison batch gây starvation qua mọi tick | Sau acceptance rollback, một UoW ngắn khác khóa/recheck IN_PROGRESS và lưu cooldown PostgreSQL; claim bỏ qua cooling rows | Batch1 và2 có poison prefix bằng batch nhưng healthy row tiến triển; recomposition giữ cooldown; hai worker retry đúng1 event/revision2 |
| ER-01 P2: accepted kind NULL lọt CHECK |0012 thay CHECK bằng accepted branch có `submission_kind IS NOT NULL`; giữ immutable trigger | Runtime UPDATE/INSERT và expiry UPDATE NULL đều bị23514; valid MANUAL/DEADLINE vẫn accepted/immutable; upgrade corrupt0011 fail atomically |
| ER-04 P2: discovery volatile làm mất deadline range | Discovery/backlog dùng `statement_timestamp()`; clock sau lock vẫn `clock_timestamp()` | Natural plans100.000 future rows có Index Cond,0 due; observed lock wait vẫn lấy time sau lock |
| ER-03 P2: acceptance lag bị gọi thành commit lag | Đổi tên acceptance metric; observer sau COMMIT ACK, DB/local UTC calibration và uncertainty/drift | Delay200ms trong outbox và witness trước COMMIT được tính vào observed lag; rollback không ghi sample; collector throw không retry durable effect |

Cooldown là workflow metadata trên attempt: count0–16, initial delay0,8–1,2s, exponential, cap30s. Count saturates, không phải maximum16 delivery attempts; retry tiếp tục cho đến khi được accept/repair. Poll/backoff có thể làm eligibility chờ thêm. Không chuyển transient error thành business FAILED, không đổi revision/answers/accepted identity hoặc phát event khi rollback. Concurrent winner/locked row là no-op trong retry scheduling. Nếu retry transaction cũng lỗi, vòng supervisor dùng backoff. Manual submit không bị cooldown chặn.

Backlog vẫn đếm cooling rows và oldest overdue age; không che poison work. Readiness có thể phục hồi khi không còn eligible claim dù due>0, nên readiness không thay thế quan sát tuổi backlog. Regression chứng minh tiến triển qua finite failed prefix, chưa chứng minh fairness/capacity với unbounded arrivals. Không cần một lease vì claim và acceptance/outbox vẫn cùng transaction một attempt.

## Database và rollout

0001–0011 giữ nguyên bytes/checksums.0012 thay constraint atomically; không tự suy luận winner của accepted NULL. Suite tạo database đến0011, commit synthetic accepted NULL, chạy migration thật:0012 bị từ chối,11 receipts/checksums và constraint cũ còn nguyên. Sau khi xóa riêng dữ liệu lỗi synthetic,0012/0013 apply thành công; rerun apply0 migration. Đây không phải production repair.

0013 thêm hai bounded fields và column UPDATE chỉ cho `examination_expiry_worker`. API runtime không được UPDATE metadata. Existing restricted expiry grants không mở quyền đọc keys/answers/sessions/email/results.13 source/built migration assets khớp. Apply migration trước scheduler mới; database phát triển lâu dài chưa được migrate. Preflight/repair/rollback và cách chạy nằm trong [runbook](runbooks/expiry-worker.md). Binary rollback giữ schema/provenance; scheduler cũ tái đưa lỗi starvation trở lại, nên ưu tiên repair forward.

## Validation

- Independent restricted-PG RED hợp lệ trước sửa:6 FAIL/5 PASS trên11 cases;3 NULL,2 poison fairness,1 natural range. ER-03 có probe review riêng chứng minh≥203,988ms persistence bị bỏ sót. Lượt đầu publication fixture sai đã được sửa trước khi xác nhận RED và vẫn được lưu riêng.
- Final root **254 PASS =118 API/20 suites +40 tooling +96 Web**. Hai unit retry/observer và ba tooling clock/lag cases là mới; Web cases thuộc worktree hiện có, không phải UI acceptance của increment này.
- **144/144 integration PASS,8 suites,0 skipped**:21 independent fix cases +123 existing cases, gồm Catalog diagnostic writer, HTTP/SMTP, migration runner/grants, concurrency, query budgets, compiled health/SIGTERM/restart. SMTP dùng Mailpit test được restart sạch; không gửi SES.
- Lint/quality/contracts, strict typecheck/build PASS. Contracts46 operations/425 examples. Lint/typecheck rerun sau21 regressions; measurement script được lint sau đổi formatter/population.
- Manual auth-inclusive budgets không tăng: start11/12, questions4/4, answers4/4, save11/11, submit10/10, status3/3;25 observations mỗi route trong fresh diagnostic. [Budget projection](evidence/assessment-expiry-fixes-2026-10-08/manual-query-budget.json).

Lượt integration trung gian17-case version bị pg57P01 ở cleanup và một SMTP assertion; không gọi đó là GREEN. Fixture mới đóng pools, chờ `pg_stat_activity=0`, kiểm tra safe fixture error codes và DROP không FORCE. Full suite được chạy sau khi file regression ổn định, không cùng benchmark, với mailbox sạch. Không kết luận riêng nguyên nhân SMTP chỉ từ lượt này. Lượt subagent chưa được cấp loopback là EPERM, không phải product regression. Logs mới redacted protocol keys; evidence cũ không bị sửa.

## Đo performance local

[Comparison JSON](evidence/assessment-expiry-fixes-2026-10-08/comparison.json) dẫn raw before/after cùng cardinality/config. Before chạy đúng source ở Git revision `d2a34a52cfd03d55485da1282253a779a0a9e44c`; accepted raw ghi source hashes của phiên bản cuối. Baseline không bị dựng lại từ counterfactual throughput.

| Dataset/config | Before accepted attempts/s | After accepted attempts/s |
| --- | ---: | ---: |
| Mixed200 due, batch50/pool2 |95,36 |211,97 |
| Burst2.000, batch50/pool2 run1 |113,09 |143,37 |
| Burst2.000, batch50/pool2 run2 |126,41 |128,72 |
| Burst2.000, batch10/pool2 |127,00 |144,53 |

Các lượt healthy đều drain đúng due count/0 failed. Đây là whole-fix local diagnostic; khác biệt không cô lập tác động index và chưa đủ repetitions/host controls để chọn optimal pool hay tuyên bố sustainable throughput/AWS savings. Không diễn giải mixed-run improvement thành production gain. Current raw lưu timed CPU/RSS/pool/query/lock/transaction observations; RSS không phải memory allocation/request. Before observation totals gồm hậu kiểm SKIP LOCKED; current totals chỉ gồm timed sweep và tách probe counts, nên không so hai population như query/request cùng loại.

Riêng natural EXPLAIN dùng cùng schema/data100.000 future IN_PROGRESS, ANALYZE,0 due, ba repeats/query; counterfactual chỉ trả discovery clock về volatile, không đổi outer post-lock clock:

| Query | Volatile median | Current median | Shared hit blocks volatile/current |
| --- | ---: | ---: | --- |
| Empty claim |13,634ms |0,100ms |1819 /3–9 |
| Empty backlog |10,178ms |0,043ms |1819 /3 |

Current có deadline Index Cond, counterfactual không có; không thêm index hoặc force planner. Đây là local server execution, chưa phải RDS saturation, HTTP p99 hay cost reduction.

Schema-v2 phân biệt `deadlineToAcceptanceLagMs` và `deadlineToCommitAckObservedLagMs`. Metric thứ hai dừng tại successful UoW COMMIT ACK ở caller, UTC estimate với before/after calibration uncertainty/drift. Failures/retries không được đếm vào successful ACK population. Clock sau lock của domain không đổi. Seeded overdue age1–60s và thời gian seed/drain có trong lag; không dùng các p95/p99 đó để nghiệm thu production expiry SLO. Compiled process mode chưa đo ACK lag.

Historical v1 `deadlineToCommitLagMs` trong original ATT-07 và before raw là **acceptance-only**. Không sửa raw/summary cũ; correction này và new generated summaries là cách đọc hiện hành. SQS dispatch, scoring/result latency vẫn chưa đo.

Compiled worker mới:2.000 EXPIRED/DEADLINE,2.000 outbox/distinct aggregates,0 duplicates; `/live` và `/ready`200; SIGTERM exit0/drain8,29ms, restart drain phần backlog còn lại13,805s/exit0. Đó là orderly local recovery trên healthy DB, không phải RDS failover, outage recovery hoặc RTO acceptance.

## Status và giới hạn

[Plan](implementation-plan.md), [roadmap](implementation-roadmap.md), profile, database/runbook, test inventory và validation được cập nhật cùng evidence. Không stage/commit/deploy, không đổi unrelated Web work. Historical Assessment/expiry/review artifacts và applied migrations được đối chiếu checksum; fixture DB/logins được dọn, chỉ dừng services do task khởi động, giữ volumes.

ATT-08/09, full ATT-10/11, grading/SQS/Reporting/retention, ID-11/live SES và Phase04 vẫn mở. Chromium HTTPS không rerun: Identity composition/shared HTTP adapter không đổi; fresh HTTP/SMTP integration đã chạy. Không k6/AWS, không cam kết capacity, pool optimum, failover/RPO/RTO, performance–cost curve hoặc production SLO. Closure cho phép tiếp tục increment kế tiếp trong roadmap, không biến70 checked deliverables thành production acceptance.
