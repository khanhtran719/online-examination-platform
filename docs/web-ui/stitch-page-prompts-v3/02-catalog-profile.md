# Prompt 02 — Exam list, Exam detail/start, Profile

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, tiếp tục thiết kế nhóm Catalog + Profile, gồm đúng 3 page EP-08, EP-09 và EP-10. Người dùng đã chọn Home, Dashboard, Exam và 4 page Auth V3 làm mẫu thị giác. Giữ nguyên các page đó; tạo page mới, không chạy lại lượt refinement Auth.

Chuẩn: Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b; Dashboard mobile V3 ID 57c1dac4924d4d13b45d655c41dfc81c. Giữ rail trắng mảnh, active tròn ink đậm, card trắng, canvas #F3F6FC, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro; monospace có chọn lọc. Radius 20–24px, gutter 16–24px, shadow nhẹ. Desktop 1280px / mobile 390px, mobile reflow thật.

Logo tạm đính kèm: phiếu thi trắng, ô Cobalt bo góc, góc gấp Apricot; dùng vector ổn định nếu thiếu asset. Prototype tiếng Việt, dữ liệu mẫu có nhãn. Không thêm APIs, subscriptions, AI recommendations hoặc các controls không có chức năng được mô tả dưới đây.

Candidate shell: rail desktop có nhãn/tooltip cho Tổng quan, Đề thi, Lịch sử và Hồ sơ; Trợ giúp và đăng xuất ở vị trí phụ. Header tên trang, avatar/initials và menu tài khoản gọn. Mobile dùng một header và menu rõ; không lặp header, wordmark hoặc logo mũ tốt nghiệp/khiên như một số bản Auth. Giữ một mark phiếu thi nhất quán.

Cảm giác tích cực, sáng và có năng lượng học tập. Có thể dùng một illustration nhỏ với phiếu thi/giấy xếp lớp/bút 2.5D, contact shadow và điểm nhấn Apricot ở phần mở đầu; phần nội dung giữ dễ đọc. Không biến mỗi card thành một illustration. Text dài được wrap; body khoảng 16px, helper đủ rõ, vùng chạm tối thiểu 44px. CTA và field quan trọng không bị cắt hoặc che bởi sticky controls.

QUY TẮC FRAME RÚT RA TỪ REVIEW AUTH
- Mỗi product frame chỉ có một trạng thái hợp lý đang diễn ra. Normal state không chứa cảnh báo lỗi; không đồng thời hiện form đang hoạt động và trạng thái hết hạn/không được phép.
- Empty, loading, error, pending và conflict phải là frame của page/form thật khi được yêu cầu, có đầy đủ ngữ cảnh và hành động. Không thay bằng card kể tên trạng thái.
- Không đặt “Mô phỏng/Critical State Variants”, nút thử lỗi, bảng security, mã EP hoặc hướng dẫn designer bên dưới nội dung hay footer sản phẩm. Component/handoff đặt ở frame riêng, ngoài product pages.

EP-08 — Danh sách đề /exams
- Header tên trang và mô tả ngắn; category chips TOEIC, IELTS, CNTT, Đại học, Tuyển dụng, Nội bộ; có active và clear filter.
- Desktop chọn grid 2 cột hoặc list rows rộng để chứa tên dài. Card có category, tên đề, thời lượng, số câu, lịch mở/đóng, nhãn quyền xem lời giải và CTA “Xem đề”. Không khóa thông tin quan trọng sau hover.
- Action “Tải thêm” ở cuối; không số trang hoặc tổng số đề giả. Tìm trong dữ liệu đã tải nếu cần phải ghi đúng phạm vi, không giả global search/sort.
- Có skeleton giữ geometry, danh mục rỗng với clear-filter CTA, lỗi tải có retry, refreshing giữ danh sách hiện có.
- Mobile một cột, filter vào hàng cuộn hoặc sheet có nút mở/đóng rõ; controls dễ chạm, không scroll ngang toàn trang.

EP-09 — Chi tiết đề /exams/:examId
- Breadcrumb và back; tên đề dài, category, version. Main content + side summary; số câu/điểm/cấu trúc từng phần, thời lượng, ngày giờ mở/đóng, giới hạn lượt, chính sách xem đáp án, quy tắc chấm.
- Tên phần và số liệu căn rõ; không thêm đoạn description, file audio hoặc câu hỏi preview không có trong contract.
- CTA “Bắt đầu làm bài”, hoặc “Tiếp tục lượt đang làm” khi có lượt hợp lệ. Các trạng thái chưa mở/đã đóng/hết lượt có lý do và bước tiếp theo; không dự đoán quota từ một phần history.
- Link bảng xếp hạng chỉ ở trạng thái bật cho version này. Không quy đổi điểm sang điểm TOEIC/IELTS chính thức.
- Tạo start-confirmation dialog: thời lượng, lịch đóng, vào muộn có thể ít thời gian; nhiều lựa chọn cần đúng trọn bộ; bắt đầu thành công tiêu thụ lượt; hết giờ nộp các đáp án đã lưu. Checkbox đã đọc hướng dẫn; hai CTA “Quay lại”/“Bắt đầu làm bài”; biến thể đang gửi và lỗi.
- Mobile summary đặt sớm; CTA có thể sticky nhưng không che nội dung cuối; cấu trúc đề xếp dọc.

EP-10 — Hồ sơ /profile
- Card tài khoản, avatar/initials nhẹ; email và trạng thái xác thực chỉ đọc. Form tên hiển thị; switch tham gia bảng xếp hạng, mặc định tắt; giải thích bí danh/kết quả tốt nhất khi opt-in.
- CTA “Lưu thay đổi”; phản hồi success và error inline. Không thêm edit email, password, roles, subscription hoặc huy hiệu học tập giả.
- Biến thể conflict: giữ nội dung đang sửa, cho xem giá trị hiện tại và chọn tải lại hoặc xác nhận áp dụng lại. Không tràn modal vì trường tên dài.
- Logout có confirmation phù hợp nếu còn thay đổi chưa lưu; không lặp nhiều CTA nguy hiểm trong header.

ĐẦU RA CẦN TẠO
1. Sáu frame chính hoàn chỉnh: EP-08, EP-09, EP-10, mỗi page có Desktop 1280px và Mobile 390px. Đặt tên “EP-08/09/10 — [tên] — V3 — Desktop/Mobile”.
2. Frame riêng cho start-confirmation dialog và profile-conflict dialog trên desktop/mobile. Bản mở dialog giữ page nền, backdrop, title, close/cancel và CTA rõ; mobile không tràn ngang.
3. Các trạng thái chính ở frame riêng: EP-08 empty/loading/error; EP-09 chưa mở/đã đóng/hết lượt/có lượt tiếp tục; EP-10 đang lưu/lưu thành công/lỗi lưu. Một variant có thể là bản sao của page chính nhưng phải trình bày state thực, không dồn tất cả vào một page.
4. Trả danh sách tên/ID các frame thực sự đã tạo, nhóm theo page và viewport, kèm những variant còn thiếu. Nếu lượt này chỉ tạo được sáu frame chính, ghi rõ và chưa tuyên bố đã hoàn thành toàn bộ states. Giữ các frame đã chọn trước đó.
```
