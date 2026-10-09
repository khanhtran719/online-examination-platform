# Prompt 05 — Admin exam list và editor tạo/sửa đề

**Brief đầy đủ để đối chiếu, không gửi nguyên khối hiện tại.** [05A — Ba frame desktop](05a-admin-exams-desktop.md) đã tạo/[review](../stitch-05a-review-2026-10-08.md): Danh sách đề, Edit Thông tin và Edit Phần & câu hỏi. [05B desktop](05b-admin-preflight-dialogs-desktop.md) đã chuẩn bị ngày 2026-10-09 cho bước Kiểm tra & phát hành và các dialog, chia 3 + 3 + 2 frame; gửi khối 05B-1 trước. Create/mobile/states khác vẫn backlog. Chưa gửi generation/refinement hoặc sửa ứng dụng trong phạm vi chuẩn bị prompt.

```text
Trong “ExamPlatform UI Design”, project 18257628123124303955, tạo Admin quản lý đề theo Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b và Dashboard mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c. Giữ nguyên các mẫu đầu; không chạy refinement cũ.

Style: canvas #F3F6FC / card trắng, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A; Be Vietnam Pro, monospace chọn lọc. Radius 20–24px, gutter 16–24px, spacing 8px, shadow nhẹ. Logo tạm phiếu thi đính kèm. Desktop 1280px / mobile 390px.

Admin cùng chất thiết kế, nhưng tăng mật độ thông tin và giảm decoration. Rail trắng active tròn ink; các nhóm Tổng quan/Đề/Câu hỏi/Import/Giám sát/Báo cáo có tooltip và submenu với nhãn đầy đủ. Mobile menu rõ, table không gây scroll ngang body. Có breadcrumb, tên trang, hành động chính. Prototype dữ liệu mẫu; không tự thêm capability hoặc backend.

EP-19 — Danh sách đề quản trị /admin/exams
- CTA “Tạo đề thi”, refresh; table tên đề/category/thời lượng/lịch mở–đóng/timezone/trạng thái draft-published-archived/revision/version hiện hành. Tên dài có khoảng đọc và menu hành động riêng.
- Actions theo quyền: sửa, xuất bản, ngừng xuất bản, lưu trữ, giám sát, bài nộp, thống kê. Không đặt tám button ngang trong mỗi row; dùng menu rõ và một action ưu tiên.
- “Tải thêm” cursor; search/filter chỉ trong các hàng đã tải thì ghi đúng phạm vi. Không tự thêm global sort/filter API hoặc số trang/total giả.
- Empty với CTA tạo đề; loading skeleton; lỗi tải; trạng thái có dữ liệu cũ/lần cập nhật. Quyền thiếu có message, không làm action như đã thực hiện.
- Mobile chuyển row thành card: tên/trạng thái trên, schedule/metadata dưới, action menu dễ chạm.

EP-20 — Editor tạo/sửa đề /admin/exams/new và /admin/exams/:examId/edit
Một page family, ba bước với frame thật cho từng bước, cùng header/stepper/summary:

A. “Thông tin”
- Tên đề, category; thời lượng 1–240 phút; mở/đóng; IANA timezone; giới hạn lượt 1–10; chính sách xem lời giải; bật/tắt leaderboard.
- Validation gần field: thiếu tên, thời lượng ngoài giới hạn, lịch đóng không sau mở. Helper thời gian đơn giản, không field revision/idempotency trong form người dùng.
- Không thêm description/audio upload/giám sát nếu không nằm trong contract.

B. “Các phần & câu hỏi”
- Sections 1–20, tên/position; thêm/xóa phần có confirmation khi chứa câu hỏi.
- Picker ngân hàng câu hỏi có prompt preview/type/points và tải thêm, lựa chọn; không đổ toàn bộ 500 câu một lúc.
- Danh sách câu đã chọn: số thứ tự, prompt ngắn, type, điểm 1–1000. Nút Lên/Xuống và xóa; drag optional. Không trùng question trong publication.
- Summary số phần/câu/tổng điểm; mobile không sidebar quá hẹp, picker dùng drawer toàn chiều rộng.

C. “Kiểm tra & xuất bản”
- Tổng hợp thông tin/cấu trúc, preflight lỗi và link quay lại bước cần sửa. “Lưu bản nháp” và “Xuất bản” là hai hành động khác nhau.
- Tạo/sửa có trạng thái chưa lưu/đang lưu/đã lưu; giữ thay đổi khi save lỗi hoặc conflict. Có biến thể đối chiếu bản hiện tại và lựa chọn tải lại/áp dụng lại có xác nhận.
- Published version có nhãn chỉ đọc phù hợp; chỉnh draft không sửa các lượt đã đóng băng.

Dialogs riêng:
- Publish: bản xuất bản là version cố định, những lượt đã bắt đầu không bị thay đổi; xác nhận/cancel và pending.
- Unpublish: chặn bắt đầu mới, không xóa lượt đang tồn tại.
- Archive: lưu trữ logic, không xóa bài thi/kết quả đã có.
- Rời editor có thay đổi chưa lưu.

Đầu ra: EP-19 list và EP-20 editor đủ desktop/mobile; EP-20 có frame ba bước và biến thể Create/Edit rõ. Dialog/state ở frame riêng. Không biến form thành dashboard decorative; label/fields thật và hierarchy quan trọng hơn illustration. Không chứa handoff trong product frame. Trả tên/ID và checklist các bước thật đã tạo.
```
