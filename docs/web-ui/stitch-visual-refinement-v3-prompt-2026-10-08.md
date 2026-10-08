# Prompt Stitch — Visual Refinement V3

Dán phần dưới vào chat trong dự án **ExamPlatform UI Design**. Giữ Dashboard desktop V2 làm mẫu chuẩn; chỉ tạo bản điều chỉnh để review thiết kế. Nội dung và nghiệp vụ xử lý ở lượt sau.

```text
Tiếp tục chỉnh thiết kế trong dự án hiện tại “ExamPlatform UI Design”, project ID 18257628123124303955. Giữ các bản trước để đối chiếu. Không tạo dự án mới hoặc mở rộng sang page khác.

1. MẪU CHUẨN PHẢI GIỮ

Giữ nguyên Dashboard desktop hoàn chỉnh “EP-02 — Bảng làm việc — Soft Bento (V2 Refined)”, screen ID 927f2e0d87ce4f89be5d55c3cb81606b. Đây là màn có lời chào “Chào Lan, bắt nhịp hôm nay.”, rail trắng mảnh với active tròn đậm, card lượt đang làm bên trái và “Quy chuẩn phòng thi” bên phải. Dùng màn này làm chuẩn thị giác; không regenerate hoặc sửa bản gốc.

Có một màn cùng tên, ID a65e52eabb5b41f4b3b72b50ca7f27aa, chỉ có rail và nền trống. Không dùng màn đó làm mẫu và không coi đó là Dashboard mobile hoàn tất.

Lượt này chỉ chỉnh UI: bố cục, typography, spacing, màu, shadow, illustration và cách đặt controls. Giữ nội dung, nhãn nút, dữ liệu và chức năng của màn nguồn; không tự thêm số liệu, tính năng, câu quảng cáo hoặc thay nghiệp vụ. Ngoại lệ trình bày: trên mobile đưa đầy đủ nhãn trạng thái lưu đang có ở desktop vào vùng dễ đọc. Nội dung sẽ được review riêng sau.

2. HỆ THỊ GIÁC CHUNG

Lấy Dashboard V2 làm chuẩn cho toàn bộ màn mới: canvas #F3F6FC, card #FFFFFF, primary Cobalt #315CF4, accent Apricot #FFB36B, tint #E8EEFF, ink #1B2540, text phụ #58627A. Be Vietnam Pro cho heading/body; JetBrains Mono dùng có chọn lọc cho timer và mã.

Card radius 20–24px; gutter desktop 16–24px; padding card 24–32px; nhịp spacing 8px. Nền trung tính chiếm đa số. Cobalt ưu tiên CTA chính và trạng thái chọn; Apricot tạo nét ấm trong illustration và chi tiết nhỏ. Text body khoảng 15–16px, text phụ vẫn dễ đọc. Shadow mềm, một hướng sáng nhất quán. Tránh phủ tint trên mọi card, gradient rộng, glow hoặc trang trí làm chữ khó đọc.

Ba trang cùng design system nhưng bố cục phù hợp nhiệm vụ: Home thu hút và có nhịp kể chuyện; Dashboard là workspace; phòng thi tập trung vào câu hỏi.

3. HOME DESKTOP — TẠO V3 TỪ V2

Màn nguồn: EP-01 — Trang chủ — Soft Bento (V2 Refined), ID 1169ba614db949ce8afa94716f34b109.

V2 chưa tạo khác biệt đủ rõ ở hero. Giữ headline, mô tả và CTA; nâng phân cấp headline → CTA chính → nội dung hỗ trợ. Header gọn, logo đủ rõ; các link điều hướng có trọng lượng nhẹ hơn hero. CTA chính Cobalt; CTA phụ nhẹ hơn.

Làm lại illustration thành tổ hợp giấy/đề thi 2.5D có chiều sâu nhìn thấy ngay:
- Xấp 3–4 lớp giấy lệch nhau, thấy cạnh giấy, độ dày và ít nhất hai mặt của vật thể.
- Phối cảnh nghiêng vừa phải; layer sau có offset và bóng tiếp xúc riêng, không chỉ là vài hình chữ nhật có shadow.
- Một bút có hình khối; ánh sáng từ trên trái, các bóng đổ cùng hướng.
- Có chi tiết Cobalt và Apricot; giữ cảm giác nhẹ, tích cực.
- Tổ hợp đủ lớn ở nửa phải hero, không thành vật thể nhỏ nằm giữa một panel trống.
- Giữ chữ quan trọng trên mặt giấy dễ đọc; không để illustration đè lên headline hoặc controls.

Giảm panel nền tint lớn quanh illustration. Các section dưới hero giữ nguyên nội dung; đổi nhịp bố cục để tránh chuỗi card giống nhau. Khối trải nghiệm mẫu nổi bật; danh mục gọn; phần hướng dẫn/FAQ thoáng và nhẹ hơn. Màu trắng và spacing phải cùng chất với Dashboard V2.

4. PHÒNG THI DESKTOP — TẠO V3 TỪ V2

Màn nguồn: EP-03 — Phòng thi — Soft Bento (V2 Refined), ID f7d045feca984f799821bda9fd10dd47.

V2 vẫn còn ba tầng thanh ngang ở đầu trang. Tạo một thanh điều khiển chính gọn, chứa menu/rời phòng thi, tên đề, trạng thái lưu, timer và nút nộp. Navigation toàn ứng dụng đưa vào menu phụ, giữ đủ các liên kết. Cỡ chữ/phím tắt gom vào tiện ích nhỏ hoặc popover; thể hiện cách mở chúng. Không tiếp tục ba thanh full-width xếp chồng.

Tên đề có vùng đọc hợp lý; timer dễ quét; trạng thái lưu có icon và nhãn; nút nộp nổi bật vừa đủ. Khi tên dài, layout không đẩy timer/nút nộp khỏi vùng nhìn thấy.

Giữ bố cục câu hỏi/bảng điều hướng khoảng 70/30. Giảm card lồng nhau; ưu tiên nội dung câu và khoảng cách đáp án. Single choice dùng radio, multiple choice dùng checkbox, trạng thái chọn có cả chỉ báo hình dạng và tint nhẹ. Lưới câu phân biệt rõ hiện tại/đã làm/chưa làm/đánh dấu. Thông tin phụ có trọng lượng thấp hơn câu hỏi. Không thêm illustration bay hoặc animation trang trí trong phòng thi.

5. DASHBOARD MOBILE — HOÀN THIỆN MÀN 390PX

Thiết kế bản mobile thật từ Dashboard desktop chuẩn ID 927f2e0d87ce4f89be5d55c3cb81606b. Không thu nhỏ desktop; không dùng frame rail trống để báo hoàn tất.

Xếp một cột: lời chào → lượt đang làm và CTA → lịch sử → đề gợi ý. Card hướng dẫn có thể đặt sau lượt thi ở dạng thu gọn, nhưng phải truy cập được đầy đủ. Illustration nhỏ gọn; giữ tên đề, timer, cảnh báo và CTA rõ. Lịch sử chuyển thành hàng/card phù hợp 390px; đề gợi ý xếp dọc hoặc có vùng cuộn được chỉ dẫn rõ.

Đổi rail thành navigation mobile gọn có nhãn; giữ các điểm đến trong menu khi không đủ chỗ. Không để rail desktop chiếm một dải trắng cao. Controls chính có vùng chạm ít nhất 44px; không tràn ngang hoặc che nội dung bởi thanh cố định. Frame phải có toàn bộ nội dung sản phẩm, không chỉ phần đầu.

6. TINH CHỈNH HOME MOBILE VÀ PHÒNG THI MOBILE

Home mobile nguồn ID 63b587041d334a9ebbdd53678c0c069d: giữ bố cục đọc dọc và CTA rõ. Thu gọn chiều cao illustration khoảng 200–240px nếu phù hợp, để phần bài mẫu không bị đẩy quá xa. Headline và CTA chính xuất hiện sớm; CTA phụ nhẹ hơn. Dùng tổ hợp 2.5D mới đồng bộ desktop, tránh vật thể bị cắt hoặc chữ quá nhỏ.

Phòng thi mobile nguồn ID 7711b5a705b24481b637c88cfda7fc18: giữ timer và nút nộp ở đầu. Trạng thái lưu phải có nhãn dễ đọc, không chỉ một chấm xanh. Tên đề/mã có thể xuống dòng hợp lý; không chen chúc controls. Giữ lựa chọn đáp án rộng, phần chuyển câu dễ chạm. Bảng số câu dùng drawer/bottom sheet; tạo một biến thể mở sheet để review, có nút đóng và lưới trạng thái đầy đủ. Thanh cố định không che đáp án cuối.

7. HANDOFF VÀ ĐẦU RA

Trong các bản V3, đưa component variants/showcase/ghi chú kỹ thuật sang frame tài liệu riêng có nhãn “Handoff — không thuộc trang sản phẩm”. Giữ các variants hiện có; không thêm nghiệp vụ. Dashboard desktop V2 gốc vẫn giữ nguyên để đối chiếu.

Đầu ra chính cần có năm frame hoàn chỉnh, đặt tên rõ:
- EP-01 — Home Desktop — Visual Refinement V3.
- EP-03 — Exam Desktop — Visual Refinement V3.
- EP-02 — Dashboard Mobile 390 — V3.
- EP-01 — Home Mobile 390 — V3.
- EP-03 — Exam Mobile 390 — V3.

Thêm biến thể mở bảng câu hỏi mobile và frame handoff riêng để review. Giữ V1/V2, tránh ghi đè hoặc tạo nhiều bản V3 cùng tên.

Trước khi báo hoàn tất, kiểm tra thực tế từng frame: Dashboard mobile có đủ nội dung; Home có lớp/độ dày/bóng rõ; phòng thi desktop đã giảm các thanh đầu; save label mobile đọc được; không clipping, tràn ngang hoặc chồng chữ; handoff nằm ngoài màn sản phẩm. Gửi tên/ID các frame đã tạo và điểm đã sửa. Nếu còn thiếu, nói rõ phần thiếu thay vì chỉ mô tả như đã hoàn thành.
```
