# Prompt 03A — Ba trang sau khi thi, desktop trước

Theo yêu cầu ngày 2026-10-08: ưu tiên đủ các trang web desktop trước, mobile và supplementary states làm sau. **[Review 03A](../stitch-03a-review-2026-10-08.md) đã xem ba page desktop và người dùng đã đồng ý giữ hướng**, ảnh lưu thành [template Results V4](../templates/results-v4/README.md); không gửi lại prompt này để tạo trùng. Một entry Processing trùng tên chưa có screenshot URL vẫn chưa được xem/chọn. [03B đã review](../stitch-03b-review-2026-10-08.md), tiếp theo là [04A — Public desktop](04a-public-desktop.md). [Brief 03 đầy đủ](03-results-history-ranking.md) giữ backlog mobile/states. Khối dưới là yêu cầu gốc để đối chiếu.

```text
Tiếp tục trong dự án “ExamPlatform UI Design”, ID 18257628123124303955. Tạo ngay đúng 3 trang WEB DESKTOP 1280px: Trạng thái bài nộp, Kết quả và Xem lại bài. Đây là yêu cầu tạo UI, không chỉ lập kế hoạch hoặc xin xác nhận lại. Giữ nguyên tất cả frame cũ. Chưa tạo mobile hoặc các frame trạng thái phụ ở lượt này.

NGUỒN THIẾT KẾ
- Dashboard desktop V2 ID 927f2e0d87ce4f89be5d55c3cb81606b: chuẩn rail trắng gọn, bố cục workspace và tỷ lệ bento.
- Chi tiết đề desktop V4 ID d709369eada140eca5083cb1e8b40865: chuẩn card/thông tin đề.
- Phòng thi desktop V3 ID 222db89535964fb9bc183ab05a92bab6: chuẩn typography câu hỏi và điều hướng câu, chuyển sang chế độ xem lại chỉ đọc.
- Giữ tinh thần Soft Bento/Tactile hiện có, không redesign trang nguồn. Không sao chép Pro/Enterprise, AI proctor, server latency, thống kê hoặc lời hứa tự thêm từ các mẫu cũ.

PHONG CÁCH CHUNG
Canvas #F3F6FC, card #FFFFFF, Cobalt #315CF4, Apricot #FFB36B, tint #E8EEFF, chữ #1B2540/#58627A. Be Vietnam Pro cho title/body; JetBrains Mono chỉ cho số điểm, mốc thời gian và số thứ tự phù hợp. Radius 20–24px, khoảng cách 16–24px, shadow nhẹ có chiều sâu, nhiều khoảng thở. Dùng cùng rail/navigation của Dashboard, không chuyển sang sidebar Enterprise rộng.
Tạo cảm giác tích cực, sáng, muốn tiếp tục học: bố cục có trọng tâm, icon nét nhất quán, lớp giấy/phiếu thi 2.5D nhỏ ở card trạng thái hoặc header kết quả. Không rải minh họa, confetti hoặc đồ vật nổi lên bảng và câu hỏi. Điểm nhấn Apricot có tiết chế. Hover card nâng 2–4px, chuyển màu nút nhẹ; animation dừng với reduced motion. Nếu chỉ xuất thiết kế tĩnh, giữ ghi chú motion ngoài product UI, không claim đã có hiệu ứng chạy.
Title/tên phần dài wrap; hierarchy rõ; body không nhỏ dưới 14px. Nhãn hành động bằng tiếng Việt. Tên EP/V4 chỉ là tên frame, không hiện trong UI sản phẩm.

DỮ LIỆU MẪU NHẤT QUÁN
Cùng một lượt thi của “AWS Certified Solutions Architect Associate SAA-C03”, phiên bản v2.3, 65 câu, 130 phút, tối đa 1000 điểm. Đây là dữ liệu minh họa. Trạng thái đang xử lý và đã có kết quả là các thời điểm khác nhau của cùng lượt, không trộn vào một page.
Result: 772/1000 điểm, 50/65 câu đúng, 77,20% theo điểm. Bốn phần cộng đúng tổng:
1. Thiết kế Kiến trúc Linh hoạt & Khả dụng cao: 240/300 điểm, 16/20 câu đúng.
2. Kiến trúc Bảo mật & Mã hóa dữ liệu: 220/280 điểm, 14/18 câu đúng.
3. Tối ưu hóa Chi phí & Hiệu năng điện toán: 192/240 điểm, 12/15 câu đúng.
4. Quy trình Vận hành & Phục hồi thảm họa: 120/180 điểm, 8/12 câu đúng.
Không coi 77,20% là tỷ lệ câu đúng. Thời gian minh họa có GMT+7, cùng ngày; không dựng thời gian từng câu, thứ hạng cá nhân hoặc chứng nhận.

FRAME 1 — “EP-11 — Trạng thái bài nộp — V4 — Desktop — Processing”
Route /attempts/:attemptId/status. Trang trong Candidate shell, card trung tâm khoảng 640px, không để toàn trang chỉ có spinner.
- Tiêu đề “Đã nhận bài thi”, icon phiếu thi/check nhẹ; tên đề/version và mốc nhận bài 21:30:05 • 15/11/2024 (GMT+7).
- Thể hiện “Đang xử lý kết quả” sau khi đã xác nhận nhận bài. Câu ngắn cho biết có thể quay về lịch sử và xem kết quả khi sẵn sàng.
- CTA “Về lịch sử thi”, secondary “Làm mới trạng thái”. Không hiện nút “Xem kết quả” enabled khi chưa có kết quả.
- Không điểm số, phần trăm tiến độ, ETA, vị trí hàng đợi giả hoặc nút gửi lại bài. Nhãn “Nộp khi hết giờ” chỉ dùng khi dữ liệu có trạng thái đó; frame này là nộp chủ động.

FRAME 2 — “EP-12 — Kết quả — V4 — Desktop — Completed”
Route /attempts/:attemptId/result. Header có breadcrumb, tên đề/version và thời điểm hoàn thành 21:31:10 cùng ngày/múi giờ.
- Bento chính lấy 772/1000 làm trọng tâm, nhãn “Điểm bài trắc nghiệm”; phụ 50/65 câu đúng và 77,20% theo điểm. Không gauge lớn, biểu đồ trang trí, IELTS band, TOEIC 990 hoặc tự kết luận Đạt/Trượt.
- Bảng “Kết quả từng phần” có tên phần đầy đủ, điểm đạt/tối đa, câu đúng/tổng. Dùng bốn dòng mẫu trên, tổng khớp. Không cắt tên bằng ellipsis.
- Primary “Xem lại bài làm” vì mẫu này đã được mở quyền xem đáp án. Secondary “Về lịch sử”; link “Xem bảng xếp hạng” chỉ trong mẫu có bật xếp hạng đúng phiên bản.
- Có thể có link nhỏ “Chọn đề khác”. Nếu dùng “Làm lại”, dẫn về Chi tiết đề để kiểm tra điều kiện, không hứa còn lượt hoặc tự tạo lượt mới.
- Không thêm chứng chỉ, tải PDF, chia sẻ mạng xã hội, AI phân tích hoặc mục tiêu điểm không có dữ liệu. Vùng điểm sạch, tích cực; không để trang thành dashboard thống kê.

FRAME 3 — “EP-13 — Xem lại bài — V4 — Desktop — Released review”
Route /attempts/:attemptId/review. Workspace chỉ đọc, dùng độ tập trung của Phòng thi V3; header tên đề/version, “Xem lại bài làm”, link về Kết quả.
- Main card: câu 14/65, tên phần, dạng “Nhiều lựa chọn”; prompt dài và bốn đáp án A/B/C/D, chữ căn trái, xuống dòng tự nhiên.
- Dữ liệu mẫu câu 14: đã chọn A và C, đáp án đúng A và C, trạng thái Đúng. Phân biệt “Bạn chọn” và “Đáp án đúng” bằng nhãn/icon, không chỉ màu; đáp án chỉ đọc, không trông như checkbox có thể chỉnh.
- Nội dung câu hỏi mẫu phải là bài thi thật về kiến trúc cloud, không phải văn bản nói về UI đang thiết kế. Lời giải nằm sau đáp án, dễ đọc. Helper: “Câu nhiều lựa chọn chỉ có điểm khi chọn đúng trọn bộ đáp án.” Không chấm điểm từng lựa chọn đúng riêng lẻ.
- Sidebar “Điều hướng câu hỏi”, legend Đúng/Sai/Chưa trả lời. Mockup thể hiện 20 câu đã tải trong 65 câu, có nút “Tải thêm câu hỏi”; bộ lọc nếu có ghi “Trong các câu đã tải”. Không mặc định toàn bộ câu chưa tải là sai hoặc chưa trả lời.
- Có “Câu trước”/“Câu tiếp theo”, trạng thái câu đang xem rõ. Sidebar và main không che nhau khi scroll, nội dung dài không đẩy action khỏi vùng đọc.
- Không countdown, autosave, sửa đáp án hoặc nút nộp lại. Mẫu này chỉ hiển thị câu/lời giải vì quyền xem đã được mở; không dựng đáp án bị ẩn bằng lớp mờ.

ĐẦU RA
Đúng 3 frame desktop riêng, mỗi frame một trạng thái như trên, không gộp thành một dashboard hoặc bảng showcase. Có thể nối prototype Status → Result → Review và back nếu hỗ trợ, nhưng không coi thời gian mô phỏng là thời gian xử lý thực tế. Nếu chưa nối prototype, báo rõ. Trả tên, ID thật và trạng thái của từng frame đã tạo; không dùng tên frame làm ID placeholder. Không tạo mobile, page khác hoặc sửa các template đã chọn.
```
