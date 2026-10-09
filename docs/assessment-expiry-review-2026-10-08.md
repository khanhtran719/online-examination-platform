# Independent ATT-07 review — 2026-10-08

**Fix follow-up:** [Closure](assessment-expiry-fixes-2026-10-08.md) đã đóng ER-01–04 locally và khôi phục ATT-07 với evidence mới. Các findings, line references và RED số đo bên dưới là snapshot của review trước sửa; raw lịch sử giữ nguyên.

Status: REVIEW COMPLETE, NOT ACCEPTED. ATT-07 reopened as IN PROGRESS. User requests review of Grok's completed deadline submission increment. Owner: Assessment; write flow; one attempt lock and one UnitOfWork with outbox. Public HTTP contracts and prior acceptance remain regression controls. This review does not fix runtime, change applied migrations, deploy, or include unrelated Web work.

- [x] Inspect shared submission core, sweep, supervisor, worker root/config, migration 0011, grants and submitted evidence.
- [x] Run fresh supported regression checks against current source.
- [x] Independently probe provenance constraints, repeated failed-claim fairness and SQL access plans on isolated PostgreSQL; rerun existing compiled-process startup/health/SIGTERM/restart checks.
- [x] Review evidence fidelity, preserve source/migrations/historical evidence, clean fixtures and report prioritized findings; reopen affected acceptance items only when justified.

Review evidence is stored separately in [evidence](evidence/assessment-expiry-review-2026-10-08/README.md). Existing ATT-07 evidence is historical and was not overwritten. Local checks do not establish sustainable capacity, AWS savings or production SLO acceptance.

## Findings

### ER-02 — P1: một batch đầy hàng lỗi làm starvation toàn bộ hàng hợp lệ phía sau

[deadline-sweep.ts:30](../apps/api/src/modules/assessment/application/services/deadline-sweep.ts#L30) tạo `exclude=[]` mới mỗi tick và giới hạn cả lượt thất bại vào `batchSize`. Nếu các hàng đầu lỗi liên tục đủ một batch, tick sau lại chọn đúng nhóm đó. Backoff giảm tần suất nhưng không tạo tiến triển. Một worker với batch 1 chỉ cần một poison row; default batch 50 cần 50 hàng như vậy. Đây là cấu hình được hỗ trợ, không cần lỗi đồng thời ở mọi thí sinh.

Probe batch 2, hai hàng đầu fail tại outbox, một hàng hợp lệ phía sau: cả ba tick đều `processed=0, failed=2, due=3`; hàng hợp lệ vẫn `IN_PROGRESS`. Gỡ trigger lỗi thì cả ba được xử lý ngay. Test Grok chỉ có một poison row với batch 2 nên không phát hiện trường hợp này. Hậu quả: auto-submit và slot active của thí sinh hợp lệ có thể kẹt vô hạn.

Cần cơ chế tiến triển qua failed prefix giữa các tick, có giới hạn retry/cooldown và phục hồi sau restart/nhiều worker. Không chuyển transient failure thành trạng thái business `FAILED`, không bỏ atomic attempt/outbox. Thêm regression với số poison row ≥ batch, và batch 1.

### ER-01 — P2: constraint không thực sự buộc accepted submission có provenance

[0011_submission_kind.sql:21](../apps/api/src/infrastructure/database/migrations/0011_submission_kind.sql#L21) dùng `submission_kind IN (...)` trong nhánh accepted mà thiếu `submission_kind IS NOT NULL`. Với `submitted_at` có giá trị và kind NULL, toàn biểu thức trả NULL; PostgreSQL cho CHECK này pass.

Probe bằng login kế thừa đúng `examination_expiry_worker` commit được một row `EXPIRED`, `expired=true`, IDs/time hợp lệ nhưng `submission_kind=NULL`. Deferred completion guard không chặn. Sau đó immutable trigger lại từ chối sửa kind thành DEADLINE với `23514`, làm provenance rỗng bị đóng băng. Happy path hiện tại truyền kind đúng, nhưng DB invariant được cam kết không tồn tại cho writer lỗi, tooling hay bản deploy không đồng bộ.

Cần constraint fail-closed cho đủ hai nhánh: unsubmitted/null và submitted/non-null thuộc enum; kiểm tra cả INSERT và UPDATE bằng role runtime/expiry. Giữ migration đã áp dụng, dùng forward migration nếu 0011 đã được áp dụng. Không tự suy luận provenance của dữ liệu lỗi từ status.

### ER-04 — P2: volatile predicate loại bỏ index range ngay cả khi không có việc đến hạn

[postgres-attempt.repository.ts:41](../apps/api/src/modules/assessment/infrastructure/persistence/postgres-attempt.repository.ts#L41) và backlog ở dòng134 so deadline với `clock_timestamp()` ngay trong predicate discovery. Clock volatile không tạo deadline index bound. Việc EXPLAIN có tên index khi ép tắt seqscan không chứng minh range lookup hoạt động.

Probe PostgreSQL17, ANALYZE, 100.000 future `IN_PROGRESS`, không có due row, ba lần cùng data/config:

| Query | Execution median hiện tại | Median discovery stable đối chứng | Shared hit blocks hiện tại / đối chứng |
| --- | ---: | ---: | ---: |
| Claim rỗng | 11.302ms | 0.049ms | 1725 / 3–5 |
| Backlog rỗng | 10.491ms | 0.057ms | 1725 / 3 |

Hiện tại là Seq Scan, loại100.009 rows mỗi query. Đối chứng chỉ đổi predicate discovery sang `statement_timestamp()`, giữ nguyên `clock_timestamp()` sau lock: natural plan dùng `attempts_deadline` với `Index Cond`, không seqscan hint hoặc index mới. Đây là EXPLAIN timing cục bộ, không phải sustainable throughput/cost gain. Cần discovery có cutoff ổn định/indexable; vẫn recheck bằng clock sau lock cho correctness. Bổ sung natural `EXPLAIN ANALYZE` với nhiều future/terminal rows và xem lại tần suất/count backlog khi thực sự nhiều due rows.

### ER-03 — P2: số đo “deadline-to-commit lag” thực chất dừng trước persistence

[assessment-expiry-measure.mjs:335](../scripts/assessment-expiry-measure.mjs#L335) lấy `submitted_at - deadline`. `submitted_at` được core gán từ clock sau claim, trước UPDATE, outbox INSERT và COMMIT. Vì vậy field `deadlineToCommitLagMs` và summary gọi sai đại lượng, bỏ qua write/commit latency và không đo thời điểm dữ liệu durable.

Probe chèn delay200ms trong outbox và lưu một timestamp witness sau delay, vẫn trước COMMIT: reported lag2004ms; durable commit phải ≥2207.988ms. Ít nhất203.988ms bị bỏ sót. Đây không phải lỗi acceptedAt của domain; cần giữ acceptedAt theo contract. Cần đổi tên số đo hiện tại thành deadline-to-acceptance lag, đo riêng commit-observed lag kèm định nghĩa/error population. Không sửa raw lịch sử; bổ sung correction và raw mới. SQS dispatch và result latency vẫn là đại lượng khác.

## Phần đạt và validation

Boundary đúng: worker root gọi factory công khai của Assessment; use case đi qua repository/outbox/UoW ports; SQL nằm trong Infrastructure; scheduler không giả JWT hoặc lấy lock Identity. Manual/scheduler dùng chung acceptance core; claim một row `SKIP LOCKED`, clock sau lock, attempt/outbox cùng transaction. Không thêm Kafka/Redis/queue/scoring ngoài scope.

- Fresh `npm test`: **249 PASS =116 API +37 tooling +96 Web**. Web count là regression của worktree, không nghiệm thu phần UI đang làm ở task khác.
- `npm run lint` gồm quality/contracts: PASS,46 operations/425 examples. Typecheck/build PASS.
- Restricted PostgreSQL/HTTP/SMTP: **122 PASS,1 diagnostic deselected,7 suites**. Bao gồm17 expiry cases, compiled scheduler health/startup failure/SIGTERM/restart và manual query ceilings. Lần sandbox đầu bị `EPERM` toàn bộ connection, không tính là failure của sản phẩm; rerun được cấp quyền pass.
- Probe độc lập: **4 RED assertions /3 PASS controls**. Controls: accepted kind không sửa được, gỡ poison recover đủ, hai worker commit4 attempts/4 events/revision2 đúng một lần. RED được lưu tách khỏi green regression suite và giữ nguyên để tái hiện.
- Source hashes của cả6 raw ATT-07 runs khớp source hiện tại. Preservation gồm toàn bộ API source,11 migrations và historical Assessment evidence; không rewrite source/migration/raw cũ. Compiled migration bundle khớp source.

Không chạy lại Chromium HTTPS: increment không đổi Identity composition/shared HTTP adapter; fresh real HTTP integration đã chạy. Không tuyên bố đã test mất DB rồi phục hồi hoặc SIGKILL process trong transaction: suite hiện tại test startup DB lỗi, health bình thường, terminate backend trong transaction và SIGTERM/restart; phạm vi đó không tương đương toàn bộ fault matrix. ATT-10/11 vẫn mở. Không chạy k6/AWS, không đo production SLO/chi phí.

## Kết luận và bước sửa

Chưa qua bước kế tiếp. Mở lại **ATT-07 `[ ] — IN PROGRESS`**, roadmap **69 checked /147 pending /216 total**. Giữ CAT-09/10, ATT-01–06 và những subset đã chứng minh; full ATT-10/11, scoring/SQS, Reporting, retention, ID-11/Phase04 và production vẫn mở.

Thứ tự sửa đề xuất: fairness/retry failed prefix → provenance constraint → indexable discovery/backlog → sửa tên và đo commit lag. Mỗi lỗi cần regression RED→GREEN và evidence mới trước khi nghiệm thu lại. Review này chỉ thay tài liệu/trạng thái và thêm harness/evidence; không sửa runtime, stage/commit hoặc deploy.
