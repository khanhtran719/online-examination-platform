# Báo cáo công việc tiếp theo — Phần 02

Ngày: 2026-10-06. Đây là kế hoạch Phần 02 đã được thực hiện theo yêu cầu tiếp theo của user; specification/contract tooling đã bàn giao và [review PASS](phase-02-review.md). Application chưa triển khai. Nguồn trạng thái: [roadmap](implementation-roadmap.md); nguồn kết luận bootstrap: [review 18 mục](completed-checklist-review.md).

## 1. Trạng thái và mục tiêu

- [x] Bộ quy chuẩn và phần bootstrap đã mở: 18 mục đã hoàn thành, review và sửa findings. Lượt review ghi nhận 37 tests pass cùng typecheck/build/lint/quality; đây là bằng chứng local trong [validation log](validation.md).
- [x] Báo cáo kế hoạch Phần 02: tài liệu này mô tả thứ tự, đầu ra và gate; không phải hoàn thành product specification.
- [x] SPEC-01–11: hoàn thành artifacts/contract checks, được đối chiếu trong [review](phase-02-review.md); không phải hoàn thành runtime controls.
- [ ] BOOT-09/10: Git/remote và Nest API/worker composition roots vẫn chưa triển khai.
- [ ] Database/application/AWS/benchmark: chưa triển khai hoặc chưa đo; [production acceptance](production-acceptance.md) vẫn NOT ACCEPTED.

Mục tiêu Phần 02: xác định hành vi đủ chính xác để viết tests, schema, application flows và benchmark cùng một contract. Giảm nguy cơ phải sửa schema do chính sách điểm, version, thời gian, attempt limit hoặc retry chưa rõ. Không thêm resource AWS, cache hoặc abstraction trong bước lập specification.

## 2. Contract nền tảng và quyết định sản phẩm

Contract đã được thông qua trong [.ai/architecture.md](../.ai/architecture.md), [ADR-001](adr/001-project-adoption.md), [ADR-002](adr/002-cursor-pagination.md):

- Một modular monolith; Identity/Catalog/Assessment/Reporting là business capabilities. API và worker scale riêng.
- PostgreSQL là source of truth; business logic độc lập framework/driver/SDK. Infrastructure implements ports; writes dùng explicit UnitOfWork, reads có thể dùng optimized projections.
- Đề, câu hỏi, lựa chọn, scoring và explanation policy của attempt phải đóng băng. Unpublish ngăn lượt mới, không sửa lượt đang thi.
- Start/limit và save/submit cần serialization trong DB; deadline dùng server time. Save phải kiểm tra thời gian sau khi lấy lock.
- Critical writes có durable actor-scoped receipt/fingerprint. Duplicate không tạo thêm effect, key dùng cho payload khác phải conflict; save không được âm thầm last-write-wins giữa các tab.
- Submit commit state + receipt + outbox trước acknowledgement; grading ngoài request. SQS delivery có thể duplicate; inbox/result/projection cần atomic durability trước ACK.
- HTTP envelope và cursor contract đã có; Redis chưa được bật. SLO/capacity/cost hiện vẫn là target hoặc chưa đo.

Các chủ đề quyết định ở mục 6 đã có baseline trong product/permissions/SLO contracts. Nếu thay baseline/contract, phải ghi lý do, ADR khi ảnh hưởng architecture và cập nhật tài liệu sở hữu rule trước implementation; không âm thầm thay semantics.

## 3. Chi tiết 11 đầu mục

| ID / owner | Công việc cần làm | Đầu ra và tiêu chí hoàn thành |
| --- | --- | --- |
| **SPEC-01 — Catalog + Assessment** | Xác định scope exam ban đầu; hợp lệ hóa Single Choice/Multiple Choice/True-False; unanswered, clear answer, duplicate option, điểm câu/section, điểm tối đa, rounding. Mô tả exact-match không partial credit hiện có. TOEIC/IELTS conversion cần policy/version riêng trước khi công bố thang điểm đó. | Product spec có ví dụ input → expected score, rule validation và policy version. Không gọi raw score là TOEIC/IELTS score khi chưa có specification quy đổi. Mapping tới scoring unit cases và tests còn cần viết. |
| **SPEC-02 — Catalog** | Draft/publish/unpublish/republish; atomic publication; snapshot membership/order/options/scoring/release policy. Định nghĩa sửa question bank và lịch khi đã có attempts, dữ liệu nào được sửa hoặc phải tạo version mới. | Version contract và ví dụ publish/edit/start race. Attempt luôn gắn một complete immutable version; nội dung candidate và nội dung grading cùng version. Rule release không đổi dưới attempt đang tồn tại. |
| **SPEC-03 — Catalog + Assessment** | Open/close/duration; lưu instant UTC và timezone hiển thị; validation khoảng thời gian, exact-boundary, vào muộn, close giữa lượt thi. Chốt công thức deadline và thời điểm được phép start/save/submit/release. Countdown lấy deadline từ server, resume không reset clock. | Time policy có timeline và boundary examples. Phân biệt close ngăn start với close cắt deadline nếu policy chọn cách đó. Không tự dùng thời gian client hoặc timestamp trước lock wait để chấp nhận save. |
| **SPEC-04 — Assessment** | Attempt count/limit theo exam hay version; một active attempt trong phạm vi nào; start trả attempt đang active hay lỗi; resume, history và count CREATED/EXPIRED/FAILED. Replay lỗi grading dùng lại attempt hay tạo mới phải rõ. | Start/resume decision table. Duplicate/concurrent starts không vượt limit, không tạo hai active attempts trong phạm vi đã chọn. Kết quả sau timeout/restart và actor-scoped key reuse được xác định. |
| **SPEC-05 — Assessment** | Autosave theo batch/per-answer; mark và clear; expected per-answer version; atomicity của batch; conflict UX giữa các tab; key/fingerprint scope, canonical payload, receipt retention/pruning và retry sau retention. Định nghĩa giới hạn payload/batch, client debounce/retry và pending/confirmed save. | Mutation/retry contract có response examples. Old retry trả original receipt, không revert answer mới; conflicting payload không được nhận cùng key. Sau hết retention, duplicate không được mặc định coi là write mới khi có thể phá correctness. |
| **SPEC-06 — Assessment** | Transition table CREATED/IN_PROGRESS/SUBMITTED/PROCESSING/COMPLETED/EXPIRED/FAILED; actor/trigger/precondition, expiry reason, retries/replay, allowed errors. Chọn cách biểu diễn PROCESSING: transaction-local ban đầu hoặc durable lease/fencing có design/crash-test gate. | State machine và recovery table. EXPIRED do deadline vẫn được chấm và giữ provenance; transient failure rollback/retry; permanent failure/operator replay có audit. Manual submit và expiry chỉ tạo một accepted submission/outbox. |
| **SPEC-07 — Assessment** | Status/result DTO, polling/backoff/stop rules; freshness nếu projection async; release never/after completion/after exam close; reveal answer keys/explanations theo frozen policy; result ownership và caching eligibility. | Release/access matrix cho từng state/thời điểm/actor. Candidate question payload không có keys/explanations; result/status không được lộ qua lỗi, logs hoặc timing policy sai. Scoring latency đo commit → durable result, không từ lúc worker receive. |
| **SPEC-08 — Assessment + Reporting** | Best/latest/per-attempt ranking; scope exam/version và khả năng so sánh điểm; deterministic tie-breaker; visibility/opt-in/privacy; rank ổn định giữa pagination; freshness và retention. Định nghĩa question-stat denominators, unanswered và duplicate/replay effects. | Ranking/statistics specification có examples tied scores/multiple attempts/versions. Một completion chỉ đóng góp đúng effect; cursor có unique tie-breaker, không lộ email/PII ngoài policy. Không chọn index/cache trước query contract. |
| **SPEC-09 — Identity + Catalog + Reporting** | Candidate/Admin permission matrix và object ownership; safe first-admin provisioning; account/session revoke expectations. Import format/validation/size/batch/atomicity/idempotency/report lỗi. Audit event fields/access/retention, dữ liệu thi và session retention/deletion policy. | Permission matrix, import contract và retention matrix. Không có public self-escalation; admin mutations/import/replay có audit theo transaction contract. Nêu rõ ai được xem keys, submissions, scores, statistics và system metrics. |
| **SPEC-10 — Các capability, Presentation adapters** | OpenAPI: route, auth, DTO, constraints, HTTP status, safe error mapping, envelope/cursor, idempotency/version headers và examples. Event schema `attempt.submitted.v1`, identity/version/correlation/causation, compatibility và unknown/poison policy. | OpenAPI và runtime event-schema contract không chứa candidate answers/keys trong queue. Mapping domain errors không phụ thuộc HTTP. Mỗi endpoint chỉ định owner, read/write, transaction/lock/idempotency và acceptance-case IDs. Không expose private repositories giữa module. |
| **SPEC-11 — SRE / Performance / FinOps** | SLI population/window/error treatment; latency cho mọi hot route; scoring freshness; capacity/headroom và recovery targets. Workload exam size/payload, question mix, active users, autosave interval/batch/jitter, retry/tab rate, submit spread, polling và ranking burst. Expected query/round-trip budget phải ghi trước implementation. | SLO/workload contract tái tạo được k6 scenario và metric populations. Phân biệt target đã định nghĩa với target đã đạt. Không loại valid-candidate throttling/timeouts để làm đẹp SLO. Cost normalization theo [performance protocol](performance.md), chưa có số đo thì ghi chưa đo. |

## 4. Thứ tự thực hiện và đầu ra

| Đợt | Đầu mục | Lý do thứ tự / checkpoint review |
| --- | --- | --- |
| **A — bước bắt đầu kế tiếp** | SPEC-01 → SPEC-02 → SPEC-03 | Score/content/time quyết định snapshot, validation và deadline. Review bằng ví dụ đề có hai sections, ba loại question, republish và candidate vào muộn. |
| **B** | SPEC-04 → SPEC-05 → SPEC-06 | Dùng version/time đã rõ để chốt start/limit/save/submit/expiry/recovery. Review duplicate, lock wait qua deadline, hai tab và API timeout sau commit. |
| **C** | SPEC-07 → SPEC-08 → SPEC-09 | Chốt ai được xem gì, khi nào; ranking/statistic effects và admin/import/audit. Permission outline bắt đầu từ đợt A, hoàn thiện ở C. |
| **D** | SPEC-10 → SPEC-11 | Consolidate DTO/event/error/public contracts và workload/SLO. API/workload outline có thể viết sớm để kiểm tra policy A–C; chỉ đóng gate sau consistency review. |

Các artifact dưới đây **đã được tạo và kiểm chứng**; bảng mục 3 mô tả scope của từng SPEC:

| Artifact bàn giao | Nội dung / traceability |
| --- | --- |
| [Product specification](product-specification.md) | SPEC-01–08: policy definitions, decision tables, lifecycle, concurrency/recovery, scoring/ranking examples. |
| [Security/permissions](security-and-permissions.md) | SPEC-09: permissions, ownership, admin bootstrap, import/audit/retention; requirements cho session/token transport để Identity phase triển khai. |
| [OpenAPI](contracts/openapi.yaml) | SPEC-10: Candidate/Admin APIs và hot-path payload/error/response examples. |
| [Event schema](contracts/attempt-submitted.v1.schema.json) | SPEC-10: broker event validation và compatibility. |
| [SLO/workload](slo-and-workload.md) | SPEC-11: SLI/SLO/workload parameters, query budgets và benchmark acceptance. |

Cập nhật [contract-test matrix](contract-tests.md) bằng case IDs, expected durable outcomes, owner và phase sẽ implement/run test. Trong Phần 02, case được viết ra là **planned**; không ghi đã pass integration. Nếu xuất hiện architecture conflict, ADR được tạo theo quyết định thực tế, không tạo ADR/template chỉ để đủ số file.

Mỗi SPEC chỉ được tick khi artifact tương ứng đủ nội dung, ví dụ/edge cases rõ, không còn quyết định chặn chính mục đó, đã review với contract và cập nhật roadmap. Đường dẫn thực tế được ghi ngay cạnh evidence; tên file có thể gộp nếu vẫn tìm được owner và policy.

## 5. Acceptance cases bắt buộc phải đặc tả

Đây là yêu cầu cho specification và các tests tương lai, **chưa phải kết quả chạy**:

| Case | Kết quả phải quy định / kiểm chứng về sau |
| --- | --- |
| Publish/edit/start đồng thời | Attempt chỉ thấy một version complete; edit sau start không đổi question/scoring/release. |
| Hai start cùng candidate/exam | Serialization/constraint bảo vệ active-attempt và limit; receipt/retry policy xác định response. |
| Save ở đúng deadline hoặc đợi lock qua deadline | Không accept save bằng client clock hoặc server timestamp cũ. |
| Hai tabs dùng cùng expected version | Chỉ mutation hợp lệ được accept; tab còn lại nhận conflict và cách refetch/reconcile rõ. |
| Save A, save B mới hơn, retry A | Original receipt cho A; persisted answer B giữ nguyên. |
| Key cũ + payload khác / retry ngoài retention | Conflict hoặc documented safe outcome; không tự replay thành mutation mới thiếu bảo vệ. |
| Submit đồng thời autosave / expiry | Answer commit trước submit được đưa vào score hoặc save bị reject; một submission và stable outbox intent. |
| Commit thành công rồi HTTP timeout/API restart | Retry trả durable accepted outcome; không có in-memory-only save/submit acknowledgement. |
| Worker duplicate hoặc crash trước/sau commit | Một result/statistics/leaderboard effect; ACK sau durability; recovery/replay policy rõ. |
| Result trước thời điểm explanation release | Chỉ dữ liệu được phép; candidate khác không đọc được attempt/result/history. |
| Tied score / nhiều attempts / phiên bản khác | Ranking và denominator deterministic theo policy, pagination không dựa large OFFSET. |
| Refresh/logout/admin escalation/import retry | Quyền và revoke semantics rõ; không tự cấp admin, không duplicate import effects, audit và secret redaction đúng. |

## 6. Những lựa chọn đã chốt trong specification

Đây là các chủ đề đã xử lý trong phase: baseline exact-match, clipped deadline, quota xuyên versions, atomic versioned saves/seven-day receipts, frozen release/best ranking/global opt-in, explicit permissions/retention và reproducible workload. Danh sách gốc dưới đây mô tả phạm vi quyết định; chi tiết adopted ở artifacts mục 4, không còn product blocker cho Phần 03:

1. **Scope điểm:** baseline exact-match hiện có; các thang điểm chứng chỉ muốn hỗ trợ và ví dụ quy đổi chuẩn nếu đưa vào scope.
2. **Close/deadline:** close chỉ ngăn start hay rút ngắn attempt; ứng xử vào muộn; thời gian release theo frozen close instant.
3. **Limit:** scope exam/version, counting FAILED/EXPIRED/CREATED và replay grading. Lỗi hệ thống không được tùy tiện tiêu thêm attempt của candidate.
4. **Save UX:** batch atomicity/clear/mark, conflict handling, retry/key/receipt retention; acknowledgement chỉ khi durable.
5. **Release/ranking/privacy:** default reveal, best/latest, tie-breaker, anonymization và visibility; không tự chọn để tiện code.
6. **Quyền và dữ liệu:** admin bootstrap, import/report access, session/audit/attempt retention và delete/anonymize behavior.
7. **Workload/SLO:** question count/payload, save/poll frequencies, all-route p95/p99, scoring/recovery windows và eligible/error population.

Theo [SLO/workload](slo-and-workload.md), các targets đã được định nghĩa: availability ≥99.9%, GET exam p95 <250ms, save <300ms, submit acknowledgement <500ms, unexpected errors <1%, 2,000 active candidates; scoring 99% ≤60s; disaster RPO ≤5min/RTO ≤30min, cùng các hot-route/p99 thresholds. Chúng chưa được xác nhận bằng benchmark/recovery và không phải production commitment đã chứng minh.

AWS account/profile/region và domain/TLS chưa chốt. Các input này cần trước deployment/resource costing; không chặn SPEC-01–10 và việc viết workload/SLO targets. Không có domain không làm mất yêu cầu TLS.

## 7. Gate trước khi chuyển Phần 03

- SPEC-01–11 có artifact/evidence links, ownership và examples; điểm mở có chủ sở hữu và không chặn schema/public contract.
- Lifecycle/version/time/limit/retention/release thống nhất với architecture, domain helper và test cases; mismatch được ghi và xử lý, không coi helper hiện có là toàn bộ specification.
- OpenAPI/event contract có validation/error/retry/permission/compatibility; event không chứa answers/keys.
- Mỗi critical operation có transaction/lock/idempotency outcome; mỗi hot read có projection/pagination/payload/query budget.
- Workload có đầy đủ parameters để dựng k6; SLO đã được định nghĩa với population/window, production verification vẫn pending.
- Chạy `npm run quality` cho tài liệu; validate OpenAPI/JSON schema khi chúng được tạo. Nếu đổi domain behavior, viết regression tests trước rồi chạy unit/typecheck/build/lint phù hợp.
- Review báo cáo kết quả, cập nhật từng checkbox theo bằng chứng; không tick application/benchmark/deploy từ kết quả documentation.

Sau gate: khép BOOT-09 theo thông tin remote thực tế; bắt đầu Phần 03 schema/migrations/UoW/pool/technical DB tests. BOOT-10 theo sau trước application flows. Sau đó Identity → Catalog → Assessment/async worker. Start/save/submit DB races và SQS inbox tests ở phase application tương ứng, không kéo vào DB-11 trước khi flows tồn tại.

## 8. Kiểm chứng báo cáo này

Báo cáo kế hoạch ban đầu đã qua quality; execution sau đó có **48 tests/typecheck/build/lint/quality PASS**, xem [validation](validation.md). Roadmap hiện **29/212 hoàn thành, 183 chưa hoàn thành**. Không chạy runtime/DB/AWS/benchmark trong scope specification/tooling; 37 tests ở mục 1 là bootstrap evidence lịch sử, không phải số tests mới nhất.
