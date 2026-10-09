# Prompt 04 — Public experience, How it works, Help

[04A — Ba page Public desktop](04a-public-desktop.md) đã review và lưu thành [Public V4](../templates/public-v4/README.md), findings còn mở. Brief dưới đây giữ yêu cầu đầy đủ của sample variants, mobile và states để bổ sung sau; không gửi nguyên khối tạo lại ba desktop chính. Các tên V3 trong brief cũ là ngữ cảnh nguồn, 04A đặt tên frame mới V4 và giữ cùng style Home V3.

```text
Trong “ExamPlatform UI Design”, ID 18257628123124303955, bổ sung 3 page public theo Home desktop V3 ID f5caae61539a43049ab56eea2b8b0c65 và mobile V3 ID 4e8b878555d148259ff0df819ae125a2. Không sửa Home/Dashboard/Exam hiện có. Giữ palette Cobalt–Apricot, public capsule header, typography và card geometry đã chọn.

Canvas #F3F6FC, white #FFFFFF, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro; số chọn lọc JetBrains Mono; card radius  20–24px; spacing 8px; shadow nhẹ. Logo tạm phiếu thi đính kèm, tránh remote image. Desktop 1280px / mobile 390px. Public nav có Trang chủ, Cách hoạt động, Trợ giúp và Đăng nhập/Tạo tài khoản phù hợp, không nhét tất cả link vào button lớn.

EP-16 — Trải nghiệm 3 câu mẫu /experience
- Một page độc lập, cùng family của khối demo trong Home nhưng có không gian làm bài tập trung.
- Nhãn “Bài mẫu”, “Không tính vào lượt thi thật”. Một câu một lựa chọn, một câu nhiều lựa chọn, một câu Đúng/Sai, dùng radio/checkbox rõ. Nội dung tổng hợp đơn giản, không lấy từ ngân hàng đề thật.
- Progress 1/3, previous/next, đánh dấu, xóa lựa chọn và bảng ba câu; cho quay lại giữ lựa chọn trong phiên trang.
- Trước xem kết quả có màn rà soát câu đã/chưa chọn và đánh dấu. Kết quả ghi “Kết quả mẫu”, điểm/đúng trong ba câu, giải thích các câu mẫu; thử lại, về Home và tạo tài khoản.
- Không countdown deadline, “Đã lưu máy chủ” hoặc thông tin proctoring. Refresh/rời trang bắt đầu lại, trình bày notice ngắn phù hợp.
- Mobile mọi lựa chọn dễ chạm, CTA cuối không che đáp án. Tạo biến thể đủ ba question types, rà soát và kết quả.

EP-17 — Cách hoạt động /how-it-works
- Hero ngắn có illustration giấy/bút 2.5D nhỏ, không lặp toàn bộ hero Home.
- Journey thực: tạo tài khoản → xác thực email → chọn đề/đọc hướng dẫn → làm bài/đánh dấu → nộp/theo dõi kết quả. Dùng stepper có thứ tự thực, mỗi bước có mô tả và link phù hợp.
- Giải thích save status, thời gian vẫn chạy khi rời trang, giới hạn lượt và khi được xem lời giải bằng khối minh họa nhỏ. Không tạo controls giả có vẻ tương tác thật.
- CTA thử ba câu mẫu và tạo tài khoản; FAQ liên quan. Desktop nhịp section thay đổi, mobile từng bước dọc; không quá nhiều card giống nhau.

EP-18 — Trợ giúp /help
- Header tìm hướng dẫn nếu tìm cục bộ có dữ liệu; nhóm Chủ tài khoản, Chọn đề, Trong phòng thi, Nộp/kết quả.
- FAQ accordion có state mở/đóng rõ; hướng dẫn khi không đăng nhập được, link email hết hạn, mất kết nối/chưa xác nhận lưu, kết quả đang xử lý, không được xem đáp án.
- Sidebar/menu nhóm trên desktop; mobile tabs hoặc nhóm thu gọn. Links về đề/lịch sử/đăng nhập đúng ngữ cảnh.
- Khu liên hệ đơn vị tổ chức trung tính: không tự bịa hotline, email support, chat trực tiếp hoặc ticket backend. Không hứa phục hồi câu chưa lưu.
- Giữ typography dễ đọc cho bài hướng dẫn dài và trạng thái không tìm thấy mục phù hợp.

Đầu ra: 3 page desktop 1280px / mobile 390px với footer sạch; sample question/review/result variants riêng. Tên EP-16/17/18 — [tên] — V3. Không tạo thêm landing pages hoặc quảng cáo ngoài phạm vi. Không đưa designer notes/handoff vào trang. Báo tên/ID frame thực tế và phần chưa tạo.
```
