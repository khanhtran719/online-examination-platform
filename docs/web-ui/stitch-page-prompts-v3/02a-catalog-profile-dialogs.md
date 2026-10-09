# Prompt 02A — Chỉ bổ sung bốn dialog thiết yếu

Gửi trước các states khác, trong chat [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Sáu Normal V4 đã được người dùng chọn; lượt này chỉ yêu cầu bốn frame mới để tránh Stitch tạo lại Normal. [Template](../templates/catalog-profile-v4/README.md).

**Kết quả:** người dùng đã tạo đủ bốn frame trên Stitch, assistant đã [review dialog](../stitch-dialog-review-2026-10-08.md) và lưu [IDs/ảnh](../evidence/stitch-dialog-review-2026-10-08/README.md). Giữ prompt này làm lịch sử brief, không gửi lại để tạo trùng; bước tiếp theo là [02B](02b-catalog-profile-states.md). Assistant không gửi lệnh generation/refinement trong lượt review.

```text
Tiếp tục trong dự án “ExamPlatform UI Design”, ID 18257628123124303955. Người dùng đã chọn sáu màn Normal V4 của Danh sách đề, Chi tiết đề và Hồ sơ. Lượt này CHỈ bổ sung đúng bốn frame dialog dưới đây. Giữ nguyên toàn bộ Normal V4, V3 và các page khác. Không tạo lại sáu trang chính, không tạo dự án mới.

FRAME NGUỒN CẦN ĐỌC
Chi tiết đề desktop: d709369eada140eca5083cb1e8b40865
Chi tiết đề mobile: e01b2d07979b4378aeebb98c1d7005d2
Hồ sơ desktop: 4d096315e9994045b67307d0530f5ea4
Hồ sơ mobile: 81b4051100354c12b2b15363cb77b0d6
Tìm theo ID hoặc tên EP-09/EP-10 — V4 — Desktop/Mobile — Normal. Báo rõ nếu không tìm được nguồn.

PHONG CÁCH
Bám card, typography và palette V4: surface trắng, canvas #F3F6FC, tint #E8EEFF, Cobalt #315CF4, Apricot #FFB36B, text #1B2540 và muted #58627A. Be Vietnam Pro, radius 20–24px, shadow mềm. Desktop 1280px; mobile 390px, không tràn ở 360px. Body dễ đọc, vùng chạm 44px, focus rõ, text dài wrap.

Mỗi frame là page nguồn với dialog đang mở, backdrop rõ và nền giảm độ nổi. Không tạo modal rời thiếu ngữ cảnh. Giữ geometry nền V4 để so sánh; shell/logo/text nhỏ sẽ được chuẩn hóa khi code. Không thêm bảng “Critical State Variants”, mã EP/V4 hoặc hướng dẫn designer vào nội dung sản phẩm.

FRAME 1 VÀ 2 — START CONFIRMATION
Tên chính xác:
“EP-09 — Chi tiết đề — V4 — Desktop — Start confirmation”
“EP-09 — Chi tiết đề — V4 — Mobile — Start confirmation”

Desktop: dialog rộng khoảng 560px. Mobile: dialog/sheet vừa chiều ngang, body scroll nếu cần, footer CTA không che nội dung.

Nội dung:
- Title “Sẵn sàng bắt đầu?” và mô tả ngắn giúp người dùng hiểu bước tiếp theo.
- Tên đề AWS Certified Solutions Architect Associate SAA-C03, phiên bản v2.3, wrap đầy đủ.
- Summary gọn: 130 phút danh định, 65 câu, giới hạn 3 lượt. Không hiển thị “còn 2/3 lượt”.
- Lịch đóng lấy cùng dữ liệu minh họa của trang nguồn và ghi rõ GMT+7; dùng cùng mốc trên desktop/mobile. Không tự thêm một lịch khác.
- Các lưu ý ngắn, mỗi ý một dòng:
  1) Vào gần giờ đóng có thể có ít thời gian hơn 130 phút.
  2) Câu nhiều lựa chọn chỉ có điểm khi chọn đúng trọn bộ đáp án, không có điểm thành phần.
  3) Lượt được sử dụng sau khi bắt đầu thành công.
  4) Hết giờ hệ thống nộp các đáp án đã lưu đúng hạn.
- Checkbox “Tôi đã đọc hướng dẫn”. Trong hai frame này thể hiện checkbox đã tick để CTA bắt đầu enabled. Nếu có prototype, checkbox bỏ tick thì CTA disabled.
- Secondary “Quay lại”; primary “Bắt đầu làm bài”; close rõ trước khi gửi.
- Đây là ready state, không đồng thời thêm loading/error/success. Pending/error sẽ tạo ở lượt states riêng.

Hành vi prototype nếu hỗ trợ: CTA bắt đầu trên page mở dialog; Quay lại/close đóng dialog. Không dựng phòng thi mới trong lượt này. Không nói thời gian bắt đầu chỉ vì mở dialog; lượt thi/deadline theo kết quả hệ thống xác nhận.

FRAME 3 VÀ 4 — PROFILE CONFLICT
Tên chính xác:
“EP-10 — Hồ sơ — V4 — Desktop — Profile conflict”
“EP-10 — Hồ sơ — V4 — Mobile — Profile conflict”

Title “Hồ sơ đã thay đổi ở nơi khác”. Helper “Bản bạn đang sửa vẫn được giữ. Hãy chọn nội dung muốn sử dụng.”

Đối chiếu dễ đọc:
- “Bản hiện tại”: Nguyễn Thị Phương Lan; Tham gia bảng xếp hạng: Tắt.
- “Bản bạn đang sửa”: Phương Lan Nguyễn — Ôn thi mỗi ngày; Tham gia bảng xếp hạng: Bật.
- Desktop hai cột; mobile hai khối dọc. Tên dài wrap. Trạng thái Bật/Tắt có chữ/icon, không chỉ dùng màu.
- Làm nổi hai khác biệt thật (tên và switch), không thêm revision, mã API hoặc field ngoài hồ sơ.
- Helper cho opt-in: “Khi bật, kết quả tốt nhất của bạn có thể xuất hiện với bí danh trên bảng xếp hạng được mở.”

Actions:
- “Dùng bản hiện tại”: helper ngay cạnh giải thích sẽ thay thế nội dung đang sửa.
- “Giữ bản của tôi”: cho người dùng xác nhận áp dụng lại bản đang sửa với dữ liệu mới nhất. Đây là hành động có chủ ý; không tự ghi đè khi dialog xuất hiện.
- Close quay về form với draft còn nguyên. Không refetch rồi xóa input đang sửa.

Nếu có prototype, thể hiện lựa chọn có xác nhận trước khi áp dụng. Không thêm dialog/frame thứ năm trong lượt này; có thể thể hiện xác nhận tiếp theo ngay trong cùng dialog tương tác hoặc ghi riêng trong handoff ngoài product UI. Không gắn toast “Đã lưu” vào trạng thái conflict chưa được giải quyết.

ĐẦU RA
- Chỉ bốn frame dialog nêu trên, mỗi frame có page nền, backdrop, title, nội dung và CTA hoàn chỉnh.
- Dùng nội dung nhất quán giữa desktop/mobile, không thêm capabilities Pro/AI/chứng chỉ hoặc tổng thống kê mới.
- Trả tên, ID, viewport của từng frame thực sự đã tạo.
- Nếu chỉ tạo được một phần, báo phần thiếu; giữ frame đã xong, không thay thế bằng bốn ảnh Normal hoặc một bảng mô tả dialog.
```
