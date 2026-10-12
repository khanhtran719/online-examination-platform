# EP-22 — Xác nhận lưu trữ câu hỏi

## Vai trò và trạng thái

Route `/admin/questions/019b18a0-0000-7000-8000-000000000012/edit`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: dialog. Fixture: `bank[0] not archived` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: editor Q-012 Một lựa chọn, bản sửa3,10 điểm đang mở confirmation lưu trữ. Chưa gửi archive và chưa thay đổi archived false. Dùng chính ep22-edit-single đã xem làm edit target; giữ nguyên toàn page background, đề IaaS, options4 với key2, explanation, Bản sửa3,10 điểm, rail và avatar. Thêm backdrop neutral khoảng32% và dialog centered rộng560px. Không dùng background bank list khác vì thao tác thực hiện từ editor; không đổi badge nền thành Đã lưu trữ trước confirm.

Modal header icon archive nhỏ với màu Apricot/ink, title “Lưu trữ câu hỏi”, close x. Nội dung dẫn “Lưu trữ câu Q-012?” và nguyên đề bài “Trong mô hình IaaS, khách hàng quản lý thành phần nào?” trong block nền rất nhẹ hoặc divider, để người dùng nhận ra đối tượng. Copy chính “Câu được lưu trữ sẽ không thể thêm vào đề mới.” Dòng sau “Các phiên bản đã phát hành và lượt thi cũ giữ nội dung đã khóa.” Không nói xóa vĩnh viễn, không nói các lượt thi đang làm bị hủy và không hứa undo nếu API không có. Nếu có bản sửa trong block, ghi “Bản sửa 3” cùng10điểm, tuyệt đối không coi Q-012 là số thứ tự row của exam.

Footer nút “Hủy” neutral và “Lưu trữ câu hỏi” đỏ tiết chế. Close/Hủy chỉ đóng dialog, giữ draft, không gọi archive. Primary là archive với revision hiện tại, không save phần draft đang sửa cùng lúc; nếu draft chưa lưu có yêu cầu sản phẩm phải làm rõ bên ngoài ảnh, nhưng fixture này là bản tải nguyên vẹn nên không tạo ambiguity. Sau receipt mới phản ánh archived; xung đột version cần giữ draft và báo riêng; mạng timeout chưa xác nhận không tự báo đã lưu trữ hoặc failed. Trong ảnh đang idle awaiting confirm, nút bật và không spinner.

Thiết kế không full-red modal, không biểu tượng cảnh báo khổng lồ, không checkbox nhập lại mã vì không có yêu cầu. Dialog trắng radius24px, padding28px, heading22px, body16px. Khoảng trống giữa đối tượng/copy/actions làm hậu quả dễ đọc. Background đủ nhận ra page sửa câu, dim màu trung tính giữ Cobalt–Apricot family. Không hiển thị key ở modal vì không cần cho quyết định archive; key vẫn thuộc form Admin nền được phép đọc. Không có archive hàng loạt, lý do bắt buộc hoặc nút xóa dữ liệu. Một overlay duy nhất, không panel nhỏ minh họa trạng thái sau.

## Hành động, pending và lỗi

- Hủy
- Đóng
- Lưu trữ câu hỏi

Pending: Chặn lặp archive; receipt mới đổi archived; unknown giữ intent.

- Conflict revision
- Timeout chưa xác nhận
- Không ảnh hưởng frozen snapshots

## So với mã hiện tại

Button label cụ thể hơn Xác nhận hiện tại; không thay hành vi archive.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`
- `apps/web/src/features/admin/question-dialogs.tsx`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1questions~1{questionId}/delete`

Prompt độc lập: [prompts/ep22-archive-confirm.txt](../prompts/ep22-archive-confirm.txt), **1330 từ tách bằng whitespace**.
