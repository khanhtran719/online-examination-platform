# Bộ bàn giao Web UI cho Grok 4.7

**PORT-05D 2026-10-13:** Phòng thi/Autosave/Nộp bài hoàn thành cục bộ trên Web
và tablet. Có phiếu câu hỏi, ba kiểu đáp án, countdown, đối chiếu xung đột,
đăng nhập lại và trạng thái chưa xác nhận nộp. Controller tách khỏi view;
chỉ báo đã lưu sau ACK hợp lệ. Đề 120 câu làm được từ trang đầu 20 câu.
850 root/49 Chromium PASS; 26 ảnh kiểm font/axe/overflow/gutter/dialog đạt.
[Checklist/review](port-05d-2026-10-13.md), [evidence](evidence/port-05d-2026-10-13/README.md),
[gallery](evidence/port-05d-2026-10-13/gallery.html). D1–D5 COMPLETE locally.
Tiếp theo PORT-05E Hồ sơ/Tài khoản Web/tablet. Parent PORT-05/full live/mobile/
production còn mở; các checkpoint dưới giữ phạm vi lịch sử.

**PORT-05C2026-10-13:** Đã hoàn thiện Trạng thái bài/Kết quả/Giải thích trên
Web/tablet. Controller tách khỏi page; polling tôn trọng thời gian chờ máy chủ,
dừng khi mất quyền; result/review cache xoá đúng scope. Xem lại từng câu, lọc các
câu đã tải, trước/sau và keyboard focus.827 root/44 Chromium PASS; final review
có full root/full Chromium receipts;20 captures font/axe/overflow/gutter đạt.
[Checklist/review](port-05c-2026-10-13.md), [evidence](evidence/port-05c-2026-10-13/README.md),
[gallery](evidence/port-05c-2026-10-13/gallery.html). S1–S5 COMPLETE locally.
Next PORT-05D Exam Room/Autosave/Submit Web/tablet. Parent PORT-05/full live/mobile/
production giữ mở; các checkpoint dưới giữ scope lịch sử.

**PORT-05B2026-10-13:** Lịch sử thi/Bảng xếp hạng đã port theo hai mẫu điều chỉnh
đã chốt cho Web/tablet. Controller tách khỏi page, cache theo tài khoản/phiên bản,
refresh từ đầu, dữ liệu ẩn/xóa khi mất quyền và bỏ phản hồi đến muộn.799 root/
41 Chromium PASS;11 ảnh font/axe/overflow/gutter đạt. [Checklist/review](port-05b-2026-10-13.md),
[evidence](evidence/port-05b-2026-10-13/README.md), [gallery](evidence/port-05b-2026-10-13/gallery.html).
H1–H5 COMPLETE locally; lint/format/quality/types/builds PASS. Parent PORT-05/full live/mobile/production còn mở.
Tiếp theo Status/Result/Released Review. Các checkpoint dưới giữ scope lịch sử.

**Ưu tiên hiện hành,2026-10-12:** Web desktop và tablet ở768/1024/1280/1440px;
mobile design/matrix tạm hoãn cho giai đoạn app theo người dùng. Giữ regression
cũ; không tự mở phạm vi mobile hoặc coi demo là live acceptance.

**PORT-05A hoàn thành cục bộ:** danh sách đề, chi tiết đề và xác nhận bắt đầu
trên Web/tablet; controller tách khỏi UI, tìm trong các đề đã tải, cursor tải lại
từ đầu và dữ liệu xóa khi mất quyền/phiên. Chặn nhấn đúp; mất xác nhận giữ nguyên
yêu cầu, phản hồi cũ không điều hướng. [Checklist/review](port-05a-2026-10-12.md),
[bằng chứng](evidence/port-05a-2026-10-12/README.md),
[17 ảnh](evidence/port-05a-2026-10-12/gallery.html):779 root/39 Chromium PASS;
lint/types/builds/format/contracts đạt; font/axe/overflow/gutter đạt ở bốn target
widths. API/template/bằng chứng PORT-01–04 giữ nguyên. Roadmap89/217, FE7/32 không
đổi; parent PORT-05/live/production còn mở. Tiếp theo History/Leaderboard theo
mẫu điều chỉnh đã chọn, mobile/app hoãn. Các checkpoint dưới giữ phạm vi lịch sử.

**PORT-04 hoàn thành cục bộ:** tổng quan Admin, giám sát/danh sách lượt, chi tiết
lượt thi, thống kê câu hỏi, số liệu nghiệp vụ/kỹ thuật chưa có nguồn và audit;
dialog xử lý lại/drawer dùng đúng quyền và dữ liệu. Controller tách khỏi UI,
cache xóa khi mất quyền; retry giữ nguyên yêu cầu, số liệu ghi rõ scope/mốc đọc.
[Checklist/review](port-04-2026-10-12.md), [bằng chứng](evidence/port-04-2026-10-12/README.md):
760 root/36 Chromium PASS; lint/types/builds/format/contracts đạt;45 Web/tablet
captures không axe violations/body overflow, font đã tải. Roadmap89/217 và FE7/32
giữ nguyên; live Admin/WEB-03, AWS và production còn mở. Bước tiếp theo đề xuất:
Candidate/Public Web/tablet. Các checkpoint bên dưới giữ phạm vi lịch sử.

**PORT-03 hoàn thành cục bộ:** ngân hàng câu, editor ba loại và preview, dialog
đổi loại/lưu trữ/đối chiếu/rời trang, import JSON → kiểm tra → xác nhận → báo cáo.
Controller tách khỏi UI; đáp án đi cùng lựa chọn khi sắp xếp; retry giữ đúng yêu
cầu, xung đột chỉ nhận bản mới có xác nhận, dữ liệu ẩn/xóa khi mất quyền.
[Checklist/review](port-03-2026-10-12.md), [bằng chứng](evidence/port-03-2026-10-12/README.md):
729 root/31 Chromium PASS; lint/types/builds/format/contracts đạt;23 Web/tablet
captures không axe violations/body overflow, font đã tải. Roadmap89/217 và FE7/32
giữ nguyên; live Admin/WEB-03 và production còn mở. Bước kế tiếp PORT-04
Operations/Reporting Web/tablet. Các checkpoint dưới giữ phạm vi lịch sử.

**PORT-02 hoàn thành cục bộ, 2026-10-12:** Editor ba bước Thông tin/Cấu trúc/
Kiểm tra, xác nhận phát hành/gỡ phát hành/lưu trữ, bỏ phần, rời bản nháp và đối
chiếu xung đột theo mẫu đã chốt. Model/controller/UI tách trách nhiệm; retry giữ
đúng yêu cầu và revision, không lưu lại khi chỉ retry phát hành; giữ chính xác
seconds/UTC và xóa dữ liệu khi mất quyền. [Checklist/review](port-02-2026-10-12.md),
[bằng chứng](evidence/port-02-2026-10-12/README.md):697 root/28 Chromium PASS,
lint/types/builds/format/contracts đạt;14 captures không axe violations/body
overflow, font đã tải. Roadmap89/217 và FE7/32 giữ nguyên; live Admin, mobile/state
matrix và production còn mở. Bước kế tiếp PORT-03 bank/form ba loại/import.
Các checkpoint dưới đây giữ phạm vi lịch sử của chúng.

**PORT-01 hoàn thành cục bộ, 2026-10-12:** [Kiến trúc frontend](frontend-architecture.md)
và lint kiểm tra ranh giới feature/shared/adapter; controller/page tách dữ liệu và
hiển thị. Shared Cobalt–Apricot shell/controls và hai pilot Dashboard/Admin exam
list đã port. [Checklist/review](port-01-2026-10-12.md), [ảnh và kiểm tra](evidence/port-01-2026-10-12/README.md):
663 root/26 Chromium PASS; six loaded1280/1440/320 captures. Public marketing giữ
palette riêng; FE7/32, WEB-03/live/matrix/mobile/production vẫn mở. PORT-02 là bước
tiếp theo được đề xuất; các checkpoint dưới đây giữ phạm vi lịch sử của chúng.

**Trạng thái mới nhất — UI tạm chốt:** người dùng đã chọn [ba bản điều chỉnh History/Leaderboard/Admin list](templates/codex-desktop-adjustments-2026-10-12/selection.md) làm main reference desktop Loaded; có thể sửa thêm sau. Registry hiện **33/33 page families có named visual reference, 0 main references chờ chọn, 0 prompt-only**. Mobile/full variants/states, findings khi port và application implementation vẫn mở. Các đoạn counts/chờ chọn phía dưới là checkpoint lịch sử.

**Ba bản điều chỉnh mới 2026-10-12:** [Lịch sử, Bảng xếp hạng và Danh sách đề Admin](templates/codex-desktop-adjustments-2026-10-12/README.md) đã có PNG, brief/prompt nguyên văn và root review. [So sánh trước/sau](templates/codex-desktop-adjustments-2026-10-12/gallery.html), [findings](templates/codex-desktop-adjustments-2026-10-12/review.md). Đây là ba đề xuất chờ chọn main reference, chưa port; registry vẫn30 giữ/3 chờ chọn/0 prompt-only. Bộ35 references bên dưới giữ nguyên.

**Kết quả hiện hành 2026-10-12:** [Bộ Codex Desktop V1](templates/codex-desktop-v1/README.md) có **35 ảnh chọn cuối: 34 frame mới + preflight đã giữ**, 34 brief và prompt chính 1.039–1.491 whitespace words. [Gallery](templates/codex-desktop-v1/gallery.html), [review và checklist tiếp theo](templates/codex-desktop-v1/review-2026-10-12.md), [kế hoạch theo nhóm/rủi ro](codex-desktop-delivery-2026-10-12.md). Root đã review từng ảnh; findings nhỏ xử lý khi code. Registry hiện **30 families giữ visual reference/3 main references đã review chờ chọn/0 chỉ có prompt**. Mobile, broader states và application port còn mở. Các thống kê/lựa chọn bên dưới là checkpoint lịch sử, không ghi đè kết quả mới.

**Pilot Codex trước lựa chọn:** [Preflight ready và prompt đầy đủ](concepts/codex-2026-10-12/README.md), tạo bằng built-in image generation theo hướng Cobalt–Apricot. Sau đó người dùng đã chọn giữ làm template và yêu cầu tạo bộ mới như checkpoint trên; application chưa port.

**Review05B-1 ngày2026-10-12:** [đủ3 desktop frame, findings còn mở](stitch-05b1-review-2026-10-12.md). Foreground dialog đúng ý chính nhưng background sai fixture và tự thêm capabilities; Validation có lỗi counter/copy. Chưa chọn template hoặc port. Không tạo lại05B-1; nhóm tiếp theo05B-2 sau quyết định giữ mẫu.

**Inventory 2026-10-12:** [Danh sách 33 nhóm màn và phần còn thiếu](screen-inventory-2026-10-12.md). Vẫn 16 đã chốt mẫu/4 chờ chọn/13 chưa có template lưu-review; ba preview 05B-1 đã review, chưa xuất nguồn/chọn làm template. Sau quyết định giữ mẫu, tiếp tục 05B-2; không gửi lại prompt tạo 05B-1.

**Review 2026-10-12: UI hiện tại chưa khớp template đã chọn.** [Báo cáo đối chiếu và checklist](template-alignment-review-2026-10-12.md) xác nhận bản đang chạy vẫn là navy/teal/mint; Dashboard V2 và bộ Cobalt–Apricot V3/V4 mới được lưu để port sau. Các báo cáo visual cũ bên dưới là lịch sử theo từng phạm vi, không chứng minh đã port bộ mới.

Ngày 2026-10-06 cho bộ spec;2026-10-07 có SPA trong `apps/web`. **FE7/32 và WEB-02 local complete**; [Identity HTTPS evidence](../evidence/identity-https-2026-10-07/README.md) dùng API/PG/SMTP thật và có boundary bug fixes theo security contract. [Runbook](runbook.md), [UI-GAP](ui-gap.md) và [prior evidence](evidence/README.md) giữ phạm vi từng lần chạy. Full frontend/production acceptance chưa hoàn tất; không ORM switch hoặc AWS deployment trong increment này.

## 1. Đọc và giao việc

Gửi toàn bộ thư mục này cùng repository cho Grok; prompt một mình không thay thế spec. Thứ tự đọc:

1. [Thiết kế và mô tả màn hình](design-spec.md): phong cách, tokens, wireframes, responsive, copy và chức năng.
2. [API và state](api-and-state-contract.md): route mapping, API thật/mới là contract, auth/CSRF, autosave, deadline, idempotency và dependency còn thiếu.
3. [Task triển khai](implementation-tasks.md): FE-01–FE-32 theo thứ tự, cách làm và điều kiện được tick.
4. [Nghiệm thu](acceptance-checklist.md): scenarios, browser/accessibility/performance và evidence cần giao.
5. [Prompt khoảng 1.000 từ](grok-implementation-prompt.md): copy nguyên phần nội dung để mở công việc với Grok.

Các tài liệu này đặc tả Web, không thay Architecture Contract. Nếu mâu thuẫn, làm theo yêu cầu người dùng, AGENTS, [.ai/architecture.md](../../.ai/architecture.md), [product](../product-specification.md), [security](../security-and-permissions.md), [OpenAPI](../contracts/openapi.yaml); ghi conflict thay vì tự đổi semantics. Các URL bắt đầu `/v1` là API; các URL khác trong spec là route trình duyệt.

## 2. Quyết định thiết kế đã chốt

**Hướng thị giác hiện hành (2026-10-08):** [bộ template Stitch V3](templates/stitch-v3/README.md), giữ Dashboard desktop V2 làm chuẩn workspace. Người dùng chọn Cobalt–Apricot, rail trắng và soft bento; tạo đủ page trên Stitch trước khi port lại UI. [Bộ prompt các page còn lại](stitch-page-prompts-v3/README.md) và [các lỗi xử lý lúc code](templates/stitch-v3/implementation-notes.md) ghi phạm vi này. Các mô tả màu/phong cách bên dưới là baseline của những đợt triển khai cũ; product/API/state contract vẫn là nguồn chức năng.

Tên hiển thị tạm: **Exam Platform**; không tạo một thương hiệu mới hoặc dùng logo của TOEIC/IELTS. Phong cách **phòng thi số**: nền xám sáng, bề mặt trắng, navy làm chữ/chrome, teal cho hành động, amber cho cần chú ý. Điểm nhận diện là bộ thời gian–tiến độ–trạng thái lưu và bản đồ câu hỏi giống phiếu trả lời; trang trí giữ tiết chế để người thi tập trung.

Tiếng Việt mặc định, thuật ngữ tiếng Anh dùng khi thuộc nội dung câu hỏi. Workspace light theme, Candidate/Admin dùng rail navy trên desktop và menu mobile theo đợt1; phòng thi là layout riêng. Theo yêu cầu đợt2, auth có split panel và giấy/bút CSS3D; dashboard/detail có illustration nhỏ. Không đưa ambient motion vào phòng thi, không có biểu đồ hoặc số liệu giả.

Frontend đã dùng **React + TypeScript strict + Vite static SPA**, React Router, TanStack Query cho server reads, CSS variables/CSS Modules cho tokens và styles. State thi dùng reducer/coordinator riêng, không giao mutation correctness cho cache defaults. Vitest/Testing Library và Playwright/axe đã có trong lockfile. [ADR-007](../adr/007-web-ui-implementation-direction.md) ghi lý do và giới hạn của quyết định.

## 3. Hai đường triển khai

| Chế độ            | Dùng để làm gì                                                              | Quy tắc                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Demo có tương tác | Hoàn thiện toàn bộ Candidate/Admin UI và scenarios khi business API chưa có | Banner cố định “Dữ liệu mẫu”; fixture tổng hợp, có state transitions/save conflict/error; không giả đã gọi AWS/backend  |
| Live integration  | Nối Identity hiện có và những capability được backend triển khai sau        | Không fallback sang dữ liệu mẫu khi lỗi. Capability thiếu hiển thị unavailable hoặc route bị chặn; giữ error state đúng |

Hiện có **9 business API Identity và Catalog exam/question/import chạy local** theo [project profile](../project-profile.md). Identity browser HTTPS có10 ca PASS với API/PG/SMTP thật. Assessment core vừa được triển khai local trong increment backend riêng; Reporting còn là specification. Live UI Catalog/Assessment vẫn cần matrix integration riêng. `/v1/me` trả Profile, **không trả permissions**; frontend chưa có nguồn authoritative để tự bật menu Admin. Chế độ demo mô phỏng permissions; live mode không lấy quyền từ lựa chọn vai trò, localStorage hay JWT decode.

Outcome cần Grok giao: app static chạy được, UI đủ luồng demo, Identity live theo contract khi môi trường có HTTPS, tests/screenshots/report, và danh sách live dependency chưa giải quyết. “UI demo hoàn chỉnh”, “đã tích hợp Identity”, “full live system”, “production accepted” là bốn trạng thái khác nhau.

## 4. Trạng thái bàn giao tài liệu

- [x] UI-DOC-01 — Chốt phong cách, tokens, layout và danh mục màn hình.
- [x] UI-DOC-02 — Đối chiếu API/security/product, ghi dependency và state rules.
- [x] UI-DOC-03 — Lập 32 task frontend có dependency, đầu ra và acceptance.
- [x] UI-DOC-04 — Viết scenarios/nghiệm thu và yêu cầu evidence.
- [x] UI-DOC-05 — Viết prompt khoảng 1.000 từ cho Grok.

**FE hiện tại:7/32 checked** theo [implementation tasks](implementation-tasks.md); FE32 IN PROGRESS. [Review](review-2026-10-07.md) và [fix evidence](evidence/fix-2026-10-07/README.md) giữ kết quả lịch sử; sau đó HTTPS Identity local đã đóng named scope WEB02. Các đợt visual chỉ đóng phạm vi ghi trong report riêng, không cộng acceptance cho toàn frontend/production.

## 5. Những gì không giao Grok làm trong UI increment

Không đổi pg/ORM, migration, backend auth, scoring, SLO, Terraform hoặc AWS resource. Không thêm thanh toán, webcam/proctoring, khóa copy/chuột phải, chặn đổi tab, essays/speaking, chat, reset password, role assignment UI, CSV/XLSX import, magic link/GitHub hoạt động khi chưa có contract. Không đặt access/refresh token hoặc private key vào JavaScript. Không tạo số liệu performance/cost/rating hay khẳng định điểm TOEIC/IELTS chính thức.

Nếu Grok chỉ có môi trường sinh frontend và không có repository, phải đính kèm ít nhất toàn bộ bộ tài liệu này, OpenAPI, product và security contract; nó chỉ được báo demo hoàn tất. Live auth/browser/security acceptance cần repository và backend/environment thật.

[Web UI đợt1 — nền tảng giao diện](foundation-implementation-2026-10-07.md): Brand/navy/mint, shared controls và Candidate/Admin navigation theo bộ mẫu secondary pages. Named scope độc lập với full FE/production acceptance.

[Web UI đợt2 — onboarding và catalog](onboarding-catalog-implementation-2026-10-07.md):7 pages, CSS3D paper art, dashboard/history scope, browse và detail;18 browser +10 HTTPS cases,65 visual probes và26 axe scans.

[Web UI đợt3 — làm bài và kết quả](assessment-results-implementation-2026-10-07.md):6 pages, thẻ câu hỏi/phiếu trả lời, điểm và giải thích, history/leaderboard có vùng cuộn keyboard và refresh. Evidence riêng cho visual và regression; không đóng nghiệm thu live Assessment/Reporting.

[Web UI đợt4 — Admin](admin-implementation-2026-10-07.md):14 page exports, overview CSS3D, editor3 bước/picker, native answer keys, import/archive confirmation và bảng giám sát/báo cáo. Final2026-10-08:224 root tests,24 Chromium cases,155 layout probes và62 axe scans. Live Admin vẫn chặn khi chưa có nguồn quyền authoritative.
