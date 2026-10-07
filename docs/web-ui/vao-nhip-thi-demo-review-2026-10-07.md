# Demo “Vào nhịp thi” — 2026-10-07

## Phạm vi và kết quả

Theo yêu cầu “Cho xem bản demo đi”, đã dựng bản xem trước tương tác cho định hướng trong [đề xuất marketing và hình ảnh](marketing-and-visual-proposal-2026-10-07.md). Bản xem trước nằm trong thư mục visualization của chat; thay đổi trong repository là báo cáo này. Các thay đổi ứng dụng, Identity HTTPS và kế hoạch triển khai đang có trong working tree thuộc công việc khác.

Cập nhật sau yêu cầu “Triển khai cái này luôn đi”: bản React đã được tích hợp vào `apps/web`, CTA tạo tài khoản dẫn tới form thật. Xem [báo cáo triển khai và evidence mới](vao-nhip-thi-implementation-2026-10-07.md). Các kiểm tra/giới hạn bên dưới thuộc bản prototype riêng tại thời điểm dựng demo.

Bản demo có bốn màn hình: giới thiệu, phòng làm ba câu mẫu, kết quả mẫu và xem trước các bước tạo tài khoản. Trang giới thiệu dùng hình đề thi, bút và đồng hồ dựng bằng Three.js 0.180.0, có chuyển động nổi, phản ứng nhẹ theo con trỏ và nút dừng hiệu ứng. Phòng làm bài dùng nền sáng và điều khiển HTML để đọc, chọn và chuyển câu. Bộ câu hỏi là nội dung minh họa tự tạo; điểm được tính từ lựa chọn của người dùng trong demo.

Các thao tác gồm chọn một đáp án, chọn nhiều đáp án, đúng/sai, đánh dấu, chuyển câu, giữ lựa chọn khi quay lại, xóa lựa chọn và thử lại. Các bước đăng ký được trình bày bằng nội dung xem trước; demo không có trường nhập thông tin tài khoản. Cảnh có fallback CSS nếu thư viện hoặc WebGL không khả dụng. Chế độ giảm chuyển động của hệ điều hành giữ cảnh tĩnh.

## Kiểm tra đã chạy

- RED: kiểm tra nút trải nghiệm mở phòng thi đã thất bại với `false !== true` trước khi thêm xử lý sự kiện.
- GREEN: `verify-vao-nhip-thi.mjs` đã qua toàn bộ luồng ba câu; xác nhận radio/checkbox, giữ đáp án và đánh dấu khi chuyển câu, điểm 3/3 theo lựa chọn đúng, reset, xóa lựa chọn, dừng hiệu ứng và xem trước đăng ký.
- `audit-vao-nhip-thi.mjs` xác nhận renderer thực tế là `webgl`; không có lỗi JavaScript hoặc tải tài nguyên thất bại trong Chromium kiểm tra.
- Trang giới thiệu và phòng thi vừa các viewport 320, 390, 768, 1024 và 1440 px. Wrapper dành 32 px cho khoảng đệm, nên chiều rộng sản phẩm thực tế lần lượt là 288, 358, 736, 992 và 1408 px. Màn kết quả và đăng ký cũng được kiểm tra tràn ngang ở viewport 320 px.
- Kiểm tra đáp án sai cho kết quả 2/3; chế độ `prefers-reduced-motion: reduce` dừng animation và chuyển nhãn điều khiển thành “Hiệu ứng tĩnh”.
- Đã xem ảnh desktop và điện thoại của trang giới thiệu, phòng thi và ảnh kết quả; sửa vòng trang trí tràn ngang và tăng độ tương phản chữ trên mặt đề thi.

Mã demo và bằng chứng ở `/Users/trankhanh/.codex/visualizations/2026/10/07/01a1140f-e5a0-7ae2-b13f-314cef2559ed/`: `vao-nhip-thi-demo.html`, hai script kiểm tra, `vao-nhip-thi-checks.json` và ảnh `vao-nhip-thi-*.png`.

## Giới hạn

Đây là bản xem trước để đánh giá hình ảnh và luồng trải nghiệm. Chưa tích hợp các component React, API, xác thực hoặc hệ thống bài thi của ứng dụng. Chưa đo FPS, Core Web Vitals, tác động chuyển đổi, hoặc kiểm tra đầy đủ trên Safari và thiết bị thật. Kiểm tra Chromium dùng SwiftShader cho WebGL. Không thay đổi trạng thái nghiệm thu hay các task trong roadmap từ kết quả demo.
