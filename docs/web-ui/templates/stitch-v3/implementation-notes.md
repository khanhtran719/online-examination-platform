# Ghi chú phải xử lý khi code UI theo V3

Ngày 2026-10-08. Người dùng đồng ý tiếp tục thiết kế page mới, tạm hoãn việc sửa các lỗi V3. Giữ nguyên ảnh template; xử lý các mục dưới đây trong lượt port UI sau khi chốt đủ page.

## Bố cục và asset

- [ ] V3-01 — Exam desktop: tách nhãn lưu khỏi A−/A/A+; gom tiện ích vào menu, dành chiều rộng hợp lý cho tên đề, timer và nút nộp. Có menu truy cập navigation/tiện ích đầy đủ.
- [ ] V3-02 — Home mobile: chừa khoảng dưới header; không che badge/heading ở đầu trang hoặc khi cuộn.
- [ ] V3-03 — Sheet câu hỏi mobile: chỉ một header trong lớp đang mở; backdrop/anchoring rõ, nút đóng dễ thấy; tránh header phòng thi chồng tiêu đề sheet.
- [ ] V3-04 — Thay logo remote bị hỏng bằng [SVG local](brand/examplatform-mark.svg); thống nhất mark/wordmark; không lặp alt text và tên brand. Căn header/footer ở mọi breakpoint.
- [ ] V3-05 — Dashboard mobile: giữ timer có deadline thật như desktop; căn CTA lịch sử không bị cắt hoặc xuống dòng ngoài ý muốn.
- [ ] V3-06 — Exam mobile: giảm các tầng header, căn trái đáp án/checkbox, dùng nhãn nút mở bảng câu hỏi không bị ellipsis.
- [ ] V3-07 — Lưới câu mobile: hit area tối thiểu 44px, cân nhắc 6–7 cột; tiết chế viền/cờ/chấm trùng chỉ báo.
- [ ] V3-08 — Home illustration: tăng cạnh giấy/độ dày/phối cảnh và contact shadow; đồng bộ desktop/mobile. Giữ UI đọc được khi illustration chưa tải; motion nhẹ, có reduced motion; phòng thi tĩnh.

## Nội dung và hành vi không được suy ra từ ảnh

- [ ] V3-09 — Đối chiếu text, labels, dữ liệu mẫu và các chức năng với product/API/state contract trước khi port. Bản chốt là thị giác; dữ liệu mới trong hình chưa được chấp thuận.
- [ ] V3-10 — Không biến mic/camera, proctoring, audio exhibit, khóa tab, OTP, lưu LocalStorage hoặc export chứng chỉ xuất hiện trong hình thành tính năng nếu dự án không có contract tương ứng.
- [ ] V3-11 — “Đã lưu” chỉ theo ACK thật; bài mẫu không tạo attempt và không tuyên bố durable save. Timer/save/submit/reauth giữ hợp đồng hiện hành.
- [ ] V3-12 — Không quy đổi điểm bài trắc nghiệm thành điểm TOEIC/IELTS chính thức; không tạo số liệu, thống kê hoặc kết quả từ dữ liệu không đầy đủ.
- [ ] V3-13 — Đồng nhất điểm đến navigation và nhãn tiếng Việt với router thật; không tạo màn Results/Library độc lập chỉ vì một icon trong template.
- [ ] V3-14 — Các state/dialog/showcase đặt ngoài trang sản phẩm; giữ permission, loading/empty/error và interaction đúng nghĩa.

## Điều kiện đóng khi triển khai

Kiểm tra đúng những vùng được sửa tại 390px và desktop, tên dài, bàn phím, focus, modal/sheet, sticky controls và reduced motion. Dùng các checks đã có phù hợp phạm vi. Chỉ đánh dấu xong với bằng chứng triển khai mới; các mục chưa được sửa trong giai đoạn lưu template này.
