# UI-GAP register

Ngày ghi: 2026-10-07. Mọi mục dưới đây là **BLOCKED LIVE**. Demo có thể mô phỏng để xem giao diện. Lỗi live không được đổi sang dữ liệu mẫu. Không bịa field, không giải mã JWT, không cộng tổng từ một trang. Màn hình không in mã `UI-GAP`; người dùng thấy câu trạng thái và hành động tương ứng.

| ID | Thiếu ở contract/backend | Cách UI xử lý | Trạng thái |
| --- | --- | --- | --- |
| UI-GAP-01 | `GET /v1/me` không trả permissions | Live chặn toàn bộ Admin. Demo chỉ có preset trong bản demo, không có trong artifact live | BLOCKED LIVE |
| UI-GAP-02 | Attempt/history/result không trả tiêu đề và tên phần đã khóa | Chỉ hiện tiêu đề nếu người dùng đã mở đúng publication trong phiên. Lượt cũ không lấy tiêu đề đề hiện tại | BLOCKED LIVE |
| UI-GAP-03 | Chi tiết đề không có `serverNow` và số lượt còn lại | Đồng hồ chỉ chạy sau Attempt. Trang chi tiết nói rõ là chưa có số lượt đã dùng | BLOCKED LIVE |
| UI-GAP-04 | Không có search toàn cục, tổng số trang, danh sách version cũ | Cursor không hiện tổng. Không lọc giả trên một trang rồi gọi là tìm toàn bộ | BLOCKED LIVE |
| UI-GAP-05 | History không có tiêu đề đề | Dòng lịch sử dùng trạng thái và mã phiên bản, không gọi detail từng dòng | BLOCKED LIVE |
| UI-GAP-06 | Replay cần revision quản trị; candidate attempt revision không được dùng | Live không gửi replay. Demo lấy revision từ bộ nhớ mẫu của lượt FAILED | BLOCKED LIVE |
| UI-GAP-07 | Metrics chỉ là snapshot nghiệp vụ, không có p99/CPU/RDS/Redis/chi phí | Những ô thiếu hiện “Chưa có dữ liệu”, không hiện 0 và không vẽ biểu đồ | BLOCKED LIVE |
| UI-GAP-08 | Chưa có media, essay, magic link, GitHub, reset password | Không có nút giả. Login chỉ email và mật khẩu | BLOCKED LIVE |

Identity local có chín API nghiệp vụ. Catalog, Assessment, Reporting và Admin vẫn là contract. Giao diện live gọi endpoint thật và hiện lỗi khi capability chưa có.
