# Checklist xử lý Auth V3 khi code

Theo [review Auth](../../stitch-auth-review-2026-10-08.md) và quyết định người dùng ngày 2026-10-08. Tất cả mục dưới đây còn mở. Việc lưu template không có nghĩa là lỗi đã được sửa.

- [ ] AUTH-01 — Tách các bảng Mô phỏng/Critical State Variants, security showcase và handoff khỏi product pages. Mỗi trang chỉ hiển thị trạng thái thực tế đang diễn ra.
- [ ] AUTH-02 — Tách Verify valid, expired, pending, success và session conflict. Link hết hạn dùng recovery phù hợp; không đồng thời giữ form hoàn tất đang hoạt động.
- [ ] AUTH-03 — Dùng một public header gọn trên mobile, một mark/wordmark phiếu thi; bỏ logo/menu/navigation lặp và chuẩn hóa các điểm đến.
- [ ] AUTH-04 — Dùng helper trung tính cho quy tắc mật khẩu; field error sát input và form error gần đầu form/CTA. Normal state không luôn có cảnh báo đỏ. Login error không nằm sau toàn bộ card.
- [ ] AUTH-05 — Bổ sung form states thực cho submitting/rate-limit/network error, tên quá dài, nhập email resend khi chưa có giá trị, cooldown/ready/error và recovery/success/phiên đăng nhập khác. Card mô tả không thay thế frame hoàn chỉnh.
- [ ] AUTH-06 — Chuẩn hóa màu nút, spacing, body typography và icon/illustration. Tiết chế monospace/all-caps, badge/mã kỹ thuật và card phụ để form giữ trọng tâm.
- [ ] AUTH-07 — Empty password không hiện strength “Mạnh”; chỉ báo phản ánh đúng giá trị. Cho đọc email cần xác nhận tài khoản và text quan trọng, tránh ellipsis che thông tin.
- [ ] AUTH-08 — Sửa nội dung theo contract: thời hạn link, nhận yêu cầu/giao email/xác thực thành công; không port các claim ISO/SSL/E2E, sinh trắc học, AI giám sát, chứng chỉ/CAT, CCCD/mã phòng thi hoặc capabilities tự thêm trong ảnh.
- [ ] AUTH-09 — Kiểm tra desktop/mobile, tên/email dài, zoom, bàn phím/focus, password manager/paste, controls, loading và reduced motion. “Đã xác thực” theo kết quả thật, không tự đăng nhập hoặc giữ token trong storage.

Khi đóng từng mục, ghi bằng chứng triển khai và checks tương ứng. Không đánh dấu xong chỉ vì đã đổi prompt hoặc chốt hình thức thiết kế.
