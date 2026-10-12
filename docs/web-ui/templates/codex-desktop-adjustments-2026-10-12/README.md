# Điều chỉnh ba mẫu desktop — 2026-10-12

## Kết quả

Theo yêu cầu người dùng, tạo ảnh điều chỉnh từ ba mẫu hiện có: EP-14 Lịch sử thi, EP-15 Bảng xếp hạng và EP-19 Danh sách đề Admin. Giữ originals, dùng Soft Bento/Tactile Cobalt–Apricot và [design contract](../codex-desktop-v1/design-contract.md). **Người dùng đã tạm chốt cả ba bản điều chỉnh** làm main visual references desktop Loaded, cho phép sửa thêm sau; [quyết định và phạm vi](selection.md). Các task port/runtime/mobile/production còn mở.

Root sở hữu review tổng, manifest, gallery và registry. Mỗi tác nhân chỉ ghi nhóm được giao, đọc source/contract và xem ảnh input trước khi edit bằng công cụ image generation tích hợp. Prompt chính khoảng 1.000–1.500 từ; prompt sửa nếu cần được lưu riêng nguyên văn. File PNG chọn cuối được copy vào repository, ghi kích thước thực và SHA-256. Không sửa ứng dụng, API, migrations, AWS hoặc template cũ.

**Hoàn tất và giữ ba ảnh điều chỉnh**, mỗi ảnh một lần generation tích hợp, không correction call/CLI fallback. Root đã đọc ba prompt trước generation và xem trực tiếp cả ba ảnh cuối. Prompt chính dài 1.299–1.351 từ tách bằng whitespace. [Gallery trước/sau](gallery.html), [manifest](manifest.json), [review tổng](review.md), [validation tạo ảnh](validation.json) và [validation lựa chọn](selection-validation.json) ghi file thực và giới hạn. Originals giữ nguyên; bộ Codex Desktop V1 vẫn có 35 references đã giữ, ba main references mới được giữ riêng tại đây.

| Màn | Ảnh đã giữ | Kích thước raster | Prompt |
| --- | --- | --- | --- |
| EP-14 — Lịch sử thi | [PNG](history/history-adjusted-desktop-v1.png) | 1536×1024 | [1.351 từ](history/primary.prompt.txt) |
| EP-15 — Bảng xếp hạng | [PNG](leaderboard/leaderboard-adjusted-v1.png) | 1402×1122 | [1.299 từ](leaderboard/leaderboard-adjusted-v1.prompt.txt) |
| EP-19 — Danh sách đề Admin | [PNG](admin-exams/admin-exams-adjusted-v1.png) | 1275×1233 | [1.322 từ](admin-exams/primary.prompt.txt) |

## Checklist

- [x] **ADJ-01:** Xác định đúng IDs và findings: EP-14 history; EP-15 leaderboard; EP-19 exam list.
- [x] **ADJ-02:** Lịch sử: rail gọn, phân bổ cột hợp lý, badge và tên đề dễ đọc, bỏ copy không có nguồn. Badge hai dòng có chủ ý và tỷ lệ cột cần kiểm bằng CSS khi port.
- [x] **ADJ-03:** Bảng xếp hạng: đồng bộ shell/logo, chỉnh hierarchy top 1–3, giữ bí danh và đúng version scope. Icon Lịch sử còn cần thay khi dựng component chung.
- [x] **ADJ-04:** Danh sách đề Admin: cột thao tác/bản sửa gọn, mật độ bảng hợp lý, logo đúng family, giữ scope filter đã tải. Nhãn bản sửa đọc một dòng nhưng chưa đặt dưới publication như prompt.
- [x] **ADJ-05:** Root nhìn từng ảnh; kiểm fixture, nội dung, states, style, CTA và table readability; findings nhỏ được ghi trong review, không còn blocker dữ liệu/quyền trong ảnh.
- [x] **ADJ-06:** Lưu manifest/gallery/prompt và validation; cập nhật registry thành đề xuất điều chỉnh đã review, không tự chấp nhận template.
- [x] **ADJ-07:** Người dùng tạm chốt ba main visual references; giữ khả năng chỉnh sau. Registry hiện 33 families giữ reference/0 chờ chọn/0 prompt-only; không coi full state/mobile hoặc port đã đóng.
- [ ] **ADJ-08:** Port vào ứng dụng, kiểm font/contrast/focus/viewport/permissions/cursor và mobile bằng evidence riêng.

## Nguồn

- [Review History/Leaderboard](../../stitch-03b-review-2026-10-08.md).
- [Review Admin](../../stitch-05a-review-2026-10-08.md).
- [Dashboard V2](../dashboard-v2/README.md) và [tokens](../dashboard-v2/tokens.json).
- [Bộ desktop/dialog đã tạo](../codex-desktop-v1/README.md).

Kích thước raster không phải viewport đã test. Ảnh không chứng minh interaction, responsive, font thực tế, accessibility hoặc correctness runtime. Mobile và port là bước riêng.
