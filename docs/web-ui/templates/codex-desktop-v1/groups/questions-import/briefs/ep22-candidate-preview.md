# EP-22 — Xem câu hỏi như thí sinh

## Vai trò và trạng thái

Route `/admin/questions/019b18a0-0000-7000-8000-000000000012/edit`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: dialog. Fixture: `bank[0] draft Candidate view no keys` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: Admin mở “Xem như thí sinh” cho draft Q-012 hiện tại; đây là preview nội dung, không lượt thi thật và không session timer. Dùng đúng ep22-edit-single đã xem làm target edit và giữ page nền IaaS,10điểm,Bản sửa3,4options,key2. Chỉ thêm backdrop neutral và một preview dialog centered rộng600px; có thể cao hơn dialog confirm để text/options thoáng. Không đổi sang page Candidate full-screen hoặc vẽ browser khác. Nền Admin được dim; các key ở form nền có thể bị che bởi dialog nhưng nội dung foreground tuyệt đối không lộ đáp án hay explanation.

Header dialog title “Xem như thí sinh”, close x; dòng helper ngắn “Bản xem trước nội dung, không tạo lượt thi.” Có chip neutral “Một lựa chọn”, label điểm “10 điểm” nếu cần metadata hiện có. Không thêm “Câu 1/6” hoặc section exam vì preview bank question chưa thuộc đề đang làm cụ thể. Đề bài font18px medium, wrap tự nhiên: “Trong mô hình IaaS, khách hàng quản lý thành phần nào?” Bên dưới bốn hàng option dễ đọc, mỗi hàng border nhạt/radius12px và radio rỗng đầu dòng, letter A/B/C/D nhỏ. A “Trung tâm dữ liệu vật lý”; B “Hệ điều hành và ứng dụng”; C “Nguồn điện của máy chủ”; D “Hạ tầng mạng vật lý”. Tất cả unselected, màu ink/muted trung tính; không check xanh trên B, không chữ “Đáp án đúng”, không giấu đáp án sai để chỉ còn key.

Không hiển thị explanation “Với IaaS…” ở bất cứ phần foreground nào. Không có nút “Chấm thử”, “Nộp bài”, “Bắt đầu thi” hoặc tỷ lệ đúng vì preview không assessment execution. Footer duy nhất button “Đóng xem trước” Cobalt/neutral rõ, close x cũng đóng, trả focus về trigger và giữ draft. Nếu radio biểu diễn khả năng chọn câu thì trong preview này chúng mang tính read-only trình bày; không ghi answer vào attempt, không mutation, không so kết quả. Chưa làm UI handler nên không khẳng định đã tương tác được từ raster.

Spacing24px quanh đề, gaps12–16px giữa options; heading22px, body16px, helper14px. Card trắng radius24px, shadow nhẹ, focus treatment nhất quán; màu Apricot chỉ có thể một dấu nhỏ trên chip “Xem trước”, không tạo illustration. Nền shell/rail vẫn nhận diện nhưng subdued. Review kỹ radio không tự selected theo Admin key; khác biệt này là mục tiêu bảo mật thông tin quan trọng của ảnh. Source hiện có inline QuestionPreview dựa trên prompt/options/type và không nhận key/explanation; modal là target presentation gốc đã yêu cầu, chỉ tái dùng cùng read projection. Không thêm duration, progress save hoặc telemetry để làm giống runtime Candidate ngoài scope.

## Hành động, pending và lỗi

- Đóng
- Đóng xem trước

Pending: Không mutation hoặc attempt; mở/đóng giữ draft.

- Không key/explanation
- Không submit/score/timer giả
- Preview cùng draft

## So với mã hiện tại

Modal/drawer là target, current source preview inline; projection không key/explanation đã phù hợp.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`
- `apps/web/src/features/admin/question-preview.tsx`

Prompt độc lập: [prompts/ep22-candidate-preview.txt](../prompts/ep22-candidate-preview.txt), **1358 từ tách bằng whitespace**.
