# Prompt 03B — Lịch sử và Bảng xếp hạng desktop

**Đã có hai desktop Loaded và [đã review 03B](../stitch-03b-review-2026-10-08.md).** Ảnh/IDs thật lưu ở evidence, findings vẫn mở; chưa chọn template. Không gửi lại prompt này để tạo trùng. Tiếp theo là [04A — Public desktop](04a-public-desktop.md). Mobile và states phụ giữ trong [backlog 03](03-results-history-ranking.md); khối dưới là yêu cầu gốc để đối chiếu.

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, tạo ngay đúng 2 trang WEB DESKTOP 1280px: Lịch sử thi và Bảng xếp hạng. Giữ nguyên tất cả frame đã có; chưa tạo mobile hoặc các frame empty/loading/error riêng. Thực hiện tạo UI, không chỉ trả lại kế hoạch.

NGUỒN VÀ PHONG CÁCH
Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b là chuẩn Candidate rail/navigation. Catalog desktop V4 ID 801fc02aa8bd4586b0b1ee821d5fd009 và Profile desktop V4 ID 4d096315e9994045b67307d0530f5ea4 là chuẩn card/form. Nếu đã có Result desktop từ nhóm 03A, đọc frame thật để dùng cùng typography và tên/version; thiếu nguồn thì báo, không tự sửa trang cũ.
Soft Bento: nền #F3F6FC, trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, chữ #1B2540/#58627A; Be Vietnam Pro, JetBrains Mono cho dữ liệu chọn lọc; radius 20–24px, gutter 16–24px, shadow mềm. Rail gọn như Dashboard, không sidebar Enterprise rộng. Bảng có nhiều khoảng thở, tên dài wrap, row action không bị đẩy khỏi cột.
Sáng, tích cực, tinh tế; dùng icon phiếu thi/tệp bài nhỏ có chiều sâu 2.5D ở header nếu hợp lý. Không dashboard chart, podium hoạt họa, confetti hoặc hiệu ứng nổi trên dữ liệu. Không sao chép Pro/AI/latency/chứng chỉ từ nguồn. Hover/focus rõ, motion nhẹ và reduced motion; ghi chú kỹ thuật ở ngoài UI sản phẩm.

FRAME 1 — “EP-14 — Lịch sử thi — V4 — Desktop — Loaded”
Route /history. Header “Lịch sử thi”, helper “Xem lại các lượt thi và tiếp tục bài đang làm”, nút “Làm mới”. Không tổng số lượt, điểm trung bình, tỷ lệ hoàn thành hoặc rank cá nhân từ danh sách chưa tải hết. Không thêm global search/sort/date filter chưa có chức năng.
Bảng/list có các cột: Đề thi & phiên bản; Bắt đầu; Trạng thái; Điểm; Hành động. Ngày/giờ có GMT+7. Không cột thời gian nộp/kết thúc nếu nguồn history không cung cấp.
Hiển thị 6 lượt mẫu để có bố cục thực tế:
1. AWS Certified Solutions Architect Associate SAA-C03, v2.3, Đã hoàn thành, 772/1000; “Xem kết quả”.
2. Một lượt TOEIC đang làm; điểm “Chưa có”; “Tiếp tục”. Tiếp tục cùng lượt, không tiêu thụ lượt mới; không dựng countdown nếu thiếu deadline có thẩm quyền.
3. Một lượt SQL đã nhận bài/đang xử lý; điểm “Chưa có”; “Xem trạng thái”.
4. Một lượt Giải tích đã hoàn thành sau nộp khi hết giờ; điểm có thật trong fixture, badge phụ “Nộp khi hết giờ”; “Xem kết quả”. Hết giờ không đồng nghĩa thất bại.
5. Một lượt tuyển dụng xử lý thất bại; điểm “Chưa có”; “Xem trạng thái”. Candidate không có nút replay quản trị.
6. Một lượt đề cũ với tên dài, v1.1, đã hoàn thành; tên wrap, action và điểm vẫn gọn. Nếu không có tên từ ngữ cảnh hợp lệ, dùng “Bài thi đã thực hiện” kèm mã lượt rút gọn, không tự ghép dữ liệu publication mới vào lượt cũ.
Trạng thái dùng icon/chữ/badge, không chỉ màu. Điểm null không viết 0. Row navigation rõ, không clickable cả hàng gây xung đột với các nút.
Footer “Đã tải 6 lượt thi”, nút “Tải thêm” nếu còn trang. Không “6/24”, số trang hoặc tổng giả. Mobile và variants sẽ làm sau, không đặt các mẫu empty/error bên dưới bảng trong frame này.

FRAME 2 — “EP-15 — Bảng xếp hạng — V4 — Desktop — Loaded”
Route /exams/:examId/versions/:versionId/leaderboard. Trang dành cho thí sinh đã đăng nhập, chỉ một đề và một phiên bản: AWS Certified Solutions Architect Associate SAA-C03, v2.3. Header có “Bảng xếp hạng”, tên đề/version, về Chi tiết đề và “Làm mới”. Không gộp versions hoặc tự xếp hạng lại phía client.
Notice gọn: “Khi tham gia, kết quả tốt nhất của bạn có thể xuất hiện với bí danh.” Link “Quản lý tham gia” dẫn Hồ sơ. Đây là lựa chọn opt-in, không tự bật tham gia khi xem trang.
Bảng có đúng các cột Hạng; Bí danh; Điểm đạt/tối đa; Hoàn thành lúc. Dùng 10 dòng fixture, cùng thang 1000 điểm, thứ hạng/điểm/thời gian nhất quán và GMT+7. Nếu đồng điểm, giữ thứ tự mẫu do hệ thống cung cấp, không giải thích quy tắc tie-break chưa có nguồn.
Chỉ dùng bí danh như “Thí sinh A7K2”, không email, avatar, displayName, mã người dùng thật. Không highlight “Bạn”, vì dữ liệu hiện chưa xác định row nào là người đang xem.
Hạng 1–3 có thể nhấn nhẹ bằng chữ/badge nhỏ; không podium khổng lồ hoặc làm lu mờ các hàng khác. Không biểu đồ phần trăm, percentile hoặc khoảng cách đến top nếu không có dữ liệu.
Footer “Đã tải 10 kết quả”, “Tải thêm” khi còn trang. Không tổng người dự thi, tổng số người tham gia hoặc số trang giả. Mẫu là phiên bản đã bật xếp hạng và có dữ liệu; không trộn thông báo disabled/403/empty vào cùng frame.

ĐẦU RA
Đúng 2 frame desktop độc lập như tên ở trên. Page đẹp khi xem đầu trang và đầy đủ bảng khi scroll. Không thêm page đích, mobile hoặc bảng handoff vào sản phẩm. Trả tên và ID thật của từng frame đã tạo, nêu rõ phần chưa làm; không dùng ID placeholder. Nếu nối được prototype, các link history→status/result và ranking→detail/profile dùng trang có thật, thiếu thì báo thiếu.
```
