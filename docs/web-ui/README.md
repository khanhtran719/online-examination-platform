# Bộ bàn giao Web UI cho Grok 4.7

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
