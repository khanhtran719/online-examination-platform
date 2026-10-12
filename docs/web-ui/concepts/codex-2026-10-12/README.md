# Codex UI concept pilot — 2026-10-12

User đề xuất tạo ảnh từng màn trực tiếp theo style chung thay cho việc nhờ Stitch tạo lại. Lượt này tạo **một ảnh mẫu desktop** cho bước Rà soát trước phát hành để minh họa khả năng và cách làm; chưa tạo toàn bộ backlog hoặc tự chọn template mới.

- [Ảnh preflight ready v1](preflight-ready-v1.png)
- [Prompt đầy đủ](preflight-ready-v1.prompt.md)
- [Manifest, kích thước và SHA-256](manifest.json)
- [Tokens tham chiếu](../../templates/dashboard-v2/tokens.json)
- [Brief 05B](../../stitch-page-prompts-v3/05b-admin-preflight-dialogs-desktop.md)
- [Review nguồn 05B-1 và các lỗi cần tránh](../../stitch-05b1-review-2026-10-12.md)

PNG thực tế 1195×1316px; kích thước trong prompt là mục tiêu bố cục, không phải viewport đã triển khai hoặc bản xuất 1280px từ Stitch.

## Review ảnh mẫu

- [x] Built-in image generation; lưu bản PNG vào repository, giữ nguyên file gốc.
- [x] Nhìn trực tiếp ảnh: rail trắng gọn, card trắng, hướng Cobalt–Apricot, đầy đủ footer và tên đề; không cắt nội dung chính.
- [x] Tổng 3 phần / 6 câu / 100 điểm; các phần 2/20, 2/30, 2/50. Lịch 15/11/2026 08:00–12:00, Giờ Việt Nam UTC+7, 90 phút và 3 lượt đúng fixture.
- [x] Checklist 5/5, nhắc máy chủ kiểm tra lại, chưa có phiên bản phát hành, có thay đổi chưa lưu; không tự thêm essay/proctoring/analytics/timestamp.
- [ ] Chuẩn hóa chính xác khi dựng UI: cột nội dung hiện gần 1.3:1 thay vì 2:1; rail có nhãn và rộng theo ảnh; font/token/kích thước/contrast chưa được đo từ CSS. Mục nhập trên rail cần theo navigation thật, không lấy chữ “Nhập đề” làm capability mới.
- [ ] Ảnh chưa có trạng thái tương tác, keyboard/focus, responsive hoặc integration. Chữ, icon và khoảng cách vẫn cần đối chiếu lại khi code; không suy ra accessibility hay tính đúng nghiệp vụ từ ảnh.
- [ ] Chưa chọn làm template, chưa sửa app và chưa cập nhật số lượng template retained trong registry.

## Cách tiếp tục với các màn khác

Giữ tokens, fixture và component shell làm nguồn chung. Tạo từng màn theo phạm vi cụ thể; các dialog/state phải tái sử dụng cùng page nền và dữ liệu, thay phần cần thay. Review nội dung, tổng số và capability trước khi giữ ảnh. Khi dựng ứng dụng, dùng shared components và render từ code để có chữ, layout, responsive và interaction xác định; ảnh AI là tài liệu tham chiếu thị giác, không thay design system hoặc contract.

Không tái tạo toàn bộ 33 nhóm màn trong lượt pilot này. Các mẫu đã chọn trước được giữ; thứ tự desktop/mobile/states và roadmap hiện hành chưa thay đổi.
