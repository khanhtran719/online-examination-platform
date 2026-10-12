# EP-22 — Xác nhận đổi loại câu hỏi

## Vai trò và trạng thái

Route `/admin/questions/019b18a0-0000-7000-8000-000000000013/edit`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: dialog. Fixture: `bank[1] pending MULTIPLE_CHOICE -> SINGLE_CHOICE` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: actor đang sửa Q-013 Nhiều lựa chọn, bản sửa 2, 15 điểm, bốn options và key1+3. Người dùng vừa yêu cầu đổi sang Một lựa chọn nhưng chưa xác nhận; local type và key chưa được biến đổi. Dùng đúng ảnh nền ep22-edit-multiple đã xem làm target edit; giữ textarea đề bài, giải thích, bốn hàng options, checkbox hàng1 và3, 15 điểm, Bản sửa2, sidebar preview và action bar. Chỉ thêm backdrop neutral và một dialog trắng centered560px. Không đổi background select thành Đúng–Sai hoặc tự xóa options trước confirm.

Dialog title “Đổi loại câu hỏi”, close x góc phải; icon swap nhỏ trong ô primary tint. Dòng mở “Chuyển từ Nhiều lựa chọn sang Một lựa chọn?” và facts hai dòng “Hiện tại: 2 đáp án đúng” và “Sau khi đổi: 1 đáp án đúng”. Copy rõ “Bốn lựa chọn được giữ lại. Chỉ đáp án đúng đầu tiên được giữ; hãy kiểm tra lại trước khi lưu.” Thêm helper nhỏ “Thay đổi chỉ áp dụng cho bản đang sửa.” Không nói toàn bộ options bị xóa vì chuyển multiple→single vẫn giữ bốn options. Không nói giữ hai key hoặc lưu tự động vì type SINGLE cần đúng một key và change local không mutation.

Footer “Hủy” nút viền/neutral và “Đổi loại” Cobalt. Hủy/close giữ type MULTIPLE_CHOICE, options4 và key[1,3], trả focus về dropdown. Đổi loại chỉ chuyển draft sang SINGLE_CHOICE, giữ bốn text, giữ key[1], chuyển checkbox sang radio; phải đợi “Lưu câu hỏi” mới gửi thay thế ngân hàng. Trong ảnh hiện tại chưa confirm nên không có radio background mới hoặc receipt Bản sửa3. Các điều kiện này là chỉ dẫn tương tác ngoài ảnh, không đưa hết vào modal. Không có nút “Lưu và đổi”, “Tự động gộp” hay “Không cảnh báo lần sau” không hỗ trợ.

Modal sử dụng tone cảnh báo nhẹ Apricot nhỏ trên icon hoặc đường nhấn, không làm toàn modal cam/đỏ. Body16px, heading22px, radius24px, padding28px; header/body/actions cách nhau rõ. Nền nhận diện Q-013 và checkbox hai key đủ để hiểu hậu quả, text nền dim không tranh modal. Không nhét bảng so sánh từng option vì không mất text options ở chuyển này; copy ngắn và chính xác có sức nặng hơn. Pending save khác loại dialog này; nếu save đang inflight phải không mở đổi loại tạo state mâu thuẫn. Validation sau chuyển kiểm tra single một key, point và limits như trước. Một ảnh một trạng thái trước confirm, không layout before/after cạnh nhau.

## Hành động, pending và lỗi

- Hủy
- Đóng
- Đổi loại draft

Pending: Không mutation khi mở/hủy; save inflight không đổi draft.

- Chỉ giữ key đầu khi confirm
- Không xóa options khi MULTIPLE->SINGLE

## So với mã hiện tại

Copy được specialization đúng chuyển MULTIPLE->SINGLE thay thông báo generic source.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`
- `apps/web/src/features/admin/question-dialogs.tsx`

Prompt độc lập: [prompts/ep22-type-change-confirm.txt](../prompts/ep22-type-change-confirm.txt), **1340 từ tách bằng whitespace**.
