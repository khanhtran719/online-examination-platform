# Review bốn dialog Catalog/Profile V4 — 2026-10-08

Nguồn: [ExamPlatform UI Design](https://stitch.withgoogle.com/projects/18257628123124303955). Review bốn frame mới theo [Prompt 02A](stitch-page-prompts-v3/02a-catalog-profile-dialogs.md), đối chiếu [Normal V4 đã chọn](templates/catalog-profile-v4/README.md) và [design spec](design-spec.md) CA-03/10. Phạm vi chỉ đọc Stitch, lưu ảnh và ghi review; không sửa ứng dụng hoặc gửi refinement.

**Quyết định sau review:** người dùng yêu cầu giữ bản mới và chờ preview 02B. Đã lưu bốn dialog nguyên bản vào [template Catalog/Profile V4](templates/catalog-profile-v4/README.md); DLG-01–04 vẫn mở để xử lý khi code. Không gửi generation/refinement trong lượt lưu này.

## Kết luận

**Bốn dialog đáp ứng phần lớn brief và đủ tốt để giữ hướng thiết kế, tiếp tục states 02B.** Inventory mới có 40 screen, tăng đúng bốn so với lần review Normal V4. Đã có Start confirmation và Profile conflict trên desktop/mobile, mỗi frame có page nền, backdrop, nội dung thật và CTA. Không còn tình trạng thiếu frame dialog để xem như lần trước. Các Normal V4 vẫn có trong inventory.

Start confirmation là nhóm hoàn thiện hơn: đủ tên/version, thời lượng, số câu, giới hạn lượt, giờ đóng và bốn lưu ý theo brief. Profile conflict có đối chiếu đúng hai trường thay đổi và phân biệt rõ bản hiện tại/bản đang sửa. Các chi tiết về cảnh báo bỏ draft, ý nghĩa hành động lưu và scroll/focus có thể ghi lại để hoàn thiện khi code; không cần regenerate cả bốn frame vì những điểm này.

Đây là kết luận về thiết kế trong ảnh. Bốn dialog đã được chọn làm template thị giác sau review; thao tác chưa được nghiệm thu từ screenshot.

## Đánh giá từng dialog

| Dialog | Đạt trên ảnh | Cần ghi lại |
| --- | --- | --- |
| Start confirmation desktop | Dialog tập trung, title/body/footer rõ; đủ summary 130 phút, 65 câu, 3 lượt; version v2.3; lịch đóng GMT+7; bốn lưu ý đúng ý; checkbox tick, nút bắt đầu và quay lại/close | Rút checkbox về “Tôi đã đọc hướng dẫn” nếu không có yêu cầu riêng cho lời cam kết; pending/error/unconfirmed thuộc lượt 02B |
| Start confirmation mobile | Bottom sheet có ngữ cảnh, tên dài wrap; metadata và bốn lưu ý đọc được; CTA lớn, quay lại và close đều thấy trong ảnh | Nội dung dài; cần scroll body/max-height/safe area khi code trên màn thấp và khi tăng cỡ chữ. Bộ icon metadata đang pha emoji với line icon |
| Profile conflict desktop | Hai cột so sánh đúng tên/switch; trạng thái có chữ và icon; bản đang sửa nổi hơn; có helper giữ draft, hai action và close; “Dùng bản hiện tại” có phụ chú bỏ thay đổi máy này | Phụ chú “Ghi đè lên máy chủ” dưới nút giữ bản nên đổi thành mô tả lưu có chủ ý, không gợi force overwrite bỏ qua bản mới nhất |
| Profile conflict mobile | Hai khối dọc rõ, title/names không cắt; opt-in Bật/Tắt đúng nghĩa; helper bí danh đúng; hai nút lớn và close | Thiếu helper sát action “Dùng bản hiện tại” nói rõ bỏ nội dung đang sửa. Cần thể hiện rõ “Giữ bản của tôi” sẽ lưu lại hay quay về form để tiếp tục chỉnh |

## Đối chiếu Prompt 02A

- **Đủ 4/4 frame yêu cầu**, tên và viewport đúng. Không có frame thứ năm mới hoặc các Normal bị thay thế trong danh sách ID.
- **Start ready state nhất quán:** checkbox đã tick, CTA nổi; không trộn pending/error/success vào ready. Lịch đóng hai viewport cùng 23:59 ngày 15/11/2024 GMT+7, khớp fixture Normal detail đã chọn.
- **Thông tin bắt đầu thi đúng ý brief:** vào muộn có thể ít thời gian; nhiều lựa chọn chấm trọn bộ; tiêu thụ lượt sau khi bắt đầu thành công; hết giờ nộp các đáp án đã lưu đúng hạn. Không ghi số lượt còn lại giả.
- **Profile conflict đúng nội dung so sánh:** bản hiện tại “Nguyễn Thị Phương Lan”, opt-in Tắt; bản đang sửa “Phương Lan Nguyễn — Ôn thi mỗi ngày”, opt-in Bật. Hai viewport giữ cùng dữ liệu và phân biệt trạng thái bằng chữ/icon.
- **Nội dung modal không có bảng mô phỏng/mã API/revision.** Nền vẫn kế thừa shell Normal đã được ghi lỗi ở review V4; refinement dialog không tự giải quyết các lỗi nền đó.
- **Prototype chưa được kiểm chứng:** checkbox bỏ tick có disable CTA không, close có giữ draft không, hai nút conflict thực hiện bước nào và retry có an toàn không đều chưa xác minh. Không coi copy “không ghi đè khi chưa xác nhận” là bằng chứng hành vi đã chạy đúng.

## Findings và kiểm chứng còn mở

- [ ] **DLG-01 — P2 — Mobile cần nói rõ hậu quả dùng bản hiện tại.** Thêm helper “Nội dung đang sửa sẽ được thay bằng bản hiện tại” sát nút. Desktop đã có phụ chú tương ứng; mobile cần cùng ý để tránh mất draft ngoài mong đợi. Có thể xử lý khi code.
- [ ] **DLG-02 — P2 — Chốt nghĩa của hành động giữ bản và bảo toàn conflict handling.** Desktop có helper “Ghi đè lên máy chủ”; mobile chỉ ghi “Giữ bản của tôi”. Nên diễn đạt nhất quán, ví dụ “Lưu lại thay đổi của tôi”, kèm xác nhận dùng nội dung đang sửa trên bản mới nhất. Nếu nút chỉ chọn draft rồi quay về form, CTA/helper phải phản ánh điều đó. Không tự force overwrite, không xóa draft sau refetch hoặc báo Saved trước xác nhận. Đây là yêu cầu implementation/prototype chưa được xác minh, không khẳng định ảnh hiện tại đang ghi đè sai.
- [ ] **DLG-03 — P2 — Kiểm chứng modal khi triển khai.** Mobile có đủ CTA trong screenshot 390px nhưng chưa xác minh viewport thấp/360px, text zoom, body scroll, footer safe area, focus trap/restore, Escape và accessible names. Pending/unconfirmed không được diễn đạt close là hủy thành công yêu cầu. Bốn frame hiện tại chỉ là ready/conflict, không cần thêm loading/error vào cùng ảnh.
- [ ] **DLG-04 — P3 — Chuẩn hóa chi tiết copy/icon.** Checkbox đang thêm lời cam kết ngoài “Tôi đã đọc hướng dẫn”; chỉ giữ nếu có yêu cầu sản phẩm riêng, không biến thành request field mới. Metadata start mobile pha emoji với line icon; chuẩn hóa bộ icon khi code. Ngày 2024 là fixture đã giữ theo nguồn, không dùng làm lịch live.

## Bước tiếp theo

Đề xuất giữ hướng bốn dialog và đi tiếp [Prompt 02B](stitch-page-prompts-v3/02b-catalog-profile-states.md), gửi từng nhóm nhỏ: Danh sách đề mobile, Chi tiết đề mobile, Hồ sơ mobile; review xong mới tạo desktop đối ứng. Với trạng thái start/conflict cần dùng các frame ID mới trong [manifest](evidence/stitch-dialog-review-2026-10-08/manifest.json), không tạo lại dialog ready.

CP-V4-01 đã có tiến triển: bốn dialog được tạo, review và được người dùng chọn, nhưng các states còn lại và kiểm chứng thao tác chưa hoàn tất nên checklist tổng vẫn mở. Trạng thái page-family vẫn là template đã chọn; thêm bốn dialog không tăng page-family count. Theo yêu cầu mới nhất, chờ preview 02B trước khi tiếp tục review.

## Bằng chứng và validation

[Ảnh gốc/IDs](evidence/stitch-dialog-review-2026-10-08/README.md), [manifest/SHA-256](evidence/stitch-dialog-review-2026-10-08/manifest.json), [inventory 40 screen](evidence/stitch-dialog-review-2026-10-08/inventory.json). Đã xem đủ bốn PNG, xác minh dimensions/hash, liên kết tài liệu, các source Normal IDs và registry. Sáu ảnh template Normal cục bộ vẫn khớp hash. Không chạy test ứng dụng vì không thay source.

Review từ ảnh tĩnh; chưa xác minh click, network/persistence, keyboard/focus, responsive thực, contrast được đo hoặc animation. Screenshot nhìn đúng không xác nhận hành vi backend đúng.
