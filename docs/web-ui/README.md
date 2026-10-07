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

Tiếng Việt mặc định, thuật ngữ tiếng Anh dùng khi thuộc nội dung câu hỏi. Light theme là baseline. Candidate dùng top navigation; phòng thi là layout riêng; Admin dùng sidebar và bảng dữ liệu. Không carousel, gradient lớn, hình stock, leaderboard podium hoạt họa, biểu đồ giả hoặc dark theme trước khi baseline hoàn tất.

Frontend chọn **React + TypeScript strict + Vite static SPA**, React Router, TanStack Query cho server reads, CSS variables/CSS Modules cho tokens và styles. State thi dùng reducer/coordinator riêng, không giao mutation correctness cho cache defaults. Test tools dự kiến Vitest/Testing Library và Playwright/axe. Chưa cài dependency; Grok phải kiểm tra compatibility/lockfile lúc triển khai. [ADR-007](../adr/007-web-ui-implementation-direction.md) ghi lý do và giới hạn của quyết định.

## 3. Hai đường triển khai

| Chế độ            | Dùng để làm gì                                                              | Quy tắc                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Demo có tương tác | Hoàn thiện toàn bộ Candidate/Admin UI và scenarios khi business API chưa có | Banner cố định “Dữ liệu mẫu”; fixture tổng hợp, có state transitions/save conflict/error; không giả đã gọi AWS/backend  |
| Live integration  | Nối Identity hiện có và những capability được backend triển khai sau        | Không fallback sang dữ liệu mẫu khi lỗi. Capability thiếu hiển thị unavailable hoặc route bị chặn; giữ error state đúng |

Hiện có **9 business API Identity chạy local**. Catalog/Assessment/Reporting/Admin APIs là specification, chưa triển khai. Browser HTTPS cũng chưa được kiểm chứng. `/v1/me` trả Profile, **không trả permissions**; frontend chưa có nguồn authoritative để tự bật menu Admin. Xem dependency register trong API document. Chế độ demo có thể mô phỏng permissions để nghiệm thu UI; live mode không lấy quyền từ lựa chọn vai trò, localStorage hay JWT decode.

Outcome cần Grok giao: app static chạy được, UI đủ luồng demo, Identity live theo contract khi môi trường có HTTPS, tests/screenshots/report, và danh sách live dependency chưa giải quyết. “UI demo hoàn chỉnh”, “đã tích hợp Identity”, “full live system”, “production accepted” là bốn trạng thái khác nhau.

## 4. Trạng thái bàn giao tài liệu

- [x] UI-DOC-01 — Chốt phong cách, tokens, layout và danh mục màn hình.
- [x] UI-DOC-02 — Đối chiếu API/security/product, ghi dependency và state rules.
- [x] UI-DOC-03 — Lập 32 task frontend có dependency, đầu ra và acceptance.
- [x] UI-DOC-04 — Viết scenarios/nghiệm thu và yêu cầu evidence.
- [x] UI-DOC-05 — Viết prompt khoảng 1.000 từ cho Grok.

**FE implementation sau review và lần sửa 2026-10-07:** 3/32 task còn được tick (FE-01, FE-03, FE-04). [Review](review-2026-10-07.md) giữ nguyên kết quả RED. [Fix evidence](evidence/fix-2026-10-07/README.md) ghi các ca W-14, W-06, W-16, W-18 và FE-23 đã PASS trên preview, cùng hai smoke cũ FAIL vì copy không còn mã `UI-GAP` và menu thí sinh không hiện “Quản trị”. FE-32 vẫn IN PROGRESS. Product roadmap không được cộng số và WEB-01–10 không được tick. HTTPS Identity vẫn BLOCKED.

## 5. Những gì không giao Grok làm trong UI increment

Không đổi pg/ORM, migration, backend auth, scoring, SLO, Terraform hoặc AWS resource. Không thêm thanh toán, webcam/proctoring, khóa copy/chuột phải, chặn đổi tab, essays/speaking, chat, reset password, role assignment UI, CSV/XLSX import, magic link/GitHub hoạt động khi chưa có contract. Không đặt access/refresh token hoặc private key vào JavaScript. Không tạo số liệu performance/cost/rating hay khẳng định điểm TOEIC/IELTS chính thức.

Nếu Grok chỉ có môi trường sinh frontend và không có repository, phải đính kèm ít nhất toàn bộ bộ tài liệu này, OpenAPI, product và security contract; nó chỉ được báo demo hoàn tất. Live auth/browser/security acceptance cần repository và backend/environment thật.

[Web UI đợt1 — nền tảng giao diện](foundation-implementation-2026-10-07.md): Brand/navy/mint, shared controls và Candidate/Admin navigation theo bộ mẫu secondary pages. Named scope độc lập với full FE/production acceptance.
