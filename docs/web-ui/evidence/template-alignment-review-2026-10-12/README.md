# Evidence — UI/template alignment review 2026-10-12

[Báo cáo và checklist](../../template-alignment-review-2026-10-12.md). Source baseline `08f17dc`; working tree sạch trước review. Vite `dev` demo hiện tại, In-app Browser; fixture tổng hợp, không có backend/AWS được gọi để chứng minh acceptance.

| Capture | Viewport | Template đối chiếu |
| --- | --- | --- |
| [Home](home-desktop.jpg) | 1280 × 900 | [Home V3](../../templates/stitch-v3/home-desktop-v3.png) |
| [Login](login-desktop.jpg) | 1280 × 900 | [Login V3](../../templates/auth-v3/login-desktop-v3.png) |
| [Dashboard](dashboard-desktop.jpg) | 1280 × 900 | [Dashboard V2](../../templates/dashboard-v2/reference-full.png) |
| [Danh sách đề](exam-list-desktop.jpg) | 1280 × 900 | [List V4 desktop](../../templates/catalog-profile-v4/exam-list-desktop-v4.png) |
| [Chi tiết đề](exam-detail-desktop.jpg) | 1280 × 900 | [Detail V4 desktop](../../templates/catalog-profile-v4/exam-detail-desktop-v4.png) |
| [Danh sách đề mobile](exam-list-mobile.jpg) | 390 × 844 | [List V4 mobile](../../templates/catalog-profile-v4/exam-list-mobile-v4.png) |

[Runtime CSS](runtime-tokens.json) lấy từ DOM/computed styles khi Dashboard desktop hiển thị: rail rộng224px, nền `rgb(8, 28, 37)`; teal primary, font Source Sans3/Noto Sans. [Manifest](manifest.json) ghi SHA-256 và kích thước file capture cùng hash các bản mẫu dùng đối chiếu; không thay bytes template.

Ảnh là viewport screenshot, không phải full-page; vị trí cuộn khác nhau, template nguồn là frame dài và dữ liệu minh họa khác fixture chạy. Không dùng các file này làm pixel-diff baseline đã nghiệm thu. Banner/kịch bản demo không tính là defect production. Login capture không điền credentials; tên/nội dung bài trong workspace là dữ liệu mẫu. Không lưu session/token, cookie hoặc nội dung email.

## Checks

- [x] Đọc template/implementation notes, source và quan sát sáu capture.
- [x] `npm run quality` — PASS: local links/anchors, source boundaries, contract metadata; 48 operations/445 examples.
- [x] `git diff --check` — PASS.
- [ ] Port template hiện hành — chưa triển khai; không có visual acceptance mới.

Không chạy lại application tests/axe/load test trong lượt review chỉ thay tài liệu. Báo cáo này không xác nhận live integration, production readiness hoặc tất cả trang/breakpoint. Server demo và viewport override phục vụ review được dọn sau khi chụp.
