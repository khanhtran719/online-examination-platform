# Reporting và trạng thái dùng chung — Codex Desktop V1

**Root checkpoint2026-10-12:** đã nhìn trực tiếp tất cả 7 ảnh chọn cuối, giữ làm visual reference có port findings. [Review tổng](../../review-2026-10-12.md) và [gallery](../../gallery.html); không runtime/mobile/production acceptance.

Ngày 2026-10-12. **Stage 2 đã tạo và self-review 7 ảnh chọn cuối cùng; root visual review đã hoàn tất; chỉ giữ visual reference có findings.** Root đã duyệt 7 brief/prompt trước generation. Built-in imagegen dùng 9 call: 5 page mới, 2 overlay đúng nền và 2 sửa EP-30. Hai attempt thống kê có geometry sai được giữ làm evidence, không chọn làm template. Chỉ desktop/dialog/drawer; mobile làm sau. Không thay app, API, schema, dependency, AWS, template cũ, registry tổng hoặc acceptance.

| Frame/state riêng | Brief và prompt | Từ prompt | Scope dữ liệu/khả năng |
|---|---|---:|---|
| EP-29 — Lượt FAILED, replay chưa khả dụng live | [Brief](ep-29-failed-attempt.md), [Prompt](prompts/failed-attempt-current.txt) | 1.125 | Điểm null; CTA disabled có lý do; không review/keys |
| EP-30 — Thống kê đúng frozen version | [Brief](ep-30-exact-version-statistics.md), [Prompt](prompts/exact-version-statistics.txt) | 1.087 | 80 retained COMPLETED mỗi câu; không server asOf/prompt/keys |
| EP-31 — Business snapshot, nguồn kỹ thuật unavailable | [Brief](ep-31-business-metrics-unavailable-technical.md), [Prompt](prompts/business-metrics-technical-unavailable.txt) | 1.088 | Backend BusinessMetrics đã có; presentation cần Web adapter; HTTP/queue không bịa số |
| EP-32 — Audit list, 8 items | [Brief](ep-32-audit-list.md), [Prompt](prompts/audit-list.txt) | 1.039 | Safe redacted read-only; no filter/export/global total |
| SY-01 — Public404 | [Brief](sy-01-public-404.md), [Prompt](prompts/public-404.txt) | 1.149 | Public header, home/back; copy/back là presentation target |
| SY-07 — Replay reason confirmation | [Brief](sy-07-replay-reason-dialog.md), [Prompt](prompts/replay-reason-confirmation.txt) | 1.105 | Conditional target contract/demo, không current-live-openable |
| SY-07 — Audit detail drawer | [Brief](sy-07-audit-detail-drawer.md), [Prompt](prompts/audit-detail-drawer.txt) | 1.200 | Target drawer trên item đã tải, reason null, copy correlation only |

Số từ tính theo whitespace trong prompt gốc, không tính phần brief hoặc prompt sửa ngắn. [screens.json](screens.json) giữ local IDs, source refs, permissions, fixture refs, actions, state, dependency nền, word count, exact prompt SHA-256, file generation nguồn, real dimensions, PNG SHA-256, attempt history và trạng thái QA. [fixtures.json](fixtures.json) là fixture gốc chung của nhóm. Không gán Stitch ID cho asset Codex.

| Ảnh chọn cuối cùng | Kích thước PNG thật | Review |
|---|---|---|
| [EP-29](images/ep-29-failed-attempt-current-v1.png) | 1495×1052 | FAILED/chưa có điểm; CTA live disabled có lý do |
| [EP-30](images/ep-30-exact-version-statistics-v3-count-ratios.png) | 1420×1108 | Sáu mẫu80, tỷ lệ và options140 đúng; thay stacked bars bằng count ratios |
| [EP-31](images/ep-31-business-metrics-unavailable-v1.png) | 1402×1122 | Snapshot/cohort/backlog đúng; HTTP/queue unavailable |
| [EP-32](images/ep-32-audit-list-v1.png) | 1455×1081 | Đúng8rows/order/actions/outcomes; không raw metadata |
| [SY-01](images/sy-01-public-404-v1.png) | 1496×1051 | Public shell, home/back, không private data |
| [Replay dialog](images/sy-07-replay-reason-confirmation-v1.png) | 1495×1052 | Đúng nền EP29, opaque version…0004, reason nguyên văn, target conditional |
| [Audit drawer](images/sy-07-audit-detail-drawer-v1.png) | 1455×1081 | Đúng nền EP32/row1; null reason; full correlation UUID đúng |

Kích thước là raster thực, **không** viewport đã test. Bảy ảnh đã được nhìn trực tiếp. Visual review chưa xác nhận font đã cài, exact CSS/token values, interactions, accessibility, mobile hoặc production.

## Nguồn đã kiểm tra

- [Quy định thiết kế chung](../../design-contract.md) và [Dashboard V2 tokens](../../../dashboard-v2/tokens.json).
- [Prompt08](../../../../stitch-page-prompts-v3/08-admin-attempt-statistics-metrics-audit.md), [Prompt09](../../../../stitch-page-prompts-v3/09-shared-states-handoff.md), AGENTS.md và project profile.
- Admin Web: attempt/statistics/metrics/audit pages, current live adapter, DTO/parser, mutation intent, demo replay revision; public chrome, router và NotFoundPage.
- Reporting: question-statistics DTO/service, BusinessMetrics domain/DTO/controller, audit domain/service/controller/DTO; [OpenAPI](../../../../../contracts/openapi.yaml) được đối chiếu với source hiện hành. Danh sách source chính xác, repo-relative trong từng screen.

## Quyết định source và current-versus-target

Phiên bản báo cáo là opaque publishedVersionId `…0004`, **không** suy “v4” từ đuôi ID hoặc draft revision4. Đề trong nhóm là identity đã phát hành/khóa, khác fixture draft chưa phát hành chung. Title/context đề có nguồn từ context đã tải; endpoint statistics chỉ trả IDs/counts nên không thêm prompt/type/vị trí display/answer keys. Timestamp thống kê không có asOf công khai nên ảnh không có “máy chủ cập nhật lúc”. Freshness theo từng primary statement, không snapshot chung nhiều trang.

EP-29 giữ FAILED, replayPending=false, result chưa có điểm, review không được tải ở pending result. Current live Web không có nguồn admin revision, do đó CTA bắt buộc disabled dù fixture đã có reason hợp lệ. Dialog replay là target riêng có điều kiện: FAILED + assessment.replay + valid current admin revision + reason hợp lệ + không inflight. Nền vẫn đúng EP-29 trước mutation; không đổi nền thành capability enabled khi tạo overlay. Nhận request không phải grading success hoặc điểm mới; replay không sửa answers/quota và không tạo attempt mới.

EP-31 dùng contract BusinessMetrics đã triển khai (`reporting.read`), giữ current-state cohort theo startedAt, backlog toàn hệ thống và asOf thật của fixture. Web MetricsPage/DTO cũ dùng combined Metrics (`system.metrics.read`) và chưa có adapter BusinessMetrics; ảnh là target presentation có ghi rõ ở manifest. HTTP RPS/p95/SQS depth/job age không có provider thì “Chưa có dữ liệu”; không lấy demo0, không gộp backlog thành queue depth, không active=online, không trend/SLO/cost/production claim.

Audit hiện luôn redacts raw reason thành null, vì vậy drawer viết “Không được cung cấp”. changedFields là allowlist nhãn field, không before/after values. Không raw payload, metadata tự thêm, secrets, answers hoặc PII. Fixture list pageSize8 hợp lệ theo contract, khác Web current hardcode20 để ảnh nhìn rõ8rows; next=null. Drawer là target presentation thay centered Dialog hiện hành, đọc selected loaded item, không endpoint mới. Copy vẫn idle trong frame.

Public404 dùng public shell, không Admin rail/avatar. Copy helper và safe back là target; link về home đã có source. Không show private route/resource. Bảy ảnh không bao gồm các variant403/loading/empty/load error/accepted replay/clipboard failure; không claim toàn bộ shared state catalog đã đủ.

## Fixture và self-review

Statistics sáu rows đều đúng+sai+chưa chọn=80. Câu…0202 là50/24/6; options60/55/18/7 tổng140 và mỗi selectedCount≤74 bài có chọn. Không option key hoặc nội dung câu. Multiple choice options không phải partition, không pie chart. Metrics240=24+216;180+6≤216;12≤14 và180; replay3≤backlog36; snapshot09:10–oldest08:40=1800giây. Audit8rows descending time, row1…0901/detail dùng cùng catalog.exam.replace, actor…0031, EXAM…0001, reason=null, fields title/sections, full correlation UUID. Attempt08:00→deadline09:30, submitted08:56, expiredfalse, score null. Không dữ liệu thực.

Đã kiểm tra source/DTO/OpenAPI, parse JSON, 7 số prompt nằm1000–1500 whitespace words, invariants thống kê, selected-count bounds, fixture timestamp, reasonnull và không numeric published-version label. Đã nhìn trực tiếp từng ảnh/attempt, xem local nền trước mỗi edit, đối chiếu số liệu/CTA/shell, đọc PNG dimensions và SHA-256, xác nhận file/prompt/source refs. Không chạy unit/integration/runtime/HTTPS/mobile vì chỉ tạo artifact raster/tài liệu, chưa đổi code. R-58/R-59 và workflow47–48 đã đọc: API checklist không có implementation mới để nghiệm thu; trạng thái report không được vượt evidence.

## Generation, sửa và findings còn lại

Đã tạo5page bằng built-in imagegen, một call/ảnh, không referenced images hoặc num_last_images. Sau khi xem local EP-29/EP-32, hai overlay dùng referenced_image_paths đúng nền và lưu riêng. Không CLI/API fallback; không ghi đè template cũ. Output source vẫn ở default generated_images và copy vào workspace. EP-29/replay nền giữ disabled live CTA, không sửa page thành khả năng live đã có. Drawer chỉ thêm panel vào đúng audit list.

EP-30 v1 có số liệu đúng nhưng các đoạn stacked bar không khớp tỷ lệ. [Repair01](prompts/exact-version-statistics-repair-01.txt) cố định geometry vẫn không đủ chính xác; v2 cũng bị loại. [Repair02](prompts/exact-version-statistics-repair-02.txt) thay sáu stacked bars bằng các numerator/denominator60/80,50/80,64/80,68/80,48/80,56/80 kèm percentages đúng. v3 được chọn; option bars60/55/18/7 và tổng140 vẫn giữ. Điều chỉnh presentation này tránh geometry dữ liệu sai, không đổi source hoặc contract. Original prompt và cả hai repair prompts được giữ, cùng hashes và source files trong screens.json.

Không còn material blocker về dữ liệu/capability qua self-review. Findings nhỏ khi port: dùng một bộ rail glyph/order và header badge thống nhất; đưa shared ticket/check vector vào header thay dấu check đơn; giảm nested tint ở EP29 và điều chỉnh disabled CTA contrast; bỏ khoảng trống legend cũ ở EP30; chỉnh tỷ lệ cohort/backlog EP31 gần2:1; thu nhỏ illustration404; bỏ lặp short/full actor/resource IDs trong drawer. Các tỷ lệ chart phải dựng chính xác từ số trong code, không lấy geometry raster làm số liệu. Font/hex/CSS/accessibility vẫn cần kiểm tra khi triển khai. Root quản lý manifest/registry tổng và acceptance; chưa tick runtime/mobile/production.
