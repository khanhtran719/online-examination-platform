# Prompt 09 — Shared states, dialogs và handoff toàn bộ UI

```text
Trong dự án “ExamPlatform UI Design”, ID 18257628123124303955, hoàn thiện các trạng thái dùng chung, dialog và handoff cho bộ V3 sau khi đã tạo các nhóm page. Giữ nguyên các page đã chọn và palette hiện hành.

Mẫu chuẩn: Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b, Home mobile V3 ID 4e8b878555d148259ff0df819ae125a2, Exam mobile V3 ID c513f61f97834bca9677e480c3d507b9. Canvas #F3F6FC, card #FFFFFF, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, ink #1B2540, muted #58627A. Be Vietnam Pro, JetBrains Mono dùng chọn lọc; radius 20–24px, spacing theo bội số 8px, shadow nhẹ. Dùng logo tạm hình phiếu thi đính kèm. Desktop 1280px và mobile 390px.

Tạo frame thật cho các trạng thái và overlay dưới đây, đủ để kiểm tra trực quan. Tài liệu mô tả không thay thế các frame này.

SY-01 — 404, route không tồn tại
- Illustration giấy nhỏ, title “Không tìm thấy nội dung”, giải thích ngắn, nút “Về trang chủ” và “Quay lại”.
- Giữ public shell và logo. Không hiển thị nội dung riêng tư hoặc mã tài nguyên của người khác.

SY-02 — 403, thiếu quyền
- Biến thể Candidate và Admin cùng shell tương ứng. Message “Bạn không có quyền truy cập” và hành động trở lại trang an toàn.
- Phân biệt thiếu quyền với hết phiên đăng nhập; tránh vòng lặp đăng nhập hoặc nút tự cấp quyền.

SY-03 — Unavailable, loading, empty và lỗi tải dữ liệu
- Phân biệt không có dữ liệu với không tải được dữ liệu. Lỗi không được hiển thị thành “0 kết quả”.
- Banner lỗi và “Thử lại”, hoặc card chưa khả dụng có lý do ngắn. Không đưa dữ liệu mẫu thay thế dưới nhãn live.
- Skeleton giữ bố cục ổn định. Khi refreshing, giữ nội dung được phép hiển thị và nhãn cập nhật. Dữ liệu cũ có thời điểm cập nhật rõ.
- Có biến thể cooldown/thử lại sau, thông báo an toàn và mã hỗ trợ khi phù hợp.

SY-04 — Phiên đăng nhập hết hạn
- Ngoài phòng thi: card hoặc modal yêu cầu đăng nhập lại, hành động rõ và giải thích ngắn.
- Trong phòng thi: giữ nhận diện đề và timer, cảnh báo hết phiên, hành động khôi phục. Thời gian vẫn chạy; đáp án chưa nhận xác nhận không được mang nhãn “Đã lưu”.
- Không hứa phục hồi draft sau reload nếu chưa có khả năng đó. Không thêm OTP hoặc đổi credentials vào flow này.

SY-05 — Trạng thái lưu và conflict
- Component có các trạng thái Pending, Saving, Saved, Retrying, Offline và Unconfirmed. Dùng icon kèm chữ; nhãn “Đã lưu” có timestamp, không chỉ dựa vào màu.
- Dialog conflict: so sánh bản đã lưu và lựa chọn trên máy theo từng câu/đánh dấu. “Dùng bản đã lưu” và “Giữ lựa chọn của tôi” có bước xác nhận phù hợp. Không xóa draft âm thầm.
- Khi hết giờ, khóa chỉnh sửa và nói rõ chỉ nhận đáp án đã lưu đúng hạn. Phần chưa xác nhận vẫn nhìn thấy; không tự chấm điểm trong browser.

SY-06 — Dialogs luồng thi
- Xác nhận nộp bài: số đã trả lời/chưa trả lời/đánh dấu khi có nguồn đúng, trạng thái lưu, “Quay lại làm bài” và “Nộp bài”. Thêm biến thể đang nộp, lỗi lưu, chưa nhận xác nhận và đang xác minh kết quả.
- Rời trang khi còn thay đổi chưa xác nhận: cảnh báo và hai hành động rõ. Không cam kết đã lưu chỉ vì có beforeunload.
- Bảng câu hỏi mobile: overlay có backdrop hoặc drawer toàn màn hình, một header, nút đóng rõ, lưới có vùng chạm lớn. Tạo state frame trên bản sao Exam V3; xử lý header chồng nhau trong biến thể mới.

SY-07 — Dialogs quản trị
- Publish, unpublish, archive, đổi loại câu hỏi, conflict draft, lý do replay bắt buộc và audit detail drawer.
- Tái dùng các biến thể đã tạo ở nhóm trước, chỉ bổ sung phần thiếu. Không thêm nghiệp vụ mới để lấp chỗ.
- Confirm/cancel có thứ bậc rõ. Màu cảnh báo hoặc destructive phù hợp mức độ hành động; loading/error giữ nội dung để người dùng hiểu trạng thái.

HANDOFF — Frame hoặc document riêng, ngoài sản phẩm
- Tokens, logo mark/wordmark và cách dùng; typography cho heading/body/timer; radius, spacing, shadow và icon style.
- Button, input, radio, checkbox, tabs, table, card, navigation; các biến thể hover/focus/disabled/loading/error.
- Quy tắc desktop/mobile/tablet: rail chuyển thành menu; bảng cuộn trong vùng riêng hoặc chuyển card; tiêu đề/option/label dài; thanh sticky không che nội dung; controls có vùng chạm tối thiểu 44px; trạng thái có dấu hiệu ngoài màu sắc.
- Motion: Home chuyển động nhẹ, Dashboard phản hồi nhỏ, Exam tĩnh. Có quy tắc reduced motion; không nói animation đã hoạt động nếu mới là spec.
- Page index: Home/Dashboard/Exam đã có; Auth 4; Catalog/Profile 3; Results 5; Public 3; Admin Exams 2; Questions/Import 4; Operations 4; Reports 4; 404 và các trạng thái dùng chung. Liệt kê tên/ID frame thực tế và những biến thể còn thiếu.
- Không đưa expectedRevision, JWT, SQL hoặc ghi chú designer vào footer sản phẩm.

Đầu ra: các trạng thái/dialog desktop và mobile có frame thật, cùng visual component handoff riêng. Có thể kèm Markdown spec. Đặt tên “SY-01–07 — [state] — V3” và “Handoff V3”. Nếu chưa tạo đủ page hoặc variant, ghi rõ phần thiếu; không báo cả web đã đủ chỉ từ một danh sách.
```
