# EP-22 — Sửa câu Đúng–Sai

## Vai trò và trạng thái

Route `/admin/questions/019b18a0-0000-7000-8000-000000000014/edit`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: page. Fixture: `bank[2]` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: editor đang sửa Q-014, câu đã tồn tại trong ngân hàng, chưa có mutation đang gửi và không có lỗi. Actor quản trị có cả quyền quản lý và đọc key. Breadcrumb “Quản trị / Ngân hàng câu hỏi / Sửa câu hỏi”; H1 “Sửa câu hỏi”; cạnh tiêu đề có mã “Q-014”, badge “Bản sửa 1”, link “Ngân hàng câu hỏi”. Helper “Thay đổi câu trong ngân hàng không sửa các đề đã phát hành.” Đây là nội dung source hỗ trợ, không phải editor đề thi và không được thêm tên một exam cố định lên form câu hỏi.

Main chia hai cột gần 2:1. Cột trái có ba vùng trắng nối bằng spacing rõ. Vùng “Nội dung câu hỏi” chứa dropdown label “Loại câu hỏi” đang chọn “Đúng–Sai” và input “Điểm” có giá trị “10”, helper “Từ 1 đến 1000 điểm”. Bên dưới textarea label “Đề bài” chứa chính xác “Mã hóa dữ liệu khi truyền giúp giảm nguy cơ bị đọc trộm.”, counter “56/8000”. Cỡ chữ nội dung 16px, textarea vừa phải, không lớn như trình soạn blog. Không có font picker, thanh formatting hay nút upload.

Vùng “Lựa chọn và đáp án” có helper “Chọn một đáp án đúng.” và 2 hàng. Hàng 1: “Đúng”; radio được chọn. Hàng 2: “Sai”; radio chưa chọn. Ô nhập mỗi hàng được gắn label “Lựa chọn 1” và số tương ứng; radio/checkbox bên trái nằm trên một baseline, không đè chữ. Đúng–Sai giữ đúng hai hàng “Đúng” và “Sai”; không có quyền thêm hàng thứ ba, không xóa còn một hàng. Footer vùng có “Thêm lựa chọn” và “Bớt lựa chọn”; cả hai bị vô hiệu vì Đúng–Sai cố định hai lựa chọn.

Vùng “Giải thích” chứa textarea cùng tên với nội dung “Mã hóa đường truyền bảo vệ nội dung trước việc đọc trộm trên mạng.” và counter “66/8000”. Explanation chỉ xuất hiện trong Admin đang có quyền. Sidebar trắng ngắn có H2 “Xem trước nội dung”, chip “Đúng–Sai”, đề bài và các lựa chọn dưới dạng A/B; không tô đáp án đúng, không đưa explanation sang preview. Link “Xem như thí sinh” mở bản xem trước lớn hơn dựa trên draft hiện tại, không tạo lượt thi hoặc lưu câu.

Action bar cuối form có nút Cobalt “Lưu câu hỏi”, nút đỏ chữ/viền nhẹ “Lưu trữ”. Lưu giữ toàn bộ draft và chỉ cập nhật Bản sửa khi receipt được xác nhận; pending đổi label “Đang lưu…” và chặn gửi lặp. Lỗi validation hiện cạnh trường và giữ nội dung; lỗi mạng chưa xác nhận không tự ghi “Lưu thất bại”. Conflict cần bản riêng giữ local draft, không force-save; đổi loại gây mất key/options mở dialog riêng. Trong ảnh này giữ tất cả dialog đóng, không hiện lỗi/pending/success đồng thời. Không thêm biểu đồ độ khó hoặc lượt dùng giả.

## Hành động, pending và lỗi

- Đổi loại
- Sửa đề bài
- Sửa điểm
- Sửa options/key
- Thêm/Bớt lựa chọn
- Xem như thí sinh
- Lưu câu hỏi
- Lưu trữ

Pending: Lưu: Đang lưu…; controls gửi khóa; giữ draft tới receipt.

- Field validation
- Lỗi mạng/timeout chưa xác nhận
- Conflict giữ draft
- Thiếu quyền giấu key

## So với mã hiện tại

Row Lên/Xuống/xóa, counters và overlay preview là target từ prompt gốc; current source có add/remove cuối và sidebar preview. Đúng–Sai mẫu được chuẩn hóa hai nhãn Đúng/Sai theo shared contract.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`

Prompt độc lập: [prompts/ep22-edit-true-false.txt](../prompts/ep22-edit-true-false.txt), **1396 từ tách bằng whitespace**.
