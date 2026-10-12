# EP-22 — Xung đột khi lưu câu hỏi

## Vai trò và trạng thái

Route `/admin/questions/019b18a0-0000-7000-8000-000000000012/edit`. Actor Minh Anh — quản trị được cấp capability liên quan. Loại ảnh: dialog. Fixture: `conflictLocal: Q-012 baseRevision3 local points12` trong [fixtures.json](../fixtures.json). Đây là specification desktop; chưa có runtime/mobile/production acceptance.

## Chức năng và bố cục

Trạng thái riêng: một lần lưu Q-012 bị server từ chối vì bản dữ liệu đã thay đổi. Bản người dùng đang sửa vẫn giữ nội dung IaaS và options như Q-012, nhưng điểm local đang là12 thay cho10; base Bản sửa3. Không biết remote revision hoặc nội dung mới từ lỗi, vì vậy không vẽ compare hai cột, số revision remote4, tên người sửa hoặc timestamp server bịa. Đây là cách trình bày dialog cho lỗi conflict đã có, không một endpoint force-save mới.

Ảnh nền phải là editor cùng Q-012 được sửa điểm local12, các trường còn lại giữ nguyên ep22-edit-single. Khi thực hiện bằng edit image, trước tiên tạo bản nền points12 riêng hoặc yêu cầu edit rõ chỉ field Điểm10→12 rồi thêm overlay; lưu prompt edit nguyên văn và ghi đây là khác biệt chủ ý của fixture. Nền vẫn Bản sửa3, chưa lưu, cùng rail, header, key2, explanation và sidebar Candidate không key. Dialog trắng centered600px, backdrop trung tính, title “Câu hỏi đã thay đổi”, icon hai mũi tên/notice nhỏ Cobalt hoặc Apricot. Không đỏ toàn màn, không spinner vì server đã từ chối xác định.

Copy chính “Có thay đổi mới trong ngân hàng. Bản đang sửa của bạn chưa được lưu.” Dòng bổ sung “Nội dung và điểm 12 của bạn vẫn được giữ lại.” Facts ngắn “Câu hỏi: Q-012”, “Bản bạn đã mở: 3”, “Điểm đang sửa: 12”. Đừng ghi đã lưu thành công, merged hoặc điểm cũ10 đã bị server ghi đè. Không có bảng dữ liệu mới vì chưa GET. Helper “Xem bản mới trước khi lưu lại.” Các câu này đủ mô tả lỗi cho người dùng, không in 409, RevisionConflict hoặc expectedRevision.

Footer có nút phụ “Giữ bản đang sửa” và nút Cobalt “Xem bản mới”. Close và Giữ bản đang sửa đóng modal mà giữ local draft12, không tự retry write. Xem bản mới là read-only lấy current bank question theo GET đã tồn tại và phải bảo toàn draft ở UI khi kiểm tra; không đồng nghĩa tải lại trang để mất draft. Vì current source chỉ hiện error inline, dialog và cách giữ draft khi xem source là yêu cầu presentation/implementation còn cần làm, không được báo đã test. Không cung cấp “Ghi đè”, “Lưu bằng mọi giá”, “Tự động gộp” hay button tạo câu mới để né conflict. Nếu GET bản mới lỗi, giữ draft và báo lỗi đọc, không suy luận remote data. Ảnh đang trước read nên chỉ có local facts, không hai snapshot. Chọn route hiện tại và lưu local intent rõ trong handoff, không đưa hướng dẫn lập trình thành note nhỏ trong sản phẩm.

## Hành động, pending và lỗi

- Giữ bản đang sửa
- Đóng
- Xem bản mới read-only

Pending: Read mới giữ local draft; không retry write hoặc force-save.

- GET mới lỗi giữ draft
- Không remote facts nếu chưa đọc
- Conflict xác định khác timeout unknown

## So với mã hiện tại

Current implementation có inline API error và giữ draft; conflict modal/read-only inspection preservation là presentation target, chưa runtime proof.

## Style và review

Cobalt–Apricot theo [design contract](../../../design-contract.md): rail72px icon-only, header68px, main gutter28px, card radius20–24px, 2:1 cho form/sidebar, Be Vietnam Pro, nội dung tiếng Việt. Không biến mô tả tương tác thành ghi chú in-product. Kiểm tra trực tiếp label, fixture, totals, key visibility, hierarchy, CTA, backdrop và nền đúng frame.

## Nguồn

- `apps/web/src/features/admin/question-form.tsx`
- `apps/web/src/features/admin/use-question-draft.ts`
- `apps/web/src/features/admin/question-editor-page.tsx`
- `apps/web/src/shared/validation.ts`
- `docs/contracts/openapi.yaml#/components/schemas/QuestionWriteRequest`
- `docs/contracts/openapi.yaml#/paths/~1v1~1admin~1questions~1{questionId}/get`

Prompt độc lập: [prompts/ep22-question-conflict.txt](../prompts/ep22-question-conflict.txt), **1366 từ tách bằng whitespace**.
