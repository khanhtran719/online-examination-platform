# Checklist Catalog/Profile V4 khi code

Theo [review V4](../../stitch-catalog-profile-v4-review-2026-10-08.md), [review dialog](../../stitch-dialog-review-2026-10-08.md), [review 02B](../../stitch-02b-review-2026-10-08.md) và quyết định người dùng ngày 2026-10-08. Sáu Normal, bốn dialog và bảy states EP-08 mobile được chọn làm chuẩn thị giác; tất cả findings dưới đây vẫn mở. Việc lưu template/viết prompt không sửa lỗi hoặc nghiệm thu tương tác. Các nhóm states còn thiếu được hoãn để ưu tiên đủ page desktop trước.

- [ ] CP-V4-01 — Bốn Start confirmation/Profile conflict desktop/mobile và bảy list states mobile đã được chọn, còn DLG-01–04/02B-01–05. Detail eligibility/resume/start pending-error-unconfirmed, profile edit/save/validation/unconfirmed/exit và 21 desktop states đối ứng vẫn chưa tạo; bổ sung sau các page desktop theo ưu tiên mới. Bảo toàn retry, giữ draft và xác nhận kết quả theo contract; chưa đóng checklist vì đã có ảnh.
- [ ] CP-V4-02 — Chuẩn hóa Candidate shell với Dashboard V2/mobile V3. Bỏ header server latency, AI proctor và Enterprise/Pro chưa có capability; không port sidebar rộng như quyết định đổi toàn hệ thống.
- [ ] CP-V4-03 — Cho tên phần detail desktop và email profile desktop đọc đầy đủ; wrap/reflow với tên/email dài, không che thông tin bằng ellipsis.
- [ ] CP-V4-04 — Đủ lịch mở/đóng và múi giờ; điều kiện link leaderboard đúng version trên desktop/mobile; state hiển thị từ nguồn có thẩm quyền, không suy ra quota từ history partial.
- [ ] CP-V4-05 — Thống nhất fixtures list/detail/desktop/mobile; bỏ tổng 24 đề, 12 bài không có nguồn. Counts chỉ dùng phần dữ liệu đã tải nếu ghi đúng phạm vi; điểm/số câu khớp sections.
- [ ] CP-V4-06 — Sửa copy hành vi: không tiết lộ số đáp án đúng, không bảo đảm draft đã lưu khi chưa ACK, không hứa offline durability hoặc deadline pause. Bỏ capabilities tự thêm: chứng chỉ, AI, HR delivery, video/transcript, Pro/Enterprise và thang điểm chính thức.
- [ ] CP-V4-07 — Chuẩn hóa tiếng Việt, logo, typography; bỏ mã EP/V4/khóa phiên/handoff trong product UI. Hoàn thiện một illustration giấy/bút 2.5D và motion nhẹ, kiểm tra reduced motion, focus/keyboard, vùng chạm, contrast và sticky safe area.

## Dialogs đã chọn — findings hoãn khi code

- [ ] DLG-01 — Mobile thêm lời nhắc sát “Dùng bản hiện tại” rằng nội dung đang sửa sẽ bị thay thế.
- [ ] DLG-02 — Thống nhất nghĩa “Giữ bản của tôi”: xác nhận áp dụng nội dung đang sửa trên bản mới nhất hoặc quay về form đúng với label. Không force overwrite, xóa draft hoặc báo Saved trước xác nhận.
- [ ] DLG-03 — Kiểm tra scroll/max-height/safe area, viewport thấp/360px, text zoom, focus trap/restore, Escape/close và pending/unconfirmed. Đóng dialog không được báo hủy thành công yêu cầu chưa xác nhận.
- [ ] DLG-04 — Chuẩn hóa checkbox và icon, không biến lời cam kết thành request field mới; ngày minh họa không dùng làm lịch live.

## States 02B đã chọn — findings hoãn khi code

- [ ] 02B-01 — Loading lần đầu bỏ footer “Đang tải thêm dữ liệu…” để phân biệt với phân trang.
- [ ] 02B-02 — Bỏ tổng 24 trên hai màn tải thêm; bỏ số 6 chưa có nguồn trong Loading/Error hoặc không còn cùng scope trong Empty category. Counts chỉ phản ánh dữ liệu đã tải đúng phạm vi.
- [ ] 02B-03 — Thống nhất màu CTA retry, giữ danh mục đang chọn thấy được và rút helper search khi code.
- [ ] 02B-04 — Tiếp tục CP-V4-05–07 cho copy/capabilities/branding kế thừa; không coi các bản state là chấp nhận tính năng tự thêm.
- [ ] 02B-05 — Kiểm chứng viewport, sheet scroll/safe area, focus, contrast, motion, filter apply/reset, cursor/list retention và retry thực khi code.

Khi đóng mục, ghi evidence triển khai và kiểm chứng tương ứng. Các sửa đổi nhìn đúng trên V4 (switch opt-in, /80, normal save disabled, points/version) vẫn cần giữ đúng hành vi trong code.
