# Ghi chú triển khai Public V4

[Review 04A](../../stitch-04a-review-2026-10-08.md) mô tả đầy đủ bằng chứng và hướng sửa. Các mục vẫn mở sau khi lưu template.

- [ ] **PUB-V4-01:** Radio chưa chọn có viền rõ; kiểm tra contrast/focus. Bỏ check phụ dễ hiểu là đã chấm đúng, dùng radio/nhãn Đã chọn.
- [ ] **PUB-V4-02:** Navigator có current outline riêng, dấu đã chọn/đánh dấu ngoài màu và accessible name. Progress 1/3 là số đã chọn.
- [ ] **PUB-V4-03:** Bỏ icon tài khoản thừa trong anonymous header; dùng nav đúng session và logo tạm chung.
- [ ] **PUB-V4-04:** Gọn hero/step/card Cách hoạt động, giảm callout lặp; ba điều cần nhớ thành dải ngắn. Trợ giúp đủ rộng cho nhãn/chip một dòng; count lấy từ FAQ thực tế.
- [ ] **PUB-V4-05:** Hero minh họa có cạnh giấy/phối cảnh/bóng tiếp xúc rõ hơn và nhãn Minh họa giao diện. Không vật bay trong câu hỏi/FAQ; kiểm chứng reduced motion.
- [ ] **PUB-V4-06:** Bỏ claims live sync/100%/máy chủ ổn định/chu kỳ mili-giây/an toàn tuyệt đối/chứng chỉ, nội dung tự luận và giới hạn lượt tự thêm. Bỏ Token 15 phút; policy hiện tại 30 phút, không hardcode policy vào artwork. Không hứa lưu thay đổi chưa ACK sau nộp.
- [ ] **PUB-V4-07:** Bỏ route thô, V4/DOC-V4, English implementation labels, năm/cập nhật/chính sách giá thiếu nguồn. Hướng dẫn khớp SaveStatus thật, không dùng ổ khóa TLS như ACK. Link ngoài chỉ có icon nếu thật sự mở ngoài.
- [ ] **PUB-V4-08:** Kiểm chứng bộ ba câu mẫu/marks/clear/review/result, memory-only và không tạo attempt/API nghiệp vụ, keyboard/shortcuts/accordion/auth links, responsive/contrast/motion. Hoàn thiện variants/mobile/states trước khi đóng coverage.

Giữ exact-match/no partial credit và lời giải tùy chính sách. Mẫu không tính vào lượt thi thật, refresh/rời route bắt đầu lại. Không copy câu hỏi/keys mẫu vào phòng thi thật.
