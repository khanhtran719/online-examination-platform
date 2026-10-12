# EP-22 — Tạo câu một lựa chọn

## Vai trò và trạng thái

Route `/admin/questions/new`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `createDraft` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: câu mới chưa được tạo, form đã điền hợp lệ với hai lựa chọn tối thiểu. Actor Minh Anh có quyền soạn nội dung và key. Breadcrumb “Quản trị / Ngân hàng câu hỏi / Tạo câu hỏi”; H1 “Tạo câu hỏi”; badge nhỏ “Chưa lưu”, link “Ngân hàng câu hỏi”. Không đặt mã câu giả hoặc Bản sửa 1 vì server chưa trả resourceId/revision. Helper “Tạo câu trong ngân hàng để dùng trong bản nháp.” Không vẽ “Đã tạo” trước mutation.

Cột chính rộng hai phần ba gồm Nội dung câu hỏi, Lựa chọn và đáp án, Giải thích; sidebar là Xem trước nội dung rộng một phần ba. Dropdown “Loại câu hỏi” đang chọn “Một lựa chọn”; input “Điểm” giá trị 5, helper “Từ 1 đến 1000 điểm”. Textarea “Đề bài” có nguyên văn “Dịch vụ DNS chủ yếu giúp thực hiện việc gì?”; counter chính xác theo nội dung, giới hạn 8000 ký tự. Đây là plaintext có thể wrap, không formatting toolbar. Dưới đó vùng options có helper “Chọn một đáp án đúng.” Hàng 1 radio được chọn và text “Chuyển tên miền thành địa chỉ IP”; hàng 2 radio chưa chọn và text “Mã hóa toàn bộ ổ đĩa”. Mỗi row có label theo số, không viết nhãn “đáp án đúng” thành một lựa chọn thứ ba. Radio là vòng tròn, không checkbox nhiều chọn.

Nút “Thêm lựa chọn” khả dụng, nút “Bớt lựa chọn” bị vô hiệu vì đang có hai hàng tối thiểu. Nếu thể hiện controls hàng thì xóa đều vô hiệu; hàng đầu Lên vô hiệu, hàng hai Xuống vô hiệu. Dùng muted nhưng vẫn đọc được chữ, không làm các nút vô hiệu biến mất. Textarea “Giải thích” chứa “DNS phân giải tên miền thành địa chỉ IP để truy cập dịch vụ.”, counter có giới hạn 8000. Không thêm hàng tags, chương trình đào tạo, độ khó hoặc tác giả vì không có field tương ứng.

Sidebar preview hiển thị chip Một lựa chọn, nguyên đề bài và hai lựa chọn A/B, không chọn key dù form trái chọn hàng 1; không có giải thích, điểm thành tích hoặc trạng thái trả lời đúng/sai. Có “Xem như thí sinh” để mở overlay cùng draft, chỉ là trình bày read-only. Action bar có nút Cobalt “Lưu câu hỏi”, nút phụ “Quay lại ngân hàng”; không có Lưu trữ, Xóa câu hoặc Xuất bản vì chưa có resource. Khi tạo, expectedRevision nội bộ bằng 0 nhưng tuyệt đối không in thuật ngữ đó lên ảnh. Sau receipt mới chuyển edit và hiển thị mã/bản sửa thật. Nếu mạng timeout phải giữ intent ban đầu và draft, không tạo lại thành câu thứ hai; field error không xóa input. Không mở dialog ở ảnh này; mục tiêu thị giác là nhận ra create khác edit mà vẫn thuộc một family.

## Hành động, pending và lỗi

- Điền loại/nội dung/điểm
- Chọn key
- Thêm lựa chọn
- Xem như thí sinh
- Lưu câu hỏi
- Quay lại ngân hàng

Pending: Chặn gửi trùng tạo; không cấp mã/bản sửa trước receipt.

- Field validation
- Timeout giữ intent và draft
- Thiếu quyền

## So với mã hiện tại

Chưa lưu là copy thay Revision 0 của source; chỉ thay trình bày, không đổi API.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`

Prompt độc lập: [prompts/ep22-create-single.txt](../prompts/ep22-create-single.txt), **1401 từ tách bằng whitespace**.
